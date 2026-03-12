import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import type { Difference } from '@/types/puzzle';

const TEXT_MODEL = 'gemini-2.0-flash';
const IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const ART_STYLES: Record<number, { name: string; promptTemplate: string }> = {
  1: { name: 'cartoon', promptTemplate: 'A flat-color comic strip illustration of {scene}. Clean black ink outlines, simple shapes, bright solid colors, no gradients, no people, no humans.' },
  2: { name: 'pixel', promptTemplate: 'A 16-bit pixel art scene of {scene}. Retro SNES video game aesthetic, limited 16-32 color palette, clear pixel grid, no people, no humans.' },
  3: { name: 'watercolor', promptTemplate: 'A watercolor illustration of {scene}. Soft edges, visible brush strokes, muted palette with bright accents, paper texture, no people, no humans.' },
  4: { name: 'isometric', promptTemplate: 'An isometric cutaway room illustration of {scene}. Clean 30-degree geometric angles, flat colors, minimal shadows, no people, no humans.' },
  5: { name: 'photorealistic', promptTemplate: 'A photorealistic photograph of {scene}. Natural lighting, realistic textures, shallow depth of field, no people, no humans, 8K quality.' },
};

export interface DifferenceInstruction {
  type: string;
  description: string;
  area: string;
}

export interface SceneData {
  scene: string;
  differences: DifferenceInstruction[];
}

export interface SafetyResult {
  safe: boolean;
  issues: string[];
}

export interface QAResult {
  score: number;
  issues: string[];
}

export function getArtStyleName(roundNumber: number): string {
  return ART_STYLES[roundNumber]?.name ?? 'cartoon';
}

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(key);
}

