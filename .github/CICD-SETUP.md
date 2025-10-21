# 🚀 CI/CD Pipeline Setup Guide

This document explains the GitHub Actions CI/CD pipeline for VerusPulse.

---

## 📋 Overview

Our CI/CD pipeline ensures code quality, security, and automated deployments through 9 comprehensive jobs:

1. **Lint** - ESLint and Prettier checks
2. **TypeCheck** - TypeScript compilation validation
3. **Test** - Jest unit tests with coverage
4. **Build** - Next.js production build
5. **E2E** - Playwright end-to-end tests
6. **Security** - npm audit and Snyk scanning
7. **Bundle Analysis** - Bundle size tracking
8. **Deploy Production** - Automatic deployment to main
9. **Deploy Staging** - Automatic deployment to develop

---

## ⚙️ Setup Instructions

### **1. Set Up Self-Hosted GitHub Runner** ⭐ REQUIRED

VerusPulse uses a **self-hosted runner** on your production server for secure RPC access.

#### **Quick Setup:**

```bash
cd /home/explorer/actions-runner
./setup-runner.sh
```

**Get your GitHub token:**

1. Go to: `https://github.com/YOUR_USERNAME/verus-dapp/settings/actions/runners/new`
2. Copy the registration token
3. Run the setup script above and paste the token

**Install as a service:**

```bash
cd /home/explorer/actions-runner
sudo ./svc.sh install explorer
sudo ./svc.sh start
sudo ./svc.sh status
```

---

### **2. GitHub Repository Secrets**

Configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

#### **Production Secrets** (Self-Hosted Runner)

```
PROD_VERUS_RPC_HOST=http://127.0.0.1:18843
PROD_VERUS_RPC_USER=verus
PROD_VERUS_RPC_PASSWORD=your_secure_password
DATABASE_URL=postgres://verus:verus@127.0.0.1:5432/verus
JWT_SECRET=your_jwt_secret_key_here
```

#### **Staging Secrets** (Optional)

```
STAGING_VERUS_RPC_HOST=http://127.0.0.1:18843
STAGING_VERUS_RPC_USER=verus
STAGING_VERUS_RPC_PASSWORD=your_secure_password
```

#### **Optional: Security Scanning**

```
SNYK_TOKEN=your_snyk_token  # For advanced security scanning
CODECOV_TOKEN=your_codecov_token  # For code coverage tracking
```

---

### **3. Enable Dependabot**

Dependabot is pre-configured in `.github/dependabot.yml` and will:

- ✅ Check for dependency updates weekly
- ✅ Create PRs automatically
- ✅ Group related updates
- ✅ Include security advisories

**To customize**: Edit `.github/dependabot.yml` and update:

- `reviewers` - Your GitHub username
- `assignees` - Your GitHub username

---

### **4. Branch Protection Rules**

**Recommended settings for `main` branch:**

1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

   **Required status checks:**
   - `Lint & Format Check`
   - `TypeScript Type Check`
   - `Unit Tests`
   - `Build Next.js App`
   - `Security Audit`

4. Enable:
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators

---

## 🔄 Workflow Triggers

### **Push to `main`**

```
Triggers: Lint → TypeCheck → Test → Build → Security → Deploy Production
```

### **Push to `develop`**

```
Triggers: Lint → TypeCheck → Test → Build → Security → Deploy Staging
```

### **Pull Request to `main` or `develop`**

```
Triggers: Lint → TypeCheck → Test → Build → E2E → Bundle Analysis
```

---

## 📊 Job Details

### **1. Lint & Format Check**

```bash
npm run lint
npm run format:check
```

**Validates**: Code style and formatting consistency

---

### **2. TypeScript Type Check**

```bash
npx tsc --noEmit
```

**Validates**: Type safety across the codebase

---

### **3. Unit Tests**

```bash
npm test -- --coverage
```

**Runs**: Jest tests with 70% coverage threshold  
**Uploads**: Coverage report to Codecov

---

### **4. Build Next.js App**

```bash
npm run build
```

**Validates**: Production build succeeds  
**Uploads**: Build artifacts for deployment

---

### **5. E2E Tests (Playwright)**

```bash
npm run test:e2e
```

**Runs**: Chromium-based E2E tests  
**Uploads**: Test reports and screenshots

---

### **6. Security Audit**

```bash
npm audit --audit-level=high
snyk test --severity-threshold=high
```

**Checks**: Security vulnerabilities in dependencies  
**Alert Level**: High severity only

---

### **7. Bundle Analysis**

```bash
npm run analyze
```

**Generates**: Bundle size report  
**Uploads**: Analysis for review

---

### **8. Deploy Production**

**Trigger**: Push to `main`  
**Target**: Production environment (www.veruspulse.com)  
**Method**: Self-hosted runner on production server
**Steps**:

1. Checkout latest code
2. Install dependencies
3. Create .env from GitHub secrets
4. Build Next.js app
5. Restart PM2 service
6. Health check

---

### **9. Deploy Staging**

**Trigger**: Push to `develop`  
**Target**: Staging environment  
**Method**: Self-hosted runner (port 3001)
**Steps**: Same as production with staging env vars

---

## 🎯 Local Testing

Test the CI pipeline locally before pushing:

```bash
# Run all checks
npm run lint
npm run format:check
npx tsc --noEmit
npm test
npm run build

# Optional: E2E tests
npm run test:e2e

# Optional: Security audit
npm audit
```

---

## 🔧 Customization

