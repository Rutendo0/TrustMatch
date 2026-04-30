# TrustMatch Likes System - How It Works

## Overview

The likes system has **two main screens**:

### 1. **Discover Screen** (HomeScreen.tsx)
- Shows profiles you haven't interacted with yet
- You can LIKE, DISLIKE, or SUPERLIKE
- If both users like each other → **Instant Match!** (Match modal appears)

### 2. **Likes Screen** (LikesScreen.tsx)
- **Two tabs:**
  - **"Who Likes You"** - People who liked YOU (but you haven't responded yet)
  - **"You Liked"** - People YOU liked (but they haven't responded yet)

---

## How the Flow Works

### Scenario 1: You Like Someone First

1. **You swipe RIGHT** on Person A (Discover screen)
2. **Server saves:** `Swipe { swiperId: YOU, swipedId: PersonA, action: LIKE }`
3. **Person A sees you** in their **"Who Likes You" tab**
4. **Person A can:**
   - **Like you back** → **MATCH!** 🎉
   - **Pass** → No match

### Scenario 2: Someone Likes You First

1. **Person B swipes RIGHT** on you
2. **You see Person B** in your **"Who Likes You" tab**
3. **You can:**
   - **Like them back** → **MATCH!** 🎉
   - **Pass** → No match

### Scenario 3: Mutual Match

1. **You like Person C**
2. **Person C likes you back** (or vice versa)
3. **Match modal appears immediately** on the screen of whoever liked second
4. **Both users can now:**
   - Send messages
   - See each other in "Messages" tab
   - Start chatting!

---

## Current Implementation

### ✅ What Works:

1. **Swipe endpoint** (`POST /api/matches/swipe`)
   - Saves likes/dislikes
   - Detects mutual matches
   - Returns `{ success: true, isMatch: true/false }`

2. **Get Likes** (`GET /api/matches/likes`)
   - Shows people who liked YOU
   - Filters out people you already swiped on

3. **Get Sent Likes** (`GET /api/matches/sent-likes`)
   - Shows people YOU liked
   - Helps you track who you're waiting on

4. **Discover Feed** (`GET /api/users/discover`)
   - Shows new profiles
   - Excludes people you already LIKED
   - **Now re-shows people you DISLIKED** (so you get more profiles)

### ⚠️ What Needs Attention:

1. **Likes Screen - Action Buttons Don't Work**
   - The "Like Back" and "Pass" buttons in the "Who Likes You" tab are not connected
   - They need to call the swipe API

2. **Real-time Updates**
   - When someone likes you, you don't see it immediately
   - Need to refresh the Likes screen manually

---

## Fixing the Issues

### Issue 1: Discover Screen Failing to Fetch

**Problem:** Server might be down or authentication failing

**Solution:** Check server logs when user navigates to Discover:
```bash
# Should see:
GET /api/users/discover?limit=10 HTTP/1.1 200
```

If you see 401/403 → Authentication issue
If you see 500 → Server error (check logs)

### Issue 2: Like Buttons Not Working in Likes Screen

The buttons in LikesScreen are not connected to the API. Let me fix this:
