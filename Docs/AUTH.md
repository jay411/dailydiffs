# AUTH.md — DailyDiffs Authentication & Onboarding

## Auth Strategy

DailyDiffs uses a delayed login wall. Round 1 is completely free — no account needed. The login gate appears after Round 1 completes to continue playing. This lets visitors experience the game before committing.

## Auth Provider

Supabase Auth with:
- **Primary:** Google OAuth (one-tap on mobile, most frictionless)
- **Secondary:** Email magic link (for users who prefer not to use Google)
- Apple Sign-In (add in V2 if targeting iOS app)

## User Flow

### First-Time Visitor
```
1. Lands on dailydiffs.com
2. Sees "Play Today's Puzzle" button
3. Clicks play → enters Round 1 immediately (no login)
4. Completes Round 1
5. Login wall appears:
   ┌─────────────────────────────────┐
   │                                 │
   │  Nice! You found 4/5 diffs     │
   │  in 28 seconds                 │
   │                                 │
   │  Sign in to continue playing   │
   │  and save your streak          │
   │                                 │
   │  [Continue with Google]         │
   │                                 │
   │  or                            │
   │                                 │
   │  [Email magic link]            │
   │                                 │
   │  4 more rounds waiting...      │
   │                                 │
   └─────────────────────────────────┘
6. After login → redirect to Round 2 seamlessly
7. Round 1 score is preserved and attached to their new account
```

### Returning User (Logged In)
```
1. Lands on dailydiffs.com
2. Sees their streak count, last score, "Play Today's Puzzle"
3. Clicks play → enters Round 1 directly
4. No login wall — proceeds through all 5 rounds
```

### Returning User (Not Logged In)
```
1. Lands on dailydiffs.com
2. Sees "Play Today's Puzzle" (no personalization)
3. Plays Round 1
4. Login wall appears
5. Logs in → previous account restored with streak history
```

## Login Gate Implementation

### When to Show
- After Round 1 completes (results shown briefly first)
- User taps "Next Round" → check auth state
- If not authenticated → redirect to /auth/login with return URL /play/2

### What to Preserve
- Round 1 score, time, and differences found (store in localStorage temporarily)
- After login, create/resume game_session and attach Round 1 data

### Login Page (/auth/login)
- Clean, minimal design — don't lose the player
- Show Round 1 results at the top as motivation
- Single prominent Google OAuth button
- Email magic link as secondary option
- No password creation — keep it frictionless
- "4 more rounds waiting..." as subtle urgency

### Post-Login Redirect
- After successful auth, redirect to /play/transition (Round 1→2 transition)
- Transition screen shows Round 1 summary + 5-sec ad + "Round 2: Pixel Art" preview
- User continues seamlessly into Round 2

## Supabase Auth Setup

### Google OAuth Configuration
1. Create OAuth credentials in Google Cloud Console
2. Add authorized redirect URI: `https://dailydiffs.com/auth/callback`
3. Configure in Supabase dashboard: Authentication → Providers → Google
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in .env.local

### Auth Callback (/auth/callback)
```
Handles the OAuth redirect:
1. Exchange code for session
2. Check if user exists in users table
3. If new user → create users row with display_name from Google profile
4. Restore Round 1 data from localStorage → create game_session
5. Redirect to /play/transition
```

### Session Management
- Supabase handles session tokens automatically
- Sessions persist across browser closes (refresh token)
- Check auth state on every page load using Supabase onAuthStateChange
- Protected routes: /play/2, /play/3, /play/4, /play/5, /admin

## User Profile Creation

On first login, redirect to /auth/username to create a username before proceeding to the game.

### Username Creation Flow
```
1. OAuth completes → user lands on /auth/username
2. Screen shows:
   ┌─────────────────────────────────┐
   │                                 │
   │  Welcome to DailyDiffs!        │
   │                                 │
   │  Choose a username              │
   │  ┌───────────────────────────┐  │
   │  │ @_________________        │  │
   │  └───────────────────────────┘  │
   │                                 │
   │  3-16 characters                │
   │  Letters, numbers, underscores  │
   │                                 │
   │  [Start Playing]                │
   │                                 │
   └─────────────────────────────────┘
3. Real-time validation as they type
4. Check uniqueness against database
5. On submit → create users row → redirect to Round 2
```

