# Deployment Guide

Complete guide for deploying the School Store application with separate backend and frontend services.

## Table of Contents

- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [Environment Variables Reference](#environment-variables-reference)
- [Troubleshooting](#troubleshooting)

---

## Backend Deployment

### Prerequisites

- GitHub repository with your code pushed
- Render account (or similar hosting service)
- PostgreSQL database (Render provides this)

### Step 1: Create PostgreSQL Database

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create New PostgreSQL Instance**
   - Click **"New +"** → Select **"PostgreSQL"**

3. **Configure Database**
   - **Name**: `school-store-db` (or your preferred name)
   - **Region**: Choose your preferred region
   - **PostgreSQL Version**: Latest stable (14+)
   - **Plan**: Free tier available

4. **Copy Database URL**
   - Once created, copy the **"Internal Database URL"**
   - Format: `postgres://user:password@hostname:5432/database`
   - ⚠️ **Keep this secure** - contains credentials

### Step 2: Create Web Service

1. **Create New Web Service**
   - Click **"New +"** → Select **"Web Service"**

2. **Connect Repository**
   - Choose **"Build and deploy from a Git repository"**
   - Connect GitHub account
   - Select your repository
   - Click **"Connect"**

3. **Configure Build Settings**

   | Setting | Value |
   |---------|-------|
   | **Name** | `school-store-backend` |
   | **Region** | Same as database (recommended) |
   | **Branch** | `main` |
   | **Root Directory** | `server` ⚠️ **Important** |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node index.js` |

4. **Advanced Settings**
   - **Auto-Deploy**: `Yes`
   - **Health Check Path**: `/api/ping` (optional)

### Step 3: Configure Environment Variables

In your web service settings, go to **"Environment"** tab and add:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgres://...` | Internal Database URL from Step 1 |
| `SITE_PASSWORD` | `your-secure-password` | Login password (choose strong password) |
| `SESSION_SECRET` | `random-hex-string` | Session encryption secret (see below) |
| `NODE_ENV` | `production` | Production mode |
| `SERVE_FRONTEND` | `false` | Set to `false` for API-only backend |

#### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Frontend URL (required for separate frontend) |
| `API_KEY` | `optional-api-key` | Additional API key auth (optional) |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `PORT` | `10000` | Port (auto-set by Render, usually not needed) |

#### Generate SESSION_SECRET

Run locally to generate a secure secret:

```bash
openssl rand -hex 32
```

Copy the output and paste as `SESSION_SECRET` value.

### Step 4: Run Database Migrations

1. **Option A: Manual Migration (Recommended)**
   - In Render dashboard, go to your web service
   - Click **"Shell"** tab
   - Run: `npm run migrate`
   - This creates all necessary tables

2. **Option B: Auto-Migration**
   - Add to **Build Command**: `npm install && npm run migrate`
   - ⚠️ Note: This runs on every deploy

### Step 5: Verify Deployment

1. **Check Health**
   ```bash
   curl https://your-backend.onrender.com/api/ping
   ```
   Should return: `{"ok":true,"timestamp":"..."}`

2. **Check Logs**
   - Render Dashboard → Your Service → **"Logs"** tab
   - Look for: `Server running on port...`

3. **Test Login Endpoint**
   ```bash
   curl -X POST https://your-backend.onrender.com/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "password=your-password" \
     -c cookies.txt -v
   ```
   Should set a session cookie.

---

## Frontend Deployment

### Prerequisites

- GitHub repository
- Vercel account (or Netlify, Render, etc.)
- Backend URL (from Backend Deployment)

### Step 1: Build Frontend Locally (Optional)

You can build locally to test, or let the hosting service build it:

```bash
# From project root
npm install
npm run build
```

This creates a `build/` directory with production files.

### Step 2: Deploy to Vercel

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repository

2. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (root of repo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

3. **Environment Variables**
   - Click **"Environment Variables"**
   - Add: `VITE_API_URL` = `https://your-backend.onrender.com`
   - ⚠️ **Important**: Vite env vars must be set at build time

4. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete
   - Your frontend will be live at `https://your-app.vercel.app`

### Step 3: Deploy to Netlify (Alternative)

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect GitHub repository

2. **Configure Build**
   - **Base directory**: `.` (root)
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

3. **Environment Variables**
   - Go to **Site settings** → **Environment variables**
   - Add: `VITE_API_URL` = `https://your-backend.onrender.com`

4. **Deploy**
   - Netlify will auto-deploy on every push

### Step 4: Deploy to Render (Alternative)

1. **Create Static Site**
   - Render Dashboard → **"New +"** → **"Static Site"**

2. **Connect Repository**
   - Select your GitHub repository

3. **Configure**
   - **Name**: `school-store-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

4. **Environment Variables**
   - Add: `VITE_API_URL` = `https://your-backend.onrender.com`

5. **Deploy**
   - Render will build and deploy automatically

### Step 5: Update Backend CORS

After deploying frontend, update backend environment variable:

1. Go to Render Dashboard → Your Backend Service
2. **Environment** tab
3. Set `CORS_ORIGIN` = `https://your-frontend.vercel.app`
4. **Save Changes** (service will restart)

⚠️ **Important**: 
- Use exact frontend URL (with `https://`)
- No trailing slash
- Must match exactly for cookies to work

### Step 6: Verify Frontend

1. **Visit Frontend URL**
   - Should redirect to backend login if not authenticated
   - Or show login form (if frontend handles login)

2. **Test Authentication Flow**
   - Enter password
   - Should redirect to main app
   - API calls should work

3. **Check Browser Console**
   - Open DevTools → Console
   - Should see no CORS errors
   - API calls should succeed

---

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `SITE_PASSWORD` | ✅ Yes | - | Login password |
| `SESSION_SECRET` | ✅ Yes | - | Session encryption secret (32+ chars) |
| `NODE_ENV` | ✅ Yes | - | Set to `production` |
| `SERVE_FRONTEND` | ⚠️ Recommended | `true` | Set to `false` for API-only |
| `CORS_ORIGIN` | ⚠️ If separate frontend | `*` | Frontend URL (exact match) |
| `API_KEY` | ❌ No | - | Optional API key auth |
| `LOG_LEVEL` | ❌ No | `info` | Logging level |
| `PORT` | ❌ No | `4000` | Server port (auto-set on Render) |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ⚠️ If separate backend | `''` | Backend API URL |
| `VITE_USE_LOCAL` | ❌ No | `false` | Use local IndexedDB instead of backend |

⚠️ **Note**: Vite environment variables must be set at **build time**, not runtime. Rebuild after changing.

---

## Deployment Options

### Option A: Separate Backend + Frontend (Recommended)

**Backend:**
- Deploy to Render as Web Service
- Set `SERVE_FRONTEND=false`
- Set `CORS_ORIGIN` to frontend URL

**Frontend:**
- Deploy to Vercel/Netlify/Render Static Site
- Set `VITE_API_URL` to backend URL
- Frontend handles all UI

**Pros:**
- ✅ Independent deployments
- ✅ Better performance (CDN for frontend)
- ✅ Easier scaling
- ✅ Better separation of concerns

**Cons:**
- ❌ Requires CORS configuration
- ❌ Two services to manage

### Option B: Integrated (Backend Serves Frontend)

**Backend:**
- Deploy to Render as Web Service
- Don't set `SERVE_FRONTEND` (or set to `true`)
- Commit `build/` folder to Git
- Backend serves React app

**Frontend:**
- Build locally: `npm run build`
- Commit `build/` folder
- Backend serves it automatically

**Pros:**
- ✅ Single deployment
- ✅ No CORS issues
- ✅ Simpler setup

**Cons:**
- ❌ Frontend changes require backend redeploy
- ❌ Can't use CDN for static assets
- ❌ Larger backend service

---

## Troubleshooting

### Backend Issues

#### Issue: Database Connection Failed

**Symptoms:**
- Error: `Connection refused` or `ECONNREFUSED`
- Service won't start

**Solutions:**
- Verify `DATABASE_URL` uses **Internal Database URL** (not External)
- Ensure database and service are in **same region**
- Check database is running (green status in dashboard)
- Verify SSL settings in `lib/db.js` (should be `rejectUnauthorized: false` for Render)

#### Issue: Login Page Shows But Can't Login

**Symptoms:**
- Login page appears
- Password submission doesn't work
- Stuck on login page

**Solutions:**
- Check `SITE_PASSWORD` is set correctly
- Verify `SESSION_SECRET` is set (32+ characters)
- Check `NODE_ENV=production` is set
- Verify `trust proxy` is configured (already in code)
- Check browser DevTools → Application → Cookies (should see session cookie after login)

#### Issue: API Returns 401 After Login

**Symptoms:**
- Login succeeds
- API calls return 401 Unauthorized

**Solutions:**
- Check session cookie is being set (browser DevTools)
- Verify `SESSION_SECRET` is correct
- Ensure `NODE_ENV=production` is set
- Check CORS settings if frontend is separate
- Verify `credentials: 'include'` in frontend API calls (already configured)

#### Issue: Service Won't Start

**Symptoms:**
- Service shows "Failed" status
- No logs or error messages

**Solutions:**
- Check **Logs** tab for error messages
- Verify all required environment variables are set
- Check `Root Directory` is set to `server`
- Verify `Start Command` is `node index.js`
- Check Node version compatibility

### Frontend Issues

#### Issue: Frontend Can't Connect to Backend

**Symptoms:**
- CORS errors in browser console
- API calls fail
- Network errors

**Solutions:**
- Verify `VITE_API_URL` is set correctly (with `https://`)
- Check `CORS_ORIGIN` in backend matches frontend URL exactly
- Ensure both services use HTTPS in production
- Verify `credentials: 'include'` in API calls (already configured)
- Check browser console for specific error messages

#### Issue: Blank Page After Login

**Symptoms:**
- Login succeeds
- Page is blank or shows loading spinner

**Solutions:**
- Check browser console for JavaScript errors
- Verify `VITE_API_URL` is set correctly
- Check network tab - API calls should succeed
- Verify frontend build completed successfully
- Check that `build/` directory contains `index.html`

#### Issue: Environment Variables Not Working

**Symptoms:**
- `VITE_API_URL` not being used
- API calls go to wrong URL

**Solutions:**
- ⚠️ **Vite env vars must be set at build time**
- Rebuild frontend after setting environment variables
- Check variable name starts with `VITE_`
- Verify variable is set in hosting service (not just locally)
- For Vercel: Set in project settings → Environment Variables
- For Netlify: Set in Site settings → Environment variables

#### Issue: Build Fails

**Symptoms:**
- Deployment fails
- Build errors in logs

**Solutions:**
- Check build logs for specific errors
- Verify `package.json` is in root directory
- Check Node version compatibility
- Ensure all dependencies are in `package.json`
- Try building locally first: `npm run build`

### Authentication Issues

#### Issue: Redirect Loop

**Symptoms:**
- Page keeps redirecting
- Can't access app

**Solutions:**
- Check session cookie is being set (browser DevTools)
- Verify `SESSION_SECRET` is set correctly
- Ensure `NODE_ENV=production` is set
- Check that frontend and backend are on same domain (integrated) or CORS is configured (separate)
- Clear browser cookies and try again

#### Issue: Session Not Persisting

**Symptoms:**
- Login works but session lost on refresh
- Need to login repeatedly

**Solutions:**
- Check cookie settings in `server/lib/auth.js`
- Verify `secure: true` in production (requires HTTPS)
- Check `sameSite: 'lax'` setting
- Ensure `maxAge` is set correctly (8 hours default)
- Check browser cookie settings (not blocking cookies)

---

## Quick Reference

### Backend Commands

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate

# Start server (development)
npm run dev

# Start server (production)
npm start

# Run tests
npm test
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Health Checks

```bash
# Backend health check
curl https://your-backend.onrender.com/api/ping

# Should return: {"ok":true,"timestamp":"..."}
```

### Testing Login

```bash
# Test login endpoint
curl -X POST https://your-backend.onrender.com/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "password=your-password" \
  -c cookies.txt -v

# Check if cookie was set
cat cookies.txt
```

---

## Security Checklist

- ✅ `SESSION_SECRET` is randomly generated (32+ characters)
- ✅ `SITE_PASSWORD` is strong and unique
- ✅ `DATABASE_URL` uses Internal URL (not External)
- ✅ `NODE_ENV=production` is set
- ✅ `CORS_ORIGIN` matches frontend URL exactly (if separate)
- ✅ HTTPS is enabled (automatic on Render/Vercel)
- ✅ Session cookies have `secure: true` in production
- ✅ Environment variables are not committed to Git
- ✅ Database credentials are secure

---

## Support

For issues or questions:
1. Check **Logs** tab in Render/Vercel dashboard
2. Check browser **Console** and **Network** tabs
3. Review this troubleshooting guide
4. Check server logs for detailed error messages

---

**Last Updated**: 2024
**Version**: 2.0 (Separate Frontend/Backend Support)
