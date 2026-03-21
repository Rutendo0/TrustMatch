# TrustMatch Registration Fix TODO

## Step 1: Cleanup unverified account [COMPLETE]
- [x] Create TODO.md
- [x] Hard delete mikitayorutendo@gmail.com User + related records (Verification, DeviceFingerprints, RefreshTokens)
- [x] Confirm deletion (script ran successfully)

## Step 2: Database Migration [IN PROGRESS]
- [] Add `status` enum to User model (PENDING/ACTIVE/SUSPENDED)
- [] Run `npx prisma migrate dev`
- [] Update seed data if needed

## Step 3: Backend Auth Changes
- [] server/src/routes/auth.ts: 
  - Modify /register → create pending User (status: PENDING), temp short token
  - Add /auth/complete endpoint (after all verifs → ACTIVE + full tokens)
  - Update /login → require ACTIVE status
- [] server/src/middleware/auth.ts: Add verifiedAuthMiddleware (block !isVerified)
- [] Apply verifiedAuthMiddleware to ALL feature routes (users/discover, matches, messages, etc.)

## Step 4: Frontend Flow Fix
- [] src/services/api.ts: Add completeRegistration()
- [] src/screens/auth/RegisterScreen.tsx: Handle temp token handling
- [] src/screens/auth/EmailVerificationScreen.tsx: Call completeRegistration after code verify → store real token → main app
- [] src/navigation/AppNavigator.tsx: Gate main tabs behind verification check

## Step 5: Verification Logic
- [] server/src/routes/verification.ts: Set isVerified=true only when ALL flags true
- [] Test full flow end-to-end

## Step 6: Testing & Cleanup
- [] Test register → verifs → full access
- [] Test unverified blocked from features
- [] Remove temp files
- [] attempt_completion
