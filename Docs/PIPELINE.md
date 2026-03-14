# PIPELINE.md — DailyDiffs Image Generation & Admin Portal

## Overview

DailyDiffs uses an admin-triggered image generation pipeline powered by Gemini. You click "Generate Batch" in the admin portal, review the results, approve or reject, and approved images publish daily at 8 AM. No cron jobs, no automation to maintain.

## Pipeline Architecture

```
[Admin Portal — "Generate Batch" button]
  │
  ├── 1. Calls /api/generate-puzzles endpoint
  ├── 2. Gemini API → generates scene prompts (7 days × 5 art styles = 35)
  ├── 3. Gemini API → generates 35 base images
  ├── 4. Gemini API → edits each image to create difference version
  ├── 5. Gemini Vision → content safety scan (reject harmful/explicit)
  ├── 6. Gemini Vision → QA check each pair (difficulty scoring 1-10)
  ├── 7. Auto-reject pairs with QA score < 4 or > 9
  ├── 8. Upload passing pairs to Supabase Storage (status: 'pending')
  └── 9. Store metadata + difference coordinates in Supabase DB

[Admin Review — 10-15 min after generation completes]
  │
  ├── 9. Review pending pairs in /admin portal
  ├── 10. Approve or reject each pair
  └── 11. Rejected pairs can be regenerated individually

[Daily — 8 AM local per user]
  │
  ├── 12. Only 'approved' puzzles with matching date go live
  └── 13. Status changes to 'published' on first serve
```

## Implementation

The generation pipeline runs as a Next.js API route (`/api/generate-puzzles`) called from the admin portal. It's a long-running server-side process — Vercel Serverless Functions support up to 60 seconds on the free tier, so generation happens one pair at a time with progress updates.

For V1, if generating all 35 pairs at once is too slow, generate one day at a time (5 pairs per click).

## Step 1: Prompt Generation (prompt_generator.py)

Uses Gemini to generate scene descriptions for each art style.

Input: art style + day number
Output: scene prompt + list of 5 difference instructions

```
System prompt to Gemini:
"You are generating scene descriptions for a spot-the-difference puzzle game.
For each scene, provide:
1. A detailed scene description for image generation
2. Exactly 5 specific, findable differences to apply

The differences must be:
- Visually distinct when you know where to look
- Not immediately obvious at first glance
- Spread across different areas of the image
- A mix of types: color changes, object additions/removals, size changes, position shifts

Respond in JSON format."
```

Example output:
```json
{
  "scene": "A cozy kitchen with a wooden table, fruit bowl with apples and oranges, window showing a garden, clock on the wall showing 3:00, a cat sleeping on a chair, blue curtains",
  "art_style": "flat color comic strip illustration",
  "differences": [
    {"type": "removal", "description": "Remove one apple from the fruit bowl", "area": "center"},
    {"type": "color_change", "description": "Change curtains from blue to green", "area": "left"},
    {"type": "time_change", "description": "Change clock from 3:00 to 5:00", "area": "top-right"},
    {"type": "addition", "description": "Add a coffee mug on the table", "area": "center-right"},
    {"type": "position", "description": "Move the cat from chair to floor", "area": "bottom-right"}
  ]
}
```

### Art Style Prompt Templates

**Round 1 — Retro Cartoon:**
"Generate a flat-color comic strip illustration of {scene}. Clean black ink outlines, simple shapes, bright solid colors, no gradients, no shading. Classic American newspaper comic style. Include 5-7 distinct objects that can be individually modified."

**Round 2 — Pixel Art:**
"Generate a 16-bit pixel art scene of {scene}. Retro video game aesthetic, limited color palette of 16-32 colors, clear pixel grid visible, distinct foreground objects, reminiscent of SNES-era games."

**Round 3 — Watercolor:**
"Generate a watercolor illustration of {scene}. Soft edges, visible brush strokes, muted color palette with occasional bright accents, gentle color bleeding between elements, paper texture visible."

