# TrustMatch Registration Fix TODO

## Step 1: Cleanup unverified account [COMPLETE]
- [x] Create TODO.md
- [x] Hard delete mikitayorutendo@gmail.com User + related records (Verification, DeviceFingerprints, RefreshTokens)
- [x] Confirm deletion (script ran, account not found)
- [x] Remove temp delete script

## Step 2: Database Migration [COMPLETE]
- [x] Add `status` enum to User model (PENDING/ACTIVE/SUSPENDED)
- [x] Run `npx prisma migrate dev`
- [x] Update seed data if needed

## Step 3: Backend Auth Changes [COMPLETE]
- [x] server/src/routes/auth.ts: 
  - Modify /register → create pending User (status: PENDING), temp short token
  - [x] Add /auth/complete endpoint (after all verifs → ACTIVE + full tokens)
  - [x] Update /login → require ACTIVE status
- [x] server/src/middleware/auth.ts: Add verifiedAuthMiddleware (block !isVerified)
- [x] Apply verifiedAuthMiddleware to ALL feature routes (users/discover, matches, messages, etc.)

## Step 4: Frontend Flow Fix [COMPLETE]
- [x] src/services/api.ts: Add completeRegistration()
- [x] src/screens/auth/RegisterScreen.tsx: Handle temp token handling
- [x] src/screens/auth/EmailVerificationScreen.tsx: Call completeRegistration after code verify → store real token → main app
- [x] src/navigation/AppNavigator.tsx: Gate main tabs behind verification check

## Step 5: Verification Logic
- [ ] server/src/routes/verification.ts: Set isVerified=true only when ALL flags true
- [ ] Test full flow end-to-end

## Step 6: Testing & Cleanup
- [ ] Test register → verifs → full access
- [ ] Test unverified blocked from features
- [ ] Remove temp files
- [ ] attempt_completion