### Username Validation Rules (STRICT)

```typescript
function validateUsername(username: string): { valid: boolean; error?: string } {
  // Length check
  if (username.length < 3) return { valid: false, error: "Too short (min 3)" };
  if (username.length > 16) return { valid: false, error: "Too long (max 16)" };

  // WHITELIST approach: only allow safe characters
  // Letters (a-z, A-Z), numbers (0-9), underscores (_)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: "Only letters, numbers, and underscores" };
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, error: "Must start with a letter" };
  }

  // Block SQL injection patterns
  const sqlPatterns = /('|"|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|SCRIPT)\b)/i;
  if (sqlPatterns.test(username)) {
    return { valid: false, error: "Invalid characters" };
  }

  // Block prompt injection patterns
  const promptPatterns = /(ignore|pretend|system|prompt|instruction|override|bypass|jailbreak|you are|act as)/i;
  if (promptPatterns.test(username)) {
    return { valid: false, error: "Username not allowed" };
  }

  // Block offensive words (expand this list)
  const offensivePatterns = /(admin|moderator|dailydiffs|official|support|fuck|shit|ass|damn|bitch|nigger|faggot)/i;
  if (offensivePatterns.test(username)) {
    return { valid: false, error: "Username not available" };
  }

  return { valid: true };
}
```

### Key Security Principles

1. **Whitelist, don't blacklist** — only allow `[a-zA-Z0-9_]`, reject everything else
2. **Parameterized queries** — NEVER concatenate usernames into SQL strings. Supabase client handles this automatically with `.eq('username', value)`
3. **Server-side validation** — validate on BOTH client (for UX) and server (for security). Never trust client-side validation alone
4. **Sanitize before display** — when showing usernames on leaderboard, escape HTML to prevent XSS: `textContent` not `innerHTML`
5. **Usernames are never used in AI prompts** — the Gemini pipeline has zero access to user data. Usernames only appear in the database and on the leaderboard UI

### Database Constraint

The users table has a UNIQUE constraint on username, plus a CHECK constraint enforcing the regex pattern at the database level as a final safeguard:

```sql
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
ALTER TABLE users ADD CONSTRAINT username_format 
  CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_]{2,15}$');
```

### Uniqueness Check

Real-time as user types (debounced 300ms):
```
Client types "coolplayer"
  → debounce 300ms
  → POST /api/check-username { username: "coolplayer" }
  → Server validates format + checks DB uniqueness
  → Returns { available: true } or { available: false }
  → UI shows ✅ or ❌ next to input
```

On first login, create a row in the users table:
```
{
  id: auth.user.id,
  email: auth.user.email,
  username: validated_username,
  auth_provider: 'google' | 'email',
  streak_count: 0,
  longest_streak: 0,
  last_played_date: null,
  total_games: 0
}
```

## Display Name
- Username is the public display name shown on leaderboard
- Shown as "@username" format
- Cannot be changed after creation (V1) — avoids abuse
- Leaderboard, share cards, and results all use username

## Admin Access

The admin portal (/admin) is restricted to a single email:
- Hardcoded admin email in environment variable: `ADMIN_EMAIL`
- Supabase RLS policy on admin-related queries: `auth.email() = env.ADMIN_EMAIL`
- Non-admin users hitting /admin are redirected to /
- See PIPELINE.md for admin portal functionality

## Edge Cases

### User clears cookies / uses different browser
- They can play Round 1 again as anonymous
- On login, their account is restored with full history
- Round 1 anonymous score is lost (acceptable for V1)

### User tries to skip login wall
- /play/2 through /play/5 check auth state server-side
- Unauthenticated requests redirect to /auth/login
- Return URL is preserved so they resume after login

### User plays Round 1 but never logs in
- Anonymous Round 1 data stays in localStorage for 24 hours
- If they return and login the next day, Round 1 data is expired — they start fresh
- This is fine for V1

### Multiple devices
- Supabase auth syncs across devices via the same account
- Game progress for today is tied to user_id + date
- If they start on phone and switch to desktop, they continue where they left off