**Round 4 — Isometric Room:**
"Generate an isometric cutaway room illustration of {scene}. Clean geometric 30-degree angles, detailed interior objects with consistent scale, top-left lighting, flat colors with minimal shadows, architectural cross-section view."

**Round 5 — Photorealistic:**
"Generate a photorealistic photograph of {scene}. High detail, natural lighting, realistic textures and materials, shallow depth of field, shot on professional camera. 8K quality."

## Step 2: Image Generation (image_generator.py)

Uses Gemini's image generation capability to create the base images.

```python
# Pseudocode
for each day (7 days):
  for each round (5 rounds):
    prompt = art_style_template.format(scene=scene_description)
    base_image = gemini.generate_image(prompt)
    save(base_image, f"day_{day}_round_{round}_original.png")
```

Image specifications:
- Resolution: 1024x1024 (square, works for both desktop and mobile layouts)
- Format: PNG
- File naming: `{date}_{round}_{original|modified}.png`

## Step 3: Difference Creation (diff_creator.py)

Uses Gemini's image editing to create the modified version.

**Approach A — Gemini Inpainting (Preferred):**
```python
for each difference in differences_list:
  modified_image = gemini.edit_image(
    image=base_image,
    prompt=f"Edit this image: {difference['description']}",
    mask=generate_mask(difference['area'])  # optional, depends on API
  )
```

**Approach B — Programmatic Fallback (If Gemini edits are unreliable):**
```python
# Use Python Pillow/OpenCV for controlled modifications
from PIL import Image, ImageDraw

img = Image.open(base_image_path)
# Color change: select region, shift hue
# Object removal: clone nearby pixels over object
# Object addition: paste pre-made assets
# Size change: scale and reposition element
```

**Approach C — Dual Generation (If both above fail):**
```python
# Generate two images from slightly different prompts
original = gemini.generate_image(original_prompt)
modified = gemini.generate_image(modified_prompt)  # with differences baked in
# Use Gemini Vision to identify actual differences
# Risk: images may be too different or differences too random
```

Start with Approach A. Fall back to B for specific difference types that Gemini handles poorly. Avoid C unless necessary.

### Difference Coordinate Extraction

After creating the modified image, determine the exact coordinates of each difference:

```python
# Use Gemini Vision to locate differences
response = gemini.analyze(
  images=[original, modified],
  prompt="""Compare these two images and identify all differences.
  For each difference, provide:
  - x: horizontal position as percentage (0-100) from left
  - y: vertical position as percentage (0-100) from top  
  - radius: size of the difference area as percentage (3-8)
  - description: brief description of the change
  
  Respond in JSON array format only."""
)
differences_json = parse_json(response)
```

## Step 4: Content Safety Check

Every generated image goes through a safety check BEFORE the QA validation. Any image that fails is auto-rejected and flagged for regeneration.

### Layer 1: Gemini's Built-In Safety Filters

Gemini API has built-in safety settings. Set these to maximum strictness on every generation call:

```python
safety_settings = [
  {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
  {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_LOW_AND_ABOVE"},
  {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_LOW_AND_ABOVE"},
  {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_LOW_AND_ABOVE"},
]

# Apply to every Gemini generation call
response = model.generate_content(prompt, safety_settings=safety_settings)
```

If Gemini blocks the generation, catch the error and retry with a different scene prompt.

### Layer 2: Prompt Engineering (Prevention)

Scene prompts are constrained to safe categories only. The prompt generator must follow these rules:

```
ALLOWED scene categories:
- Kitchen / dining scenes
- Living rooms / bedrooms
- Gardens / parks / outdoor landscapes
- Shops / market stalls
- Classrooms / libraries
- Playgrounds / sports fields
- Farm / countryside
- Beach / seaside
- City streets (daytime, friendly)
- Offices / workspaces

BANNED content in prompts:
- No people or human figures (avoids any inappropriate depictions)
- No weapons, violence, or conflict
- No alcohol, drugs, or smoking
- No religious or political symbols
- No scary, horror, or dark themes
- No real brand logos or copyrighted characters
- No text that could be offensive
```

