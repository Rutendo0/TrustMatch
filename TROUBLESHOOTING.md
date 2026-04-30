# TrustMatch Troubleshooting Guide

## Socket Authentication Errors

### Error: "Invalid signature - JWT_SECRET may have changed"

**Symptoms:**
```
Socket authentication: Invalid signature - JWT_SECRET may have changed
Error: invalid signature
[Socket] Connection error: Invalid token: signature mismatch
WARN [Socket] Auth failed — token may be expired or invalid: Invalid token: signature mismatch
```

**Cause:**
This error occurs when the JWT_SECRET on the server has changed, but the mobile app still has a token signed with the old secret. This commonly happens when:
- Server is redeployed with a new JWT_SECRET
- Environment variables are updated
- Server configuration changes

**Solution:**

### For Users (Quick Fix):
1. **Close the app completely** (swipe it away from recent apps)
2. **Reopen the app**
3. **Log out** if you're logged in
4. **Log back in** with your credentials

The app will automatically clear the invalid token and get a new one.

### For Developers:

#### Option 1: Clear App Data (Recommended for Testing)
```bash
# For iOS Simulator
xcrun simctl uninstall booted [your.bundle.id]
xcrun simctl install booted [path-to-app]

# For Android Emulator
adb uninstall [your.package.name]
```

#### Option 2: Add Token Refresh Logic
The app already handles this automatically:
- Invalid tokens are cleared when 401 errors occur
- Socket connection errors trigger token cleanup
- Users just need to log in again

#### Option 3: Prevent JWT_SECRET Changes
In production, **never change the JWT_SECRET** unless absolutely necessary. If you must:

1. **Update server `.env` file:**
```bash
cd server
# Edit .env and set a new JWT_SECRET
nano .env
```

2. **Restart the server:**
```bash
pm2 restart all
# or
npm run dev
```

3. **Notify all users** to log out and log back in

### Prevention

**For Production:**
- Use a strong, permanent JWT_SECRET
- Store it securely in environment variables
- Never commit it to version control
- Document it in your deployment process

**For Development:**
- Use a consistent JWT_SECRET across team members
- Add it to `.env.example` (without the actual value)
- Document the setup process in README

## Other Common Issues

### Registration Flow Issues

**Problem:** New users being redirected to ID verification screen

**Solution:** This has been fixed in the latest version. The app now:
- Clears old registration progress when starting fresh
- Doesn't auto-redirect based on stored progress
- Each user gets a clean registration experience

### Socket Connection Issues

**Problem:** Socket won't connect

**Checklist:**
1. Check if server is running: `curl http://your-server:3000/health`
2. Verify EXPO_PUBLIC_API_URL in `.env`
3. Check network connectivity
4. Ensure JWT token is valid (log out and log back in)
5. Check server logs for errors

### Photo Upload Issues

**Problem:** Photos fail to upload

**Common causes:**
- File size too large (max 10MB)
- Network timeout
- Server storage full
- Invalid image format

**Solution:**
- Compress images before upload
- Check server disk space
- Verify Cloudinary configuration (if using)

## Getting Help

If you continue to experience issues:

1. **Check the logs:**
   - Client: React Native debugger console
   - Server: `pm2 logs` or check `server/logs/`

2. **Verify environment variables:**
   - Client: `.env` file
   - Server: `server/.env` file

3. **Contact support** with:
   - Error messages
   - Steps to reproduce
   - Device/platform information
   - Server logs (if applicable)
