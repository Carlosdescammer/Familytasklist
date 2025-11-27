# E2EE Testing Guide

## Quick Test: Verify Encryption Works

### Test 1: Check Browser DevTools (Network Tab)

1. Open browser DevTools (F12 or right-click > Inspect)
2. Go to **Network** tab
3. Send a message: "Hello World Test"
4. Find the POST request to `/api/messages/encrypted`
5. Click on it and view the **Payload** tab
6. You should see:
   ```json
   {
     "familyId": "...",
     "encryptedContent": "base64-gibberish-here",
     "encryptedKeys": {"userId": "more-base64-gibberish"},
     "iv": "random-base64",
     "algorithm": "RSA-OAEP + AES-256-GCM"
   }
   ```
7. ✅ If you see base64 strings instead of your plain text, encryption is working!

### Test 2: Check IndexedDB (Local Key Storage)

1. In DevTools, go to **Application** tab
2. Click **IndexedDB** > **E2EEKeyStore** > **keys**
3. You should see entries for:
   - `publicKey` - Your RSA public key (Base64)
   - `encryptedPrivateKey` - Your encrypted private key (cannot be read without passphrase)
   - `masterKey` - Encrypted master key (only exists while unlocked)
4. ✅ If these entries exist, your keys are stored securely!

### Test 3: Lock & Unlock Encryption

1. Click the **"Lock"** button in the messages page
2. Messages should disappear (encryption is locked)
3. Click **"Unlock"** button
4. Enter your passphrase
5. Messages should reappear (decrypted)
6. ✅ If lock/unlock works, your passphrase protection is working!

### Test 4: Multi-User Encryption (Advanced)

1. Have another family member:
   - Log in to the app
   - Go to `/messages`
   - Set up their own encryption with their own passphrase
2. Send a message from your account
3. The other family member should:
   - Unlock their encryption with THEIR passphrase
   - See your decrypted message
4. ✅ If they can decrypt with their own key, multi-recipient encryption works!

### Test 5: Database Inspection (For Developers)

If you have access to the database, run this query:

```sql
SELECT
  "encryptedContent",
  "encryptedKeys",
  "iv",
  "algorithm"
FROM encrypted_messages
LIMIT 1;
```

You should see:
- `encryptedContent`: Long base64 string (NOT plain text)
- `encryptedKeys`: JSON with encrypted AES keys per user
- `iv`: Random initialization vector
- `algorithm`: "RSA-OAEP + AES-256-GCM"

✅ If you cannot read the message content in the database, encryption is working!

## What Should NOT Happen

❌ **Red Flags** (these mean encryption is broken):
- Plain text messages visible in network requests
- Message content readable in the database
- Can unlock without entering the correct passphrase
- Messages don't disappear when locked

## Expected Behavior

✅ **Correct Behavior**:
- Messages encrypted before leaving browser
- Server only stores encrypted data
- Cannot read messages without unlocking
- Each user has their own encryption key
- Messages decrypt only in the browser after unlock
- Wrong passphrase shows "Invalid passphrase" error

## Console Logs to Watch

Open DevTools Console and look for:
```
[Encrypted Messages] Socket.IO not available  // OK if not using real-time
✓ (pwa) Service worker loaded                 // PWA working
Encryption unlocked successfully              // After unlock
Message decrypted successfully                // After receiving
```

## Security Notes

⚠️ **Important**:
- Passphrase is NEVER sent to the server
- Private keys are encrypted with your passphrase
- Server cannot decrypt your messages
- If you lose your passphrase, messages are lost forever
- This is zero-knowledge encryption (server has zero knowledge of content)