By generating scenes WITHOUT people, you eliminate the most common source of inappropriate AI-generated content.

### Layer 3: Gemini Vision Safety Scan (Post-Generation)

After each image is generated, run it through Gemini Vision with a safety-specific prompt:

```python
safety_prompt = """Analyze this image for content safety. This image will be shown 
in a casual puzzle game suitable for all ages (including children).

Check for:
1. Any nudity or sexually suggestive content
2. Any violence, gore, or disturbing imagery
3. Any weapons or dangerous objects
4. Any hate symbols, offensive gestures, or slurs
5. Any realistic human faces (we don't want these)
6. Any copyrighted characters or brand logos
7. Any text that could be inappropriate
8. Any generally disturbing or unsettling content

Respond with JSON:
{"safe": true/false, "issues": ["list of problems if any"]}

Be strict. When in doubt, flag it as unsafe."""

result = gemini.analyze(image=generated_image, prompt=safety_prompt)

if not result.safe:
  reject(f"Safety check failed: {result.issues}")
  log_safety_failure(image_id, result.issues)
```

### Layer 4: Admin Review (Final Human Check)

Even after all automated checks, you review every image in the admin portal before it goes live. This is your last line of defense. The admin review interface shows a safety badge:

**Difference descriptions and coordinates:** During review, verify that each stored difference (description + circle position) matches what you actually see between original and modified images. Gemini can mislabel regions or invent differences (e.g. “missing banana” when the banana appears in both images). Reject pairs where the listed differences don’t match the visible changes, or where circles don’t align with the real diff locations.

```
✅ SAFE — passed all automated checks
⚠️ WARNING — passed but flagged minor concerns (review closely)
❌ BLOCKED — failed safety check (auto-rejected, shown for logging only)
```

### Summary: 4-Layer Safety Pipeline

```
1. Gemini safety filters (blocks at generation time)
      ↓
2. Safe prompt constraints (no people, no weapons, no dark themes)
      ↓
3. Gemini Vision safety scan (post-generation automated review)
      ↓
4. Admin human review (final approval before publishing)
```

All four layers must pass before any image reaches a player.

## Step 5: QA Validation

Uses Gemini Vision to score puzzle quality.

```python
qa_prompt = """You are evaluating a spot-the-difference puzzle.
Look at these two images and rate the puzzle quality on a scale of 1-10:

Scoring criteria:
- Are there exactly 5 findable differences? (critical)
- Are the differences spread across the image? (important)
- Is the difficulty appropriate — findable but not obvious? (important)
- Is the image quality good — no artifacts or distortions? (important)
- Are the two images consistent in style? (important)

Respond with JSON: {"score": N, "issues": ["list of problems if any"]}
"""

result = gemini.analyze(images=[original, modified], prompt=qa_prompt)

if result.score < 4:
  reject("Too easy or broken")
elif result.score > 9:
  reject("Too hard — differences may be invisible")
else:
  approve_for_review()
```

## Step 6: Upload to Pending

Generated images go to the **private** `puzzles-pending` bucket. They only move to the public `puzzles` bucket when you approve them in the admin portal.

```python
# Upload images to PRIVATE puzzles-pending bucket
original_url = supabase.storage.upload(
  bucket="puzzles-pending",
  path=f"{date}/{round}_original.png",
  file=original_image
)
modified_url = supabase.storage.upload(
  bucket="puzzles-pending", 
  path=f"{date}/{round}_modified.png",
  file=modified_image
)

# Insert puzzle metadata (URLs point to pending bucket for now)
supabase.table("puzzles").insert({
  "date": scheduled_date,
  "round_number": round,
  "art_style": art_style,
  "image_original_url": original_url,
  "image_modified_url": modified_url,
  "differences_json": differences_json,
  "difficulty_score": qa_score,
  "status": "pending",
  "scheduled_date": scheduled_date
})

# Log generation
supabase.table("generation_logs").insert({
  "batch_date": batch_date,
  "art_style": art_style,
  "prompt_used": scene_prompt,
  "generation_time_seconds": elapsed,
  "qa_score": qa_score,
  "status": "generated"
})
```

