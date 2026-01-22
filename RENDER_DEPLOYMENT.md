# Render Deployment Guide

Complete step-by-step guide for deploying the School Store backend to Render with PostgreSQL and authentication.

## Prerequisites

- GitHub repository with your code pushed
- Render account (sign up at [render.com](https://render.com))
- Basic understanding of environment variables

---

## Step 1: Create PostgreSQL Database on Render

1. **Log in to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create New PostgreSQL Instance**
   - Click **"New +"** button (top right)
   - Select **"PostgreSQL"**

3. **Configure Database**
   - **Name**: `school-store-db` (or your preferred name)
   - **Database**: `school_store` (or leave default)
   - **User**: Auto-generated (or customize)
   - **Region**: Choose the same region as your web service (recommended)
   - **PostgreSQL Version**: Latest stable (14+)
   - **Plan**: Free tier available (suitable for development/testing)

4. **Create Database**
   - Click **"Create Database"**
   - Wait 2-3 minutes for provisioning

5. **Copy Database URL**
   - Once created, go to the database dashboard
   - Find **"Internal Database URL"** (recommended for same-region services)
   - Copy this URL - you'll need it for the web service
   - Format: `postgres://user:password@hostname:5432/database`

   ⚠️ **Important**: Keep this URL secure. It contains credentials.

---

## Step 2: Create Web Service on Render

1. **Create New Web Service**
   - In Render Dashboard, click **"New +"**
   - Select **"Web Service"**

2. **Connect Repository**
   - Choose **"Build and deploy from a Git repository"**
   - Connect your GitHub account if not already connected
   - Select your repository: `SchoolStoreCasher` (or your repo name)
   - Click **"Connect"**

3. **Configure Build Settings**
   - **Name**: `school-store-backend` (or your preferred name)
   - **Region**: Same region as your PostgreSQL database (recommended)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `server` ⚠️ **Important**: Set this to `server` since your backend code is in the `server/` folder
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
     - ⚠️ **Note**: This is a Node.js backend that runs directly (no build step needed). `npm install` installs dependencies, then `node index.js` runs the server.
   - **Start Command**: `node index.js`

4. **Advanced Settings** (Optional but Recommended)
   - **Auto-Deploy**: `Yes` (deploys on every push to main branch)
   - **Health Check Path**: `/api/ping` (optional, helps Render monitor service health)

---

## Step 3: Configure Environment Variables

In your web service settings, go to **"Environment"** tab and add these variables:

### Required Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgres://...` | **Paste the Internal Database URL from Step 1** |
| `SITE_PASSWORD` | `your-secure-password` | Shared password for login (choose a strong password) |
| `SESSION_SECRET` | `random-hex-string` | Secret for session encryption (see below) |
| `NODE_ENV` | `production` | Sets production mode |

### Optional Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CORS_ORIGIN` | `https://your-frontend.onrender.com` | Frontend URL (if separate frontend) |
| `API_KEY` | `optional-api-key` | Additional API key auth (optional) |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `PORT` | `10000` | Port (usually auto-set by Render, but can override) |

### Generate SESSION_SECRET

Run this command locally to generate a secure random secret:

```bash
openssl rand -hex 32
```

Copy the output and paste it as the `SESSION_SECRET` value.

**Example values:**
```
DATABASE_URL=postgres://user:pass@dpg-xxxxx-a.singapore-postgres.render.com/school_store
SITE_PASSWORD=MySecurePassword123!
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
```

---

## Step 4: Set Up Database Migration

The database schema needs to be created before the app starts. You have two options:

### Option A: Pre-Deploy Command (Recommended)

1. In your web service settings, go to **"Settings"** tab
2. Scroll to **"Pre-Deploy Command"**
3. Add this command:

```bash
npm run migrate
```

This will run the migration automatically before each deployment.

### Option B: Manual Migration via Render Shell

1. In your web service dashboard, click **"Shell"** tab
2. Run:

```bash
cd server
npm run migrate
```

⚠️ **Note**: The migration script requires `psql` to be available. If you get an error, you may need to install PostgreSQL client tools in the build environment, or use a Node.js-based migration script instead.

---

## Step 5: Deploy

1. **Save Settings**
   - After adding all environment variables, click **"Save Changes"**

2. **Manual Deploy** (if auto-deploy is off)
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

3. **Monitor Deployment**
   - Watch the build logs in real-time
   - Wait for "Your service is live" message
   - First deployment may take 5-10 minutes

4. **Check Logs**
   - Go to **"Logs"** tab to see server output
   - Look for: `Server running on port 10000` (or your PORT)
   - Look for: `Database: PostgreSQL via DATABASE_URL`

---

## Step 6: Verify Deployment

### 6.1 Test Authentication

1. **Open your service URL**
   - Format: `https://school-store-backend.onrender.com`
   - You should be **automatically redirected to `/login`**

2. **Test Login**
   - Enter the `SITE_PASSWORD` you configured
   - Click "Sign in"
   - You should be redirected to the main app

3. **Test Logout**
   - Visit `/logout` (or implement logout in your frontend)
   - You should be redirected back to `/login`

### 6.2 Test API Endpoints

Once authenticated, test API endpoints:

```bash
# Health check (should work without auth)
curl https://your-service.onrender.com/api/ping

# Products (requires auth - will redirect to /login if not authenticated)
curl -b cookies.txt -c cookies.txt https://your-service.onrender.com/api/products
```

### 6.3 Check Database Connection

1. In Render dashboard, go to your PostgreSQL database
2. Click **"Connect"** → **"psql"** (or use external tool)
3. Run:

```sql
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM transactions;
```

If tables exist, migration was successful.

---

## Step 7: Connect Frontend

You have two options for deploying the frontend:

### Option A: Serve Frontend from Backend (Recommended - Integrated)

The backend is configured to serve the React app automatically. This is the simplest setup.

#### 7.1 Build the Frontend

On your local machine or in CI/CD:

```bash
# From project root
cd /Users/ian_lee/Documents/Projects/SchoolStoreCasher

# Install frontend dependencies
npm install

# Build the React app
npm run build
```

This creates a `build/` directory with production-ready files.

#### 7.2 Include Build in Deployment

**Option 1: Commit build folder to Git (Simple)**
- After running `npm run build`, commit the `build/` folder to your repository
- Render will deploy it automatically with your backend
- The backend will automatically serve files from `build/` directory

**Option 2: Build during Render deployment (Advanced)**
1. In Render web service settings, update **Build Command**:
   ```bash
   cd .. && npm install && npm run build && cd server && npm install
   ```
2. Update **Root Directory** to: `server` (keep as is)
3. The build will be created in the parent directory, accessible to the server

#### 7.3 Verify Frontend is Served

After deployment:
1. Visit your Render service URL: `https://your-service.onrender.com`
2. You should see the login page (if not authenticated)
3. After login, you should see the cashier interface

**No additional configuration needed** - the backend automatically:
- Serves static files from `build/` directory
- Handles SPA routing (all routes serve `index.html`)
- Protects routes with authentication

---

### Option B: Deploy Frontend as Separate Service

If you prefer to deploy the frontend separately (e.g., on Vercel, Netlify, or another Render service):

#### 7.1 Build and Deploy Frontend

1. **Build the frontend:**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy `build/` folder** to your hosting service

3. **Set environment variable** in your frontend service:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
   ⚠️ **Note**: Vite environment variables must be set at **build time**, not runtime. Rebuild after setting.

#### 7.2 Configure Backend CORS

In your backend Render service, add environment variable:

```
CORS_ORIGIN=https://your-frontend-domain.com
```

Replace with your actual frontend URL (e.g., `https://your-app.vercel.app`)

#### 7.3 Frontend Configuration

The frontend is already configured to:
- Use `VITE_API_URL` environment variable (or default to same origin)
- Include credentials in all API calls
- Redirect to `/login` if authentication fails

**Example `.env` file for frontend:**
```env
VITE_API_URL=https://your-backend.onrender.com
```

#### 7.4 Verify Connection

1. Visit your frontend URL
2. You should be redirected to: `https://your-backend.onrender.com/login`
3. After login, you'll be redirected back to the frontend
4. API calls should work with session cookies

---

### Frontend Environment Variables Reference

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `VITE_API_URL` | Backend API URL | No* | `''` (same origin) |
| `VITE_USE_LOCAL` | Use local IndexedDB instead of backend | No | `false` |

\* **Required if frontend is on different domain than backend**

**Example values:**
```env
# For separate frontend deployment
VITE_API_URL=https://school-store-backend.onrender.com

# For local development
VITE_API_URL=http://localhost:4000

# To use local IndexedDB (offline mode)
VITE_USE_LOCAL=true
```

---

### Quick Setup Checklist

**For Integrated Deployment (Option A):**
- ✅ Run `npm run build` locally
- ✅ Commit `build/` folder to Git
- ✅ Deploy backend (frontend included automatically)
- ✅ No additional configuration needed

**For Separate Deployment (Option B):**
- ✅ Build frontend: `npm run build`
- ✅ Deploy `build/` to frontend hosting service
- ✅ Set `VITE_API_URL` in frontend build environment
- ✅ Set `CORS_ORIGIN` in backend environment variables
- ✅ Ensure both services are accessible via HTTPS

---

## Troubleshooting

### Issue: "DATABASE_URL environment variable is required"

**Solution**: 
- Check that `DATABASE_URL` is set in Environment variables
- Ensure it's the **Internal Database URL** from PostgreSQL service
- Restart the service after adding the variable

### Issue: "SESSION_SECRET environment variable is required"

**Solution**:
- Add `SESSION_SECRET` environment variable
- Generate a new secret: `openssl rand -hex 32`
- Restart the service

### Issue: "SITE_PASSWORD environment variable is required"

**Solution**:
- Add `SITE_PASSWORD` environment variable
- Set it to your desired shared password
- Restart the service

### Issue: Migration fails with "psql: command not found"

**Solution**:
- Option 1: Use Render Shell to run migration manually
- Option 2: Install PostgreSQL client in build (add to package.json scripts)
- Option 3: Use a Node.js migration script instead of `psql`

### Issue: Can't connect to database

**Solution**:
- Verify `DATABASE_URL` uses **Internal Database URL** (not External)
- Ensure web service and database are in the **same region**
- Check database is running (green status in dashboard)
- Verify SSL settings in `lib/db.js` (should be `rejectUnauthorized: false` for Render)

### Issue: Login redirects but then shows 401

**Solution**:
- Check session cookie is being set (browser DevTools → Application → Cookies)
- Verify `SESSION_SECRET` is set correctly
- Ensure `NODE_ENV=production` is set
- Check CORS settings if frontend is separate

### Issue: API returns 401 even after login

**Solution**:
- Verify `requireAuth` middleware is applied correctly
- Check session is persisting (cookie should be present)
- Ensure frontend includes `credentials: 'include'` in fetch requests
- Verify `CORS_ORIGIN` matches your frontend URL exactly

### Issue: Frontend shows blank page or 404 after login

**Solution**:
- Verify `build/` directory exists and contains `index.html`
- Check that `build/` folder is committed to Git (if using Option A)
- Verify backend logs show "React build directory not found" warning
- Ensure build was created with `npm run build` from project root
- Check that static file serving is working (look for static file requests in logs)

### Issue: Frontend can't connect to backend API

**Solution**:
- Verify `VITE_API_URL` is set correctly (if frontend is separate)
- Check CORS settings: `CORS_ORIGIN` should match frontend URL exactly
- Ensure both services use HTTPS in production
- Check browser console for CORS errors
- Verify API calls include `credentials: 'include'` (already configured in code)

### Issue: Redirect loop after login

**Solution**:
- Check that session cookie is being set (browser DevTools → Application → Cookies)
- Verify `SESSION_SECRET` is set in backend environment variables
- Ensure `NODE_ENV=production` is set (affects cookie security settings)
- Check that frontend and backend are on same domain (for integrated setup) or CORS is configured (for separate setup)

### Issue: Build fails

**Solution**:
- Check build logs for specific errors
- Verify `Root Directory` is set to `server`
- Ensure `package.json` is in the `server/` directory
- Check Node version compatibility

---

## Render Commands Reference

### Build Command
```bash
npm install
```

### Pre-Deploy Command (Optional)
```bash
npm run migrate
```

### Start Command
```bash
node index.js
```

---

## Environment Variables Checklist

Before deploying, ensure you have:

- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `SITE_PASSWORD` - Shared login password
- ✅ `SESSION_SECRET` - Random hex string (32+ characters)
- ✅ `NODE_ENV` - Set to `production`
- ⚠️ `CORS_ORIGIN` - Frontend URL (if separate frontend)
- ⚠️ `API_KEY` - Optional additional API key
- ⚠️ `LOG_LEVEL` - Optional logging level

---

## Security Best Practices

1. **Never commit secrets to Git**
   - All credentials are in Render environment variables
   - `.env` files should be in `.gitignore`

2. **Use strong passwords**
   - `SITE_PASSWORD` should be complex and unique
   - `SESSION_SECRET` should be randomly generated

3. **Use Internal Database URL**
   - Internal URLs are faster and more secure
   - Only use External URL if services are in different regions

4. **Enable HTTPS**
   - Render provides HTTPS by default
   - Ensure `secure: true` in session config (already set for production)

5. **Regular Updates**
   - Keep dependencies updated
   - Monitor Render security advisories

---

## Monitoring & Maintenance

### View Logs
- Render Dashboard → Your Service → **"Logs"** tab
- Real-time logs for debugging

### Database Management
- Render Dashboard → Your Database → **"Connect"** tab
- Use `psql` or external tools (pgAdmin, DBeaver)

### Service Health
- Render automatically monitors service health
- Check **"Metrics"** tab for CPU, memory, and request stats

### Backup Database
- Render provides automatic backups for paid plans
- Free tier: Manual backups via `pg_dump`

---

## Local Testing Before Deployment

### Test Backend with Frontend (Integrated)

1. **Build the frontend:**
   ```bash
   # From project root
   npm install
   npm run build
   ```

2. **Set up backend environment:**
   ```bash
   cd server
   
   # Set environment variables
   export DATABASE_URL="postgres://user:pass@localhost:5432/school_store"
   export SITE_PASSWORD="test-password"
   export SESSION_SECRET="test-secret-$(openssl rand -hex 16)"
   export NODE_ENV="development"
   
   # Run migration
   npm run migrate
   
   # Start server
   npm start
   ```

3. **Test the application:**
   - Visit `http://localhost:4000` (should redirect to `/login`)
   - Enter the password you set in `SITE_PASSWORD`
   - After login, you should see the cashier interface
   - All API calls should work automatically

### Test Backend Only (API Testing)

If you want to test just the backend API:

```bash
cd server

# Set environment variables
export DATABASE_URL="postgres://user:pass@localhost:5432/school_store"
export SITE_PASSWORD="test-password"
export SESSION_SECRET="test-secret-$(openssl rand -hex 16)"
export NODE_ENV="development"

# Run migration
npm run migrate

# Start server
npm run dev
```

Then test API endpoints:
- Health check: `curl http://localhost:4000/api/ping`
- Login: `curl -X POST http://localhost:4000/login -d "password=test-password" -c cookies.txt`
- Products (with session): `curl http://localhost:4000/api/products -b cookies.txt`

---

## Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Support**: [render.com/support](https://render.com/support)
- **PostgreSQL Docs**: [postgresql.org/docs](https://www.postgresql.org/docs/)

---

## Quick Reference: Render URLs

After deployment, your service will be available at:

```
https://your-service-name.onrender.com
```

Your PostgreSQL database connection info is in:
```
Dashboard → PostgreSQL → Your Database → Connect
```

---

## Frontend Connection Quick Reference

### Integrated Setup (Frontend served by Backend)

**Steps:**
1. Build: `npm run build` (creates `build/` folder)
2. Commit `build/` folder to Git
3. Deploy backend on Render
4. Done! Frontend is automatically served

**Pros:**
- ✅ Single deployment
- ✅ No CORS configuration needed
- ✅ Simpler setup
- ✅ Session cookies work automatically

**Cons:**
- ❌ Frontend rebuild requires backend redeploy
- ❌ Can't use CDN for static assets

---

### Separate Frontend Service

**Steps:**
1. Build: `npm run build`
2. Deploy `build/` to Vercel/Netlify/Render
3. Set `VITE_API_URL` in frontend build environment
4. Set `CORS_ORIGIN` in backend environment variables

**Pros:**
- ✅ Independent deployments
- ✅ Can use CDN/edge network
- ✅ Better for large-scale apps

**Cons:**
- ❌ More complex setup
- ❌ Requires CORS configuration
- ❌ Need to manage two services

---

**Last Updated**: 2024
**Version**: 1.0
