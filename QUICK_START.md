# Quick Reference - Local Standalone App

## ⚡ Quick Commands

### Development
```bash
npm install          # Install dependencies (first time only)
npm run dev         # Start development server (http://localhost:5173)
npm run build       # Create production build
npm run preview     # Test production build locally
```

### Android Deployment (Capacitor Method)
```bash
npm install @capacitor/core @capacitor/cli --save-dev
npx cap init
npx cap add android
npm run build
npx cap copy android
npx cap open android
# Then build and run from Android Studio
```

---

## 📱 What's New

| Before | After |
|--------|-------|
| Needs server running | Works standalone |
| Data on remote server | Data on device |
| Requires internet | Works offline |
| Can sync across devices | Single device only |
| Server deployment needed | Deploy as web/Android app |

---

## 💾 How Data Works

### Where Data Lives
- **All data**: Browser IndexedDB (on the device)
- **Persists**: Yes, survives app restart
- **Size**: ~50MB available (typically use 1-5MB)

### Database Contents
- **products** - Inventory items
- **students** - Student accounts and balances
- **transactions** - All sales/purchases
- **expenses** - Operational costs

### First Launch
- App automatically loads 10 sample products
- App automatically loads 10 sample students
- All data edits saved to IndexedDB

---

## ✅ Features Working

| Feature | Works | Notes |
|---------|-------|-------|
| Cashier | ✅ | Process sales, payments |
| Inventory | ✅ | Add/edit products |
| Budget | ✅ | Charts, reports |
| Students | ✅ | Manage accounts |
| Grades | ✅ | View by grade |
| Reports | ✅ | All analytics |
| Offline | ✅ | No internet needed |

---

## 🔧 What Changed

### Removed
- ❌ Express.js server code
- ❌ Remote API calls
- ❌ Server deployment
- ❌ npm start / npm server:install

### Kept
- ✅ All UI components
- ✅ All features
- ✅ All business logic
- ✅ React/Vite setup

### Added
- ✅ Pure local storage
- ✅ Android compatibility
- ✅ Offline capability
- ✅ Standalone operation

---

## 🚀 Deployment Steps

### Step 1: Build
```bash
npm run build
```
Creates `build/` folder with production files

### Step 2: Choose Method

**Option A: Capacitor (Recommended)**
```bash
npm install @capacitor/core @capacitor/cli --save-dev
npx cap init  # com.schoolstore.cashier
npx cap add android
npx cap copy android
npx cap open android
# Build from Android Studio
```

**Option B: PWA (Simple)**
- Upload `build/` folder to web server
- Access from tablet browser
- Add to home screen

**Option C: Cordova**
```bash
npm install -g cordova
cordova create app com.schoolstore.cashier
cordova platform add android
# Copy build/* to www/
cordova build android --release
```

---

## 💾 Backup Data

### Export
1. Open DevTools (F12)
2. Go to Application → IndexedDB → schoolstore-db
3. Right-click each store → Export as JSON
4. Save files

### Import
1. Open DevTools
2. Go to Application → IndexedDB
3. Restore JSON files back

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank screen | Check console (F12), verify build/index.html |
| Data not saving | Verify IndexedDB enabled, check storage |
| Slow performance | Close other tabs, check storage quota |
| App won't load | Clear cache (Ctrl+Shift+Del), rebuild |
| Build fails | Run `npm install` again, check Node version |

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/services/api.ts` | API layer (all local) |
| `src/services/localDb.ts` | IndexedDB wrapper |
| `src/App.tsx` | Main component |
| `build/` | Production build output |
| `STANDALONE_CONVERSION.md` | What changed |
| `ANDROID_DEPLOYMENT.md` | How to deploy |

---

## 📊 Build Info

- **Size**: ~235 KB gzipped
- **Build Time**: ~4 seconds
- **Output**: `build/` folder
- **Files**: index.html + CSS + JS

---

## ✨ Highlights

✅ **Zero server needed** - Everything runs on device
✅ **Works offline** - No internet required
✅ **Data persistent** - Survives app restart
✅ **Fast** - Local database is speedy
✅ **Simple** - No complex deployment
✅ **Mobile ready** - Optimized for Android

---

## 🚦 Status

**✅ PRODUCTION READY**

All features working. All tests passing. Ready for Android deployment.

---

## 📚 Full Guides

- **Detailed Setup**: See `STANDALONE_CONVERSION.md`
- **Android Deploy**: See `ANDROID_DEPLOYMENT.md`
- **Technical Info**: See `CONVERSION_ANALYSIS.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

---

## Questions?

1. Check the relevant guide (links above)
2. Review browser console (F12)
3. Check IndexedDB in DevTools → Application
4. Verify `build/` folder has files

**All documentation included in project root directory.**

