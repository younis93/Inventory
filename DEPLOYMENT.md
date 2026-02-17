# Firebase Deployment Guide

This guide explains how to manually deploy the application to Firebase Hosting.

## Prerequisites
- Node.js and npm installed.
- Firebase CLI installed (`npm install -g firebase-tools`).
- A Firebase account with access to the `test-inventory-stoe` project.

## Steps

### 1. Login to Firebase
Open your terminal and run:
```bash
firebase login
```

### 2. Build the Application
Generate the production build by running:
```bash
npm run build
```
This creates a `dist` folder in your project root.

### 3. Deploy to Firebase
Deploy only the static hosting files:
```bash
firebase deploy --only hosting
```

### 4. Verify
Once deployment is complete, visit:
[https://test-inventory-stoe.web.app](https://test-inventory-stoe.web.app)

---

## Troubleshooting

### Authentication Issues
If deployment fails with an authentication error, try:
```bash
firebase login --reauth
```

### Build Errors
If `npm run build` fails, ensure all dependencies are installed:
```bash
npm install
```
