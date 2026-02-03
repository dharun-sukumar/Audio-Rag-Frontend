# Frontend Authentication Logic - Backend Guide

## Overview
The frontend **only uses Firebase ID tokens** for authentication. All API requests include a Firebase ID token in the `Authorization` header.

## Token Type

### Firebase ID Token (Only Token Type)
- **Format**: `Authorization: Bearer <firebase-jwt-token>`
- **Issuer**: `https://securetoken.google.com/zentra-22044`
- **Structure**: Firebase Authentication ID token (JWT)
- **How it's obtained**: User signs in with Google via Firebase, Firebase provides ID token
- **Expiration**: ~1 hour (automatically refreshed by frontend)

## How It Works

1. **User signs in** → User signs in with Google via Firebase Authentication
2. **Token Generation** → Firebase generates an ID token for the authenticated user
3. **API Request** → Frontend sends Firebase ID token in `Authorization: Bearer <token>` header
4. **Token Refresh** → Frontend automatically refreshes token when it expires (~1 hour)

## Backend Requirements

### 1. Token Verification
Backend must verify **Firebase ID tokens**:

**For Firebase Token:**
- Verify using Firebase Admin SDK
- Extract user ID from `user_id` or `sub` claim
- Project ID: `zentra-22044`
- Issuer: `https://securetoken.google.com/zentra-22044`

### 2. User Identification
Extract user identifier from Firebase token:
- **Firebase Token**: `user_id` or `sub` claim (Firebase UID)
- **Email**: `email` claim (if available)

### 3. Error Handling
- If token verification fails → Return `401 Unauthorized`
- Include CORS headers in **all responses** (including errors)
- Error response format: `{"detail": "error message"}`

## Example Request

```http
POST /process-audio HTTP/1.1
Host: 38.242.215.255:8000
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImY3NThlNTYzYzBiNjRhNzVmN2UzZGFlNDk0ZDM5NTk1YzE0MGVmOTMiLCJ0eXAiOiJKV1QifQ...

{
  "audio_key": "user_id/timestamp/recording.webm"
}
```

## Common Issues

1. **"Certificate for key id ... not found"**
   - Backend cannot verify Firebase token
   - Ensure Firebase Admin SDK is properly configured
   - Check that backend has internet access to fetch Firebase certificate endpoints
   - Verify Firebase project ID matches: `zentra-22044`

2. **CORS errors on 500 responses**
   - Backend must include CORS headers in error responses
   - Add CORS headers to exception handlers

3. **Token expiration**
   - Tokens expire after ~1 hour
   - Frontend automatically refreshes tokens
   - Backend should return clear error messages if token is invalid

## Testing

To test token verification:
1. Get token from frontend (shown in profile section)
2. Decode at https://jwt.io to see claims
3. Verify issuer matches expected values
4. Check token hasn't expired (`exp` claim)
