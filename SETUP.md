# Car Wash Manager — Complete Setup Guide

## What's New in This Version
- ✅ Google Sign-In (Login / Logout)
- ✅ Auto-creates a Google Sheet in your own Google Drive on first login
- ✅ No manual sheet setup needed
- ✅ Works on mobile as a PWA + can be converted to Android APK
- ✅ Completely free

---

## OVERVIEW OF STEPS

| Step | What you do | Time |
|------|-------------|------|
| 1 | Create Google Cloud Project + get Client ID | 5 min |
| 2 | Paste Client ID into auth.js | 1 min |
| 3 | Host the app on GitHub Pages | 10 min |
| 4 | Add the hosted URL to Google Cloud | 2 min |
| 5 | Open on phone & install | 2 min |
| 6 | (Optional) Generate APK | 5 min |

---

## STEP 1 — Get Your Google Cloud Client ID

This allows the app to use Google Sign-In and access Google Sheets.

### 1a. Create a Google Cloud Project
1. Go to **console.cloud.google.com**
2. Click the project dropdown (top left) → **New Project**
3. Name it: `Car Wash Manager`
4. Click **Create**

### 1b. Enable Required APIs
1. In the left menu → **APIs & Services → Library**
2. Search for **Google Sheets API** → Click it → **Enable**
3. Go back to Library → Search for **Google Drive API** → Click it → **Enable**

### 1c. Create OAuth Credentials
1. Left menu → **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. If asked to configure consent screen:
   - Choose **External** → **Create**
   - App name: `Car Wash Manager`
   - User support email: your Gmail
   - Developer contact: your Gmail
   - Click **Save and Continue** through all steps
   - At the end click **Back to Dashboard**