### **Change Node.js Version**

Edit `.github/workflows/ci-cd.yml`:

```yaml
env:
  NODE_VERSION: '20.x' # Change to your preferred version
```

### **Self-Hosted Runner Management**

**View runner status:**

```bash
sudo systemctl status actions.runner.YOUR_USERNAME-verus-dapp.veruspulse-production.service
```

**View runner logs:**

```bash
sudo journalctl -u actions.runner.YOUR_USERNAME-verus-dapp.veruspulse-production.service -f
```

**Restart runner:**

```bash
cd /home/explorer/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start
```

**Remove runner:**

```bash
cd /home/explorer/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token YOUR_REMOVAL_TOKEN
```

### **Add Environment-Specific Jobs**

Example: Add a job for backup before deployment:

```yaml
backup-database:
  name: Backup Database
  runs-on: self-hosted
  needs: [build]
  steps:
    - name: Backup PostgreSQL
      run: pg_dump verus > /backups/verus_$(date +%Y%m%d_%H%M%S).sql
```

---

## 📈 Monitoring

### **View Workflow Runs**

1. Go to repository → **Actions** tab
2. View current/past runs
3. Click any job for detailed logs

### **Status Badges**

Add to your README.md:

```markdown
[![CI/CD](https://github.com/your-username/verus-dapp/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/verus-dapp/actions/workflows/ci.yml)
```

### **Notifications**

Configure in: **Settings → Notifications → Actions**

Options:

- Email on workflow failures
- Slack integration
- Discord webhooks

---

## 🐛 Troubleshooting

### **Self-Hosted Runner Not Appearing**

```bash
# Check service status
sudo systemctl status actions.runner.*

# View logs
cd /home/explorer/actions-runner
tail -f _diag/Runner_*.log

# Restart service
sudo ./svc.sh stop && sudo ./svc.sh start
```

### **Runner is Offline**

1. Check if Verus daemon is running: `ps aux | grep verusd`
2. Verify network connectivity
3. Check runner logs for errors
4. Re-register runner if needed

### **Build Fails: "Cannot find module"**

```bash
# On the self-hosted runner
cd /home/explorer/verus-dapp
rm -rf node_modules
npm ci
```

### **Deployment Fails: "PM2 command not found"**

```bash
# Install PM2 globally
npm install -g pm2

# Or use npx
npx pm2 start npm --name "veruspulse" -- start
```

### **RPC Connection Error During Build**

```bash
# Verify Verus daemon is running
verus getinfo

# Check RPC credentials in secrets
# Ensure VERUS_RPC_HOST=http://127.0.0.1:18843 (localhost)
```

### **Security Audit Fails**

```bash
# Review audit report
npm audit

# Fix vulnerabilities
npm audit fix

# If issues persist, check SECURITY-AUDIT-REPORT.md
```

### **Deployment Fails: "Missing secrets"**

1. Verify all required secrets are configured
2. Check secret names match workflow file
3. Ensure secrets don't contain trailing spaces
4. Remember: Self-hosted runner uses localhost for RPC

---

## 🔒 Security Best Practices

✅ **Never commit secrets** - Use GitHub Secrets only  
✅ **Rotate tokens regularly** - Update every 90 days  
✅ **Use least privilege** - Grant minimum required permissions  
✅ **Enable 2FA** - Protect GitHub account  
✅ **Review Dependabot PRs** - Don't auto-merge blindly

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

---

## ✅ Checklist

Before going live, ensure:

- [ ] Self-hosted GitHub runner installed and running
- [ ] Runner registered with repository
- [ ] Runner service auto-starts on boot
- [ ] All GitHub secrets configured (localhost RPC URLs)
- [ ] Dependabot reviewers updated
- [ ] Branch protection rules enabled
- [ ] PM2 configured for app management
- [ ] Verus daemon running and synced
- [ ] PostgreSQL database accessible
- [ ] Status badges added to README
- [ ] Deployment targets tested
- [ ] Rollback procedure documented

## 🎯 Self-Hosted Runner Architecture

```
┌─────────────────────────────────────────────────────┐
│  GitHub Actions (Cloud)                             │
│  - Lint, TypeCheck, Test, Build (ubuntu-latest)    │
└─────────────────────────┬───────────────────────────┘
                          │
                          │ Triggers on push to main/develop
                          ↓
┌─────────────────────────────────────────────────────┐
│  Self-Hosted Runner (Your Server)                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  Deployment Job (runs-on: self-hosted)       │  │
│  │  - Checkout code                             │  │
│  │  - Install dependencies                      │  │
│  │  - Create .env with secrets                  │  │
│  │  - Build Next.js                             │  │
│  │  - Restart PM2                               │  │
│  └───────────────────────────────────────────────┘  │
│                          │                           │
│                          ↓ localhost                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  Verus RPC Daemon                            │  │
│  │  127.0.0.1:18843                             │  │
│  │  ✅ No external access needed                │  │
│  │  ✅ Secure localhost-only                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Next.js App (PM2)                           │  │
│  │  Port 3000 → Cloudflare → veruspulse.com    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Benefits:**

- ✅ RPC stays localhost-only (no security risks)
- ✅ No need to expose port 18843 to internet
- ✅ No VPN or tunneling required
- ✅ Faster deployments (no SSH overhead)
- ✅ Direct access to all server resources
- ✅ Same environment as production

---

**Last Updated**: October 20, 2025  
**Maintained By**: VerusPulse Team