## Admin Portal (/admin)

### Access Control
- Protected route: only accessible by admin email
- Supabase RLS: `auth.email() = ADMIN_EMAIL` environment variable
- Non-admin users redirected to /

### Dashboard View
```
┌──────────────────────────────────────────────────┐
│  DailyDiffs Admin                                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Approved │  │ Pending  │  │ Rejection│      │
│  │ Queue    │  │ Review   │  │ Rate     │      │
│  │ 12 days  │  │ 35 pairs │  │ 8%       │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                  │
│  [🔄 Generate New Batch (7 days)]               │
│  [🔄 Generate Single Day]                       │
│                                                  │
│  ⚠️ Alert if approved queue < 3 days            │
└──────────────────────────────────────────────────┘
```

**Generate New Batch:** Calls /api/generate-puzzles with days=7. Generates 35 image pairs. Shows progress bar while running. Takes 5-15 minutes depending on Gemini response times.

**Generate Single Day:** Generates 5 image pairs for one specific date. Faster, useful for replacing rejected days or topping up the queue.

### Review Interface
```
┌──────────────────────────────────────────────────┐
│  Week of March 17-23 — Pending Review            │
│                                                  │
│  Monday, March 17                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ R1  │ │ R2  │ │ R3  │ │ R4  │ │ R5  │      │
│  │ 🎨  │ │ 👾  │ │ 🖌️  │ │ 🏠  │ │ 📷  │      │
│  │ ✅❌│ │ ✅❌│ │ ✅❌│ │ ✅❌│ │ ✅❌│      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│                                                  │
│  Tuesday, March 18                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ ... │ │ ... │ │ ... │ │ ... │ │ ... │      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
└──────────────────────────────────────────────────┘
```

### Expanded Pair View (Click on a thumbnail)
```
┌──────────────────────────────────────────────────┐
│  Monday R3 — Watercolor — QA Score: 7.2          │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐              │
│  │              │  │              │              │
│  │  Original    │  │  Modified    │              │
│  │              │  │  (diff zones │              │
│  │              │  │   circled)   │              │
│  └──────────────┘  └──────────────┘              │
│                                                  │
│  Differences:                                    │
│  1. ● Removed apple from bowl (center)           │
│  2. ● Changed curtain color (left)               │
│  3. ● Clock time changed (top-right)             │
│  4. ● Added coffee mug (center-right)            │
│  5. ● Moved cat position (bottom-right)          │
│                                                  │
│  [✅ Approve]  [❌ Reject]  [🔄 Regenerate]     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Admin Actions
- **Approve:** 
  1. Copies images from `puzzles-pending` → `puzzles` (public bucket)
  2. Deletes originals from `puzzles-pending`
  3. Updates puzzle row: `status = 'approved'`, `image_original_url` and `image_modified_url` now point to public bucket
  4. Records `reviewed_at` timestamp
- **Reject:** Sets status to 'rejected', prompts for optional reason, logs rejection. Images stay in puzzles-pending (deleted on next batch generation or manually).
- **Regenerate:** Triggers a new Gemini generation for that specific slot (day + round). Uploads new images to puzzles-pending.
- **Manual Upload:** Emergency fallback — upload custom image pair manually to puzzles-pending with difference coordinates

### Batch Actions
- "Approve All Pending" button (with confirmation dialog)
- "Approve Day" button to approve all 5 rounds for a single day

## Emergency Manual Image Creation

If the pipeline produces a bad batch and regeneration isn't fixing it:

1. Use ChatGPT/Midjourney to generate a base image
2. Use Photoshop/Canva to create 5 manual differences
3. Upload both images via admin portal's manual upload
4. Manually enter difference coordinates (admin UI provides a click-to-mark tool)
5. Set status to 'approved'

This should rarely be needed but ensures you never miss a day.

## Pipeline Monitoring

Track in generation_logs table:
- Success/failure rate per art style
- Average generation time
- QA score distribution
- Rejection rate trends (if one style consistently fails, adjust its prompts)
