# 🎯 Self-Hosted GitHub Runner - Next Steps

## ✅ What's Been Completed:

1. ✅ Downloaded and extracted GitHub Actions runner
2. ✅ Created setup script (`/home/explorer/actions-runner/setup-runner.sh`)
3. ✅ Created CI/CD workflow (`.github/workflows/ci-cd.yml`)
4. ✅ Updated documentation (`.github/CICD-SETUP.md`)
5. ✅ Fixed syntax error in production code (`latest-blocks/route.ts`)

---

## 🚀 What You Need to Do Now:

### Step 1: Get GitHub Registration Token (2 minutes)

1. Open your browser and go to:
   ```
   https://github.com/YOUR_USERNAME/verus-dapp/settings/actions/runners/new
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username

2. Select **"Linux"** as the operating system

3. You'll see a command like:
   ```bash
   ./config.sh --url https://github.com/YOUR_USERNAME/verus-dapp --token ABCDEFGH123456789...
   ```

4. **Copy only the token** (the long string after `--token`)

---

### Step 2: Configure the Runner (2 minutes)

Run the setup script:

```bash
cd /home/explorer/actions-runner
./setup-runner.sh
```

When prompted:
- **Paste the GitHub token** you copied
- **Enter your GitHub username** (e.g., `johndoe`)
- **Press Enter** to use default repository name (`verus-dapp`)

The script will automatically configure the runner.

---

### Step 3: Test the Runner (1 minute)

Before installing as a service, test it works:

```bash
cd /home/explorer/actions-runner
./run.sh
```

You should see:
```
✓ Connected to GitHub
✓ Listening for Jobs
```

**Keep it running** and in another terminal, check GitHub:
1. Go to: `https://github.com/YOUR_USERNAME/verus-dapp/settings/actions/runners`
2. You should see **"veruspulse-production"** with a green dot (Idle)

Press `Ctrl+C` to stop.

---

### Step 4: Install as System Service (1 minute)

This makes it run automatically on boot:

```bash
cd /home/explorer/actions-runner
sudo ./svc.sh install explorer
sudo ./svc.sh start
sudo ./svc.sh status
```

Expected output:
```
● actions.runner...service - GitHub Actions Runner
   Active: active (running)
```

---

### Step 5: Configure GitHub Secrets (5 minutes)

Go to your repository secrets:
```
https://github.com/YOUR_USERNAME/verus-dapp/settings/secrets/actions
```

Click **"New repository secret"** for each:

#### Secret 1: PROD_VERUS_RPC_HOST
```
Name: PROD_VERUS_RPC_HOST
Value: http://127.0.0.1:18843
```

#### Secret 2: PROD_VERUS_RPC_USER
```
Name: PROD_VERUS_RPC_USER
Value: verus
```

#### Secret 3: PROD_VERUS_RPC_PASSWORD
```
Name: PROD_VERUS_RPC_PASSWORD
Value: 1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb
```

#### Secret 4: DATABASE_URL
```
Name: DATABASE_URL
Value: postgres://verus:verus@127.0.0.1:5432/verus
```

#### Secret 5: JWT_SECRET
First generate a secure secret:
```bash
openssl rand -base64 32
```

Then add it:
```
Name: JWT_SECRET
Value: <paste the generated string>
```

---

### Step 6: Test Full CI/CD Pipeline (5 minutes)

1. **Push the new CI/CD files to GitHub:**

```bash
cd /home/explorer/verus-dapp
git add .github/workflows/ci-cd.yml
git add .github/CICD-SETUP.md
git add app/api/latest-blocks/route.ts
git commit -m "Add self-hosted CI/CD pipeline"
git push origin main
```

2. **Watch the deployment:**
   - Go to: `https://github.com/YOUR_USERNAME/verus-dapp/actions`
   - You should see a new workflow run
   - All jobs should complete successfully ✅
   - The deployment job runs on your server

3. **Verify the site:**
   - Visit: https://www.veruspulse.com
   - Should be working (500 error should be fixed!)

---

## 🎉 Success Indicators:

✅ **Runner shows as "Idle" in GitHub**  
✅ **Push to main triggers CI/CD**  
✅ **Deployment completes successfully**  
✅ **Website updates automatically**  
✅ **PM2 restarts the service**  
✅ **No RPC connection issues**

---

## 📊 Your Complete Architecture:

```
Internet
  ↓
Cloudflare CDN (78.150.237.253)
  ↓
Next.js :3000 (PM2)
  ↓ localhost
Verus RPC :18843 ← GitHub Actions Runner (self-hosted)
  ↓                              ↑
PostgreSQL :5432                 │
                                 │
                         GitHub.com (triggers)
```

**Security:**
- ✅ RPC only accessible via localhost
- ✅ No external ports exposed
- ✅ GitHub runner has full server access
- ✅ Cloudflare protects frontend

---

## 🔧 Useful Commands:

### Check runner status:
```bash
sudo systemctl status actions.runner.*
```

### View runner logs:
```bash
tail -f /home/explorer/actions-runner/_diag/Runner_*.log
```

### Restart runner:
```bash
cd /home/explorer/actions-runner
sudo ./svc.sh restart
```

### Check Verus daemon:
```bash
verus getinfo
```

### Check PM2 status:
```bash
pm2 list
pm2 logs veruspulse
```

### Monitor deployments:
```bash
# In GitHub Actions tab
# Or watch PM2 logs during deployment
pm2 logs veruspulse --lines 100
```

---

## 🐛 If Something Goes Wrong:

### Runner not showing in GitHub:
1. Check service: `sudo systemctl status actions.runner.*`
2. Check logs: `tail -f /home/explorer/actions-runner/_diag/Runner_*.log`
3. Restart: `cd /home/explorer/actions-runner && sudo ./svc.sh restart`

### Deployment fails:
1. Check Verus is running: `verus getinfo`
2. Check PM2: `pm2 list`
3. Check secrets are configured in GitHub
4. View workflow logs in GitHub Actions tab

### Website still shows 500:
1. Check PM2 logs: `pm2 logs veruspulse --lines 50`
2. Rebuild manually: `cd /home/explorer/verus-dapp && npm run build`
3. Restart PM2: `pm2 restart veruspulse`

---

## 📚 Documentation:

- **Setup Guide**: `/home/explorer/actions-runner/README.md`
- **CI/CD Details**: `.github/CICD-SETUP.md`
- **Workflow File**: `.github/workflows/ci-cd.yml`

---

## ⏱️ Estimated Time:

- **Initial setup**: 10-15 minutes
- **Future deployments**: Automatic (30-60 seconds per push)

---

**Ready to start?** Begin with Step 1 above! 🚀

Once you've completed all 6 steps, your CI/CD pipeline will be fully operational, and every push to `main` will automatically deploy to www.veruspulse.com!