/** Generate a scene description and 5 difference instructions. */
export async function generateScenePrompt(roundNumber: number): Promise<SceneData> {
  const styleName = ART_STYLES[roundNumber]?.name ?? 'cartoon';
  const model = getGenAI().getGenerativeModel({ model: TEXT_MODEL, safetySettings: SAFETY_SETTINGS });
  const prompt = `Generate a spot-the-difference puzzle scene for art style: ${styleName}.

RULES:
- Choose from: kitchen, living room, garden, market stall, classroom, library, farm, beach, city street (daytime), office
- NO people, human figures, weapons, violence, alcohol, drugs, religious/political symbols, brand logos
- Include 5-7 distinct objects that can be individually modified

Return ONLY valid JSON:
{
  "scene": "detailed scene with 5-7 distinct named objects",
  "differences": [
    {"type": "removal", "description": "Remove one apple from the fruit bowl", "area": "center"},
    {"type": "color_change", "description": "Change curtains from blue to green", "area": "left"},
    {"type": "time_change", "description": "Change clock from 3:00 to 5:00", "area": "top-right"},
    {"type": "addition", "description": "Add a small potted plant on the shelf", "area": "right"},
    {"type": "position", "description": "Move the book from table to floor", "area": "bottom-left"}
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned no valid JSON for scene prompt');
  return JSON.parse(jsonMatch[0]) as SceneData;
}

/** Generate a base image from a text prompt. Returns PNG buffer. */
export async function generateImage(prompt: string): Promise<Buffer> {
  const model = getGenAI().getGenerativeModel({
    model: IMAGE_MODEL,
    // responseModalities is supported at runtime but not yet typed in SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent(prompt);
  for (const part of result.response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  throw new Error('Gemini image generation returned no image data');
}

/** Apply differences to an existing image. Returns modified PNG buffer. */
export async function editImage(imageBuffer: Buffer, differences: DifferenceInstruction[]): Promise<Buffer> {
  const model = getGenAI().getGenerativeModel({
    model: IMAGE_MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
    safetySettings: SAFETY_SETTINGS,
  });

  const changesList = differences.map((d, i) => `${i + 1}. ${d.description}`).join('\n');
  const prompt = `Edit this image by making exactly these ${differences.length} changes. Keep everything else pixel-perfect identical:\n${changesList}`;

  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } },
    prompt,
  ]);

  for (const part of result.response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }
  throw new Error('Gemini image editing returned no image data');
}

/** Run a content safety check on an image. */
export async function checkImageSafety(imageBuffer: Buffer): Promise<SafetyResult> {
  const model = getGenAI().getGenerativeModel({ model: TEXT_MODEL, safetySettings: SAFETY_SETTINGS });
  const prompt = `Analyze this image for content safety. It will appear in a casual puzzle game for all ages including children.

Check for: nudity/sexual content, violence/gore, weapons, hate symbols, realistic human faces, copyrighted characters/logos, inappropriate text, disturbing content.

Respond ONLY with valid JSON: {"safe": true, "issues": []}
Be strict — when in doubt, set safe to false.`;

  const result = await model.generateContent([
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' } },
    prompt,
  ]);
  return parseSafetyResponse(result.response.text());
}

/** Score puzzle quality 1–10. Auto-reject < 4 or > 9. */
export async function scoreQuality(originalBuffer: Buffer, modifiedBuffer: Buffer): Promise<QAResult> {
  const model = getGenAI().getGenerativeModel({ model: TEXT_MODEL, safetySettings: SAFETY_SETTINGS });
  const prompt = `Evaluate this spot-the-difference puzzle (two images: original then modified).

Rate 1–10 based on:
- Are there findable differences? (critical)
- Differences spread across image? (important)
- Difficulty appropriate — findable but not obvious? (important)
- Good image quality, no artifacts? (important)
- Consistent style between images? (important)

Respond ONLY with valid JSON: {"score": 7, "issues": []}`;

  const result = await model.generateContent([
    { inlineData: { data: originalBuffer.toString('base64'), mimeType: 'image/png' } },
    { inlineData: { data: modifiedBuffer.toString('base64'), mimeType: 'image/png' } },
    prompt,
  ]);
  return parseQAResponse(result.response.text());
}

/** Use Gemini Vision to extract difference coordinates from two images. */
export async function extractDifferenceCoordinates(
  originalBuffer: Buffer,
  modifiedBuffer: Buffer,
): Promise<Difference[]> {
  const model = getGenAI().getGenerativeModel({ model: TEXT_MODEL, safetySettings: SAFETY_SETTINGS });
  const prompt = `Compare these two images (original, then modified) and identify all visual differences.

For each difference provide:
- x: horizontal center as percentage 0–100 from left
- y: vertical center as percentage 0–100 from top
- radius: size of difference area as percentage 3–8
- description: brief description

Respond ONLY with a valid JSON array:
[{"x": 25, "y": 40, "radius": 5, "description": "removed apple"}]`;

  const result = await model.generateContent([
    { inlineData: { data: originalBuffer.toString('base64'), mimeType: 'image/png' } },
    { inlineData: { data: modifiedBuffer.toString('base64'), mimeType: 'image/png' } },
    prompt,
  ]);

  try {
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]) as Difference[];
  } catch {
    return [];
  }
}

/** Parse Gemini safety response — exported for unit testing. */
export function parseSafetyResponse(text: string): SafetyResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { safe: false, issues: ['Failed to parse safety response'] };
    const parsed = JSON.parse(jsonMatch[0]) as { safe?: boolean; issues?: string[] };
    return {
      safe: parsed.safe === true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return { safe: false, issues: ['Failed to parse safety response'] };
  }
}

/** Parse Gemini QA response — exported for unit testing. */
export function parseQAResponse(text: string): QAResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 0, issues: ['Failed to parse QA response'] };
    const parsed = JSON.parse(jsonMatch[0]) as { score?: number; issues?: string[] };
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return { score: 0, issues: ['Failed to parse QA response'] };
  }
}

/** Build the full image generation prompt for a given art style and scene. */
export function buildImagePrompt(roundNumber: number, scene: string): string {
  const style = ART_STYLES[roundNumber];
  if (!style) throw new Error(`Unknown round number: ${roundNumber}`);
  return style.promptTemplate.replace('{scene}', scene);
}
