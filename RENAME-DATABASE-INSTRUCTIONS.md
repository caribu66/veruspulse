# 📊 Database Rename Instructions

I've updated all your configuration files to use `pos_db`. Now you just need to rename the actual database with this command:

---

## 🔧 Run This Command (Requires Your Password):

```bash
sudo -u postgres psql -c "ALTER DATABASE verus_utxo_db RENAME TO pos_db;"
```

**Enter your sudo password when prompted.**

---

## ✅ What I've Already Updated:

1. ✅ `.env` → `DATABASE_URL=postgres://verus:verus@127.0.0.1:5432/pos_db`
2. ✅ `ecosystem.config.js` → PM2 config updated
3. ⏳ Scanners use `$DATABASE_URL` from .env (auto-updated)

---

## After Running the Command:

```bash
# Verify rename worked
sudo -u postgres psql -c "\l" | grep pos_db

# Start services
pm2 start veruspulse

# Test database connection
curl http://localhost:3000/api/health | jq .
```

---

## ⚠️ If You Don't Have Sudo Access:

Alternative: Keep the database name as `verus_utxo_db` and I'll revert the changes.

Let me know!

