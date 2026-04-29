# Fabric Price Book Deployment

This app must run on an external web server if it needs to stay available while the office computer is turned off.

The simplest setup is Render Web Service plus Persistent Disk.

## Files

- `package.json`: runs the app with `npm start`
- `render.yaml`: Render blueprint settings
- `server.js`: stores `data.json` in `DATA_DIR` when that environment variable is set

## Render Settings

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Environment Variable: DATA_DIR=/var/data
Disk Mount Path: /var/data
Disk Size: 1GB
```

After deployment, use the `https://...onrender.com` URL from Render.

## Important

- Use a persistent disk, or saved fabric data can disappear after server restarts.
- The current app has no login screen. Anyone with the URL can open it.
- Add password protection before sharing the URL widely.