4. Now click **+ Create Credentials → OAuth client ID** again
5. Application type: **Web application**
6. Name: `Car Wash Web App`
7. Under **Authorized JavaScript origins**, click **+ Add URI**:
   - Add: `https://YOUR_GITHUB_USERNAME.github.io` (you'll add this after Step 3)
   - Also add: `http://localhost` (for local testing)
8. Click **Create**
9. A popup shows your **Client ID** — it looks like:
   ```
   123456789-abcdefg.apps.googleusercontent.com
   ```
   **Copy this Client ID**

---

## STEP 2 — Add Client ID to the App

1. Open `js/auth.js` in Notepad (or any text editor)
2. Find line 8:
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   ```
3. Replace it with your actual Client ID:
   ```javascript
   const GOOGLE_CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com';
   ```
4. Save the file

---

## STEP 3 — Host the App on GitHub Pages (Free)

The app needs to be hosted online so it can:
- Be opened on your phone
- Be converted to an APK
- Use Google Sign-In (requires a public URL)

### 3a. Create a GitHub Account
1. Go to **github.com** → Sign up (free)

### 3b. Create a Repository
1. Click **+** (top right) → **New repository**
2. Name: `car-wash-app`
3. Check: **Public**
4. Click **Create repository**

### 3c. Upload Your App Files
1. On the repository page, click **uploading an existing file**
2. Drag ALL files from your `car-wash-app` folder (keep folder structure)
3. Files to upload:
   ```
   index.html
   manifest.json
   sw.js
   css/style.css
   js/auth.js
   js/sheets.js
   js/app.js
   ```
4. Click **Commit changes**

### 3d. Enable GitHub Pages
1. Repository → **Settings** → **Pages** (left sidebar)
2. Source: **Deploy from a branch**
3. Branch: **main** → Folder: **/ (root)**
4. Click **Save**
5. Wait 2-3 minutes. Your app URL will be:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/car-wash-app
   ```

---

## STEP 4 — Add Your App URL to Google Cloud

1. Go back to **console.cloud.google.com**
2. **APIs & Services → Credentials**
3. Click on your OAuth Client ID
4. Under **Authorized JavaScript origins**, add:
   ```
   https://YOUR_GITHUB_USERNAME.github.io
   ```
5. Click **Save**

Wait 5 minutes for changes to take effect.

---

## STEP 5 — Open on Your Phone

1. Open **Chrome** on your Android phone
2. Go to: `https://YOUR_GITHUB_USERNAME.github.io/car-wash-app`
3. You'll see the Sign-In screen → Click **Sign in with Google**
4. Choose your Gmail account
5. On first login, you'll be asked for:
   - Your **Business Name** (e.g. "Rahul Car Wash")
   - Your **Owner Name**
   - Your **Mobile Number** (optional)
6. The app **automatically creates a "Car Wash Records" Google Sheet** in your Drive!

### Install on Home Screen (Android)
1. Tap the **three-dot menu** (⋮) in Chrome
2. Tap **Add to Home Screen**
3. Tap **Add** — an app icon appears on your home screen!

### Install on Home Screen (iPhone)
1. Open in **Safari**
2. Tap the **Share** button
3. Tap **Add to Home Screen** → **Add**

---

## STEP 6 — Generate an Android APK (Optional)

This lets you share the app as an installable APK file.

### Method A: PWABuilder (Easiest — Recommended)
1. Go to **pwabuilder.com**
2. Enter your app URL: `https://YOUR_USERNAME.github.io/car-wash-app`
3. Click **Start** → Wait for analysis
4. Click **Package for stores**
5. Choose **Android** → **Download Package**
6. You'll get a `.apk` file

### Sharing the APK with Others
1. Share the `.apk` file via **WhatsApp / Google Drive / Email**
2. On the receiver's phone:
   - Go to **Settings → Security** → Enable **Install unknown apps** for the browser/file manager
   - Open the APK file → **Install**

### Method B: Play Store (for wide public distribution)
- Requires a one-time **$25 registration fee** on Google Play Console
- Allows listing on Play Store so anyone can download it
- Use the PWABuilder APK package to submit

---

## HOW THE APP WORKS

```
User opens app
     │
     ▼
Login Screen (Sign in with Google)
     │ ← user clicks Sign in
     ▼
Google account picker
     │
     ▼
App checks if first time?
     │
   YES ──► Setup screen (business name, phone)
     │              │
   NO               │
     │◄─────────────┘
     ▼
Main App (Home screen)
     │
     ├──► New Entry ──► Data saved to your Google Sheet
     │
     └──► Search ──► Searches your Google Sheet by phone/vehicle
```

---

## YOUR DATA (Google Sheet)

After first login, a sheet called **"Car Wash Records"** will appear in your Google Drive at **drive.google.com**

Each row = one customer visit:

| Date & Time | Customer Name | Phone | Vehicle No. | Model | Service | Amount | Staff | Notes |
|---|---|---|---|---|---|---|---|---|
| 05/03/2026 10:30 am | Rajesh Kumar | 9876543210 | KA01AB1234 | Swift | Full Wash | 500 | Ramu | Window cleaned |

---

## MULTIPLE USERS / STAFF

- Each staff member signs in with **their own Google account**
- They get **their own separate Google Sheet**
- If you want all staff to share one sheet:
  - All staff sign in with the **same Google account** (the owner's Gmail)

---

## TROUBLESHOOTING

**"Error 400: redirect_uri_mismatch"**
- Your GitHub Pages URL is not added in Google Cloud Console
- Go to Step 4 and add it

**"Access blocked: Authorization Error"**
- Go to Google Cloud Console → OAuth Consent Screen
- Click **Publish App** (or add your email as a test user)

**"Sign-in popup not appearing on phone"**
- Make sure you're using Chrome (not Samsung browser)
- Allow popups for the site

**"Sheet not found" or API error**
- Sign out and sign in again
- Check that Google Sheets API and Drive API are enabled

---

## FILE STRUCTURE

```
car-wash-app/
├── index.html                    ← App UI (login + app screens)
├── manifest.json                 ← PWA config
├── sw.js                         ← Offline support
├── css/style.css                 ← All styles
├── js/
│   ├── auth.js                   ← Google Sign-In (PUT CLIENT ID HERE)
│   ├── sheets.js                 ← Google Sheets API (auto-create + read/write)
│   └── app.js                    ← App logic, navigation, forms
├── google-apps-script/
│   └── Code.gs                   ← (Alternative backend — not needed with new version)
└── SETUP.md                      ← This file
```
