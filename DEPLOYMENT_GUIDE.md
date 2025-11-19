# Fluxo IDE Deployment Guide - Render

This guide walks you through deploying your Fluxo IDE application to Render, a modern cloud platform with free tier options.

## Prerequisites

- GitHub account
- Render account (sign up at [render.com](https://render.com))
- Your Fluxo IDE code pushed to a GitHub repository

## Step 1: Prepare Your Application

Your Fluxo IDE application is already configured for deployment with:
- ✅ `PORT` environment variable support in Express server
- ✅ Build and start scripts in `package.json`
- ✅ Production-ready Express + Vite setup

## Step 2: Create a New Web Service on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com)

2. Click **"New +"** in the top navigation, then select **"Web Service"**

3. Connect your GitHub repository:
   - Click **"Connect a Git repository"**
   - Authorize Render to access your repositories
   - Select your Fluxo IDE repository
   - Click **"Connect"**

## Step 3: Configure Your Service

Fill in the deployment settings:

### Basic Settings

| Setting | Value | Notes |
|---------|-------|-------|
| **Name** | `fluxo-ide` | Or your preferred name |
| **Region** | Oregon (US West) | Choose closest to your users |
| **Branch** | `main` | Or your default branch |
| **Root Directory** | (leave blank) | Unless app is in subdirectory |
| **Environment** | `Node` | Auto-detected |

### Build & Deploy Settings

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |

These commands are defined in your `package.json`:
- **Build**: Compiles frontend (Vite) and backend (esbuild)
- **Start**: Runs the production server

## Step 4: Environment Variables (Optional)

If you plan to add databases or external services later, you can add environment variables:

1. Scroll to the **"Environment"** section
2. Click **"Add Environment Variable"**
3. Add any required variables

Example variables you might need:
```
NODE_ENV=production
DATABASE_URL=<your-database-url-if-needed>
```

**Note**: The `PORT` variable is automatically set by Render, don't add it manually.

## Step 5: Select Plan and Deploy

1. **Select the Free plan**:
   - 750 hours/month (enough for one service running 24/7)
   - Automatic SSL
   - Global CDN
   - **Important**: Free services spin down after 15 minutes of inactivity

2. Enable **"Auto-Deploy"**:
   - This will automatically redeploy when you push to your GitHub branch

3. Click **"Create Web Service"**

## Step 6: Monitor Deployment

Render will now:
1. Clone your repository
2. Run `npm install && npm run build`
3. Start your app with `npm run start`
4. Assign you a URL like: `https://fluxo-ide.onrender.com`

You can watch the build process in real-time in the **"Logs"** tab.

## Deployment Timeline

- **First deployment**: ~5-10 minutes
- **Subsequent deployments**: ~3-5 minutes
- **Cold start** (after sleep): ~30-60 seconds

## Post-Deployment

### Accessing Your Application

Once deployed, your app will be available at:
```
https://your-service-name.onrender.com
```

### Custom Domain (Optional)

To use a custom domain:
1. Go to your service's **"Settings"** tab
2. Scroll to **"Custom Domain"**
3. Click **"Add Custom Domain"**
4. Follow the DNS configuration instructions

## Understanding Free Tier Limitations

### Spin-Down Behavior

Free Render services automatically spin down after 15 minutes of inactivity to conserve resources:
- **Effect**: First request after inactivity takes 30-60 seconds
- **Solution**: Upgrade to paid plan ($7/month) for 24/7 availability
- **Workaround**: Use a service like UptimeRobot to ping your app every 10 minutes

### Resource Limits

Free tier includes:
- 512 MB RAM
- 0.1 CPU (shared)
- 750 hours/month total across all free services

## Troubleshooting

### Build Fails

**Check the logs** in the Render dashboard. Common issues:

1. **Node.js Version Mismatch**:
   - Render may use a different Node version than expected
   - Add a `.node-version` file or `.nvmrc` file to specify Node 20.x
   - Or set environment variable: `NODE_VERSION=20`

2. **Missing dependencies**:
   ```bash
   # Make sure all dependencies are in package.json
   npm install <missing-package> --save
   # If build still fails, try clearing cache in Render:
   # Dashboard > Settings > Clear Build Cache & Deploy
   ```

3. **TypeScript errors**:
   - Fix type errors locally first
   - Test build with: `npm run build`
   - Common issues:
     - Missing type definitions for packages
     - Outdated TypeScript version
     - Type errors in server/fluxo-interpreter.ts or routes

4. **Vite build issues**:
   - Ensure `vite.config.ts` is correctly configured
   - Check that `client/` directory exists with proper structure
   - Verify `dist/public` directory is created during build
   
5. **esbuild errors**:
   - The build uses esbuild to compile the server
   - Check `server/index.ts` has no syntax errors
   - Ensure all imports use `.js` extension for ES modules

6. **Port configuration**:
   - Ensure server uses `process.env.PORT || 5000`
   - Check `server/index.ts` for correct port binding

7. **Build command fix** (if default doesn't work):
   Try updating build command to:
   ```bash
   npm ci && npm run build
   ```
   (`npm ci` is more reliable than `npm install` in CI/CD)

### App Crashes on Start

Check the **"Logs"** tab for error messages. Common causes:

1. **Wrong start command**:
   - Should be: `npm run start`
   - Which runs: `node dist/index.js`

2. **Missing built files**:
   - Ensure build command completed successfully
   - Check that `dist/` directory was created

### Can't Access Application

1. **Check deployment status**: Should show "Live" with green dot
2. **View logs**: Look for "serving on port" message
3. **Try health check**: Add `/api/workspace` to your URL
4. **Clear browser cache**: Hard refresh (Ctrl/Cmd + Shift + R)

## Automatic Deployments

Once connected, Render will automatically deploy when you:
1. Push commits to your connected branch
2. Merge pull requests
3. Force a manual deploy from the dashboard

To disable auto-deploy:
- Go to **"Settings"** → uncheck **"Auto-Deploy"**

## Monitoring Your Application

### View Logs

Real-time logs are available in the **"Logs"** tab:
```
2024-11-19 14:37:36 PM [express] serving on port 10000
2024-11-19 14:37:42 PM [express] GET /api/workspace 200 in 31ms
```

### Metrics

The **"Metrics"** tab shows:
- CPU usage
- Memory usage  
- Request volume
- Response times

### Events

The **"Events"** tab tracks:
- Deployments
- Restarts
- Errors

## Database Setup (Optional)

If you need to add PostgreSQL later:

1. Click **"New +" → "PostgreSQL"**
2. Name your database
3. Select **Free** plan (256 MB, 90-day expiry)
4. Click **"Create Database"**
5. Copy the **Internal Database URL**
6. Add to your web service as `DATABASE_URL` environment variable

## Upgrading

To avoid spin-down and get more resources:

### Starter Plan ($7/month)
- Always on (no spin-down)
- 512 MB RAM
- More CPU allocation

### Standard Plan ($25/month)
- 2 GB RAM
- Priority support
- Better performance

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [Render Status](https://status.render.com)
- [Render Community](https://community.render.com)

## Summary Checklist

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Connect GitHub repository
- [ ] Configure build/start commands
- [ ] Select free plan
- [ ] Enable auto-deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (~5-10 min)
- [ ] Test your live application
- [ ] (Optional) Set up custom domain
- [ ] (Optional) Configure database

Your Fluxo IDE is now deployed and accessible worldwide! 🎉
