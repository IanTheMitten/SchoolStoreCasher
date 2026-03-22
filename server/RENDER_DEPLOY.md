# Render Deployment Guide

## Quick Setup Steps

### 1. Create New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository

### 2. Configure Service Settings

**Name:** `school-store-backend` (or your preferred name)

**Region:** Choose closest to you

**Branch:** `main` (or your default branch)

**Root Directory:** (leave empty - use root)

**Runtime:** `Node`

**Build Command:**
```bash
npm run server:install
```

**Start Command:**
```bash
npm start
```

### 3. Environment Variables

Add these in the Render dashboard under "Environment":

```
NODE_ENV=production
PORT=10000
DB_FILE=/opt/render/project/src/server/db.json
CORS_ORIGIN=*
LOG_LEVEL=info
```

**Note:** 
- `PORT` is automatically set by Render, but you can override it
- `CORS_ORIGIN` should be set to your frontend URL once deployed (e.g., `https://your-frontend.onrender.com`)
- For now, `*` allows all origins (less secure but works for testing)

### 4. Deploy

Click "Create Web Service" and Render will:
1. Install dependencies
2. Run your start command
3. Provide a URL like: `https://school-store-backend.onrender.com`

### 5. Test Your Deployment

Once deployed, test the health endpoint:
```bash
curl https://your-service-name.onrender.com/api/ping
```

Should return: `{"ok":true,"timestamp":"..."}`

## Frontend Configuration

After backend is deployed, update your frontend to use the Render URL:

1. Create an API configuration file or update your API calls
2. Replace `http://localhost:4000` with your Render URL: `https://your-service-name.onrender.com`

## Important Notes

- **Free Tier:** Render spins down free services after 15 minutes of inactivity. First request may take 30-60 seconds to wake up.
- **Database:** The file-based database (`db.json`) persists on Render's filesystem, but consider upgrading to PostgreSQL for production.
- **HTTPS:** Render provides HTTPS automatically - no configuration needed.
- **Logs:** View logs in the Render dashboard under "Logs" tab.

## Troubleshooting

**Service won't start:**
- Check logs in Render dashboard
- Verify Root Directory is set to `server`
- Ensure Start Command is `npm start`

**CORS errors:**
- Update `CORS_ORIGIN` environment variable to match your frontend URL
- Or temporarily set to `*` for testing

**Database not persisting:**
- File-based DB should work, but for production consider PostgreSQL
- Check that `DB_FILE` path is correct

## Next Steps

1. Deploy backend to Render
2. Get your Render URL
3. Update frontend API calls to use Render URL
4. Deploy frontend (separate service or static site)
5. Update `CORS_ORIGIN` to match frontend URL

