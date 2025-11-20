# Deploy Fluxo IDE to Render

This guide explains how to deploy your Fluxo IDE to Render as a web service.

## Prerequisites

- A [Render](https://render.com) account
- Your Fluxo IDE code pushed to a Git repository (GitHub, GitLab, etc.)

## Setup Instructions

### 1. Create a New Web Service

1. Go to your Render dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository

### 2. Configure Build Settings

Use these settings in Render:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run start
```

**Environment:**
- **Node Version**: 20 or higher

### 3. Environment Variables

Add these environment variables in Render's dashboard:

| Name | Value | Description |
|------|-------|-------------|
| `NODE_ENV` | `production` | Set to production mode |
| `PORT` | `5000` | Port the server listens on (Render auto-sets this) |

### 4. Advanced Settings (Optional)

If you need a database:

- **Health Check Path**: `/` (optional)
- **Auto-Deploy**: Enable for automatic deployments on git push

## Important Notes

### Replit-Specific Dependencies

The project includes Replit-specific Vite plugins that are only used in development mode within Replit. These have been made **optional** in `vite.config.ts`:

- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`

These plugins will be **automatically skipped** when building on Render since the `REPL_ID` environment variable won't be present.

### Build Process

When you deploy, Render will:

1. Run `npm install` to install dependencies
2. Run `npm run build` which:
   - Builds the frontend with Vite
   - Bundles the backend with esbuild
3. Run `npm run start` to serve the application

### Port Configuration

The app is configured to listen on port 5000 by default. Render will automatically set the `PORT` environment variable, which the Express server will use.

## Troubleshooting

### Build Fails with "Cannot find module @tailwindcss/typography"

**Fixed!** This was caused by two issues:

1. **Version conflict** - The `@tailwindcss/vite` package (v4) was conflicting with `tailwindcss` (v3)
2. **Wrong dependency location** - `@tailwindcss/typography` was in `devDependencies` instead of `dependencies`

**Solutions Applied:**
1. Removed `@tailwindcss/vite` from dependencies (using Tailwind CSS v3 only)
2. Moved `@tailwindcss/typography` from `devDependencies` to `dependencies`

Render's build process needs all build-time dependencies in the `dependencies` section, not `devDependencies`.

### Build Fails with "Cannot find module" for @replit packages

If you see errors about missing `@replit/*` packages:

1. Make sure you're using the updated `vite.config.ts` from this project
2. The Replit plugins should be conditionally loaded only when `REPL_ID` is set
3. If the error persists, you can remove the Replit packages from `package.json` dependencies

### Application Won't Start

Check the logs in Render dashboard:

1. Go to your service
2. Click **"Logs"** tab
3. Look for error messages

Common issues:
- Missing environment variables
- Port conflicts (make sure you're using `process.env.PORT || 5000`)
- Database connection issues (if using a database)

### Database Setup (If Needed)

If your Fluxo IDE needs persistent storage:

1. Create a PostgreSQL database in Render
2. Add the database URL to your environment variables
3. Update your storage implementation to use the database

## Testing Locally

Before deploying, test the production build locally:

```bash
# Build the project
npm run build

# Start in production mode
npm run start
```

Visit `http://localhost:5000` to test.

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)

## Support

If you encounter issues specific to Fluxo IDE deployment, check:
1. The build logs in Render dashboard
2. The application logs after deployment
3. Ensure all environment variables are set correctly
