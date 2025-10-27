# 🔄 VerusPulse Continuous Scanning - Complete Setup Guide

## ✅ **Setup Complete!**

Your VerusPulse blockchain explorer now has **continuous scanning** set up with cron jobs. Here's what's running:

## 📅 **Cron Schedule**

### **Every 5 Minutes** ⏰

```bash
*/5 * * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh start
```

- **Checks**: Staking scanner and VerusID discovery scanner
- **Action**: Restarts any stopped scanners
- **Purpose**: Ensures continuous data collection

### **Every Hour** 🔄

```bash
0 * * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh maintenance
```

- **Checks**: All scanners and infrastructure
- **Action**: Full maintenance routine
- **Purpose**: System health and log cleanup

### **Every 6 Hours** 💰

```bash
0 */6 * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh utxo
```

- **Action**: Updates UTXO data for all VerusIDs
- **Purpose**: Real-time balance and staking eligibility tracking

## 🔍 **Monitoring Your Scanners**

### **Real-time Monitoring**

```bash
# Watch cron activity
tail -f /home/explorer/verus-dapp/logs/cron.log

# Check scanner status
/home/explorer/verus-dapp/scripts/scanner-manager.sh status

# Monitor staking scanner specifically
tail -f /home/explorer/verus-dapp/logs/staking-scanner-cron.log
```

### **Database Growth Monitoring**

```bash
# Check staking rewards count
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT
  COUNT(*) as total_stakes,
  COUNT(DISTINCT address) as unique_addresses,
  MAX(block_height) as latest_block
FROM staking_rewards;
"

# Check VerusID count
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "
SELECT COUNT(*) as total_verusids FROM identities;
"
```

## 🚀 **What Your Scanners Are Collecting**

### **1. Staking Rewards Scanner** 🏆

- **Data**: All VerusID staking rewards from PoS blocks
- **Database**: `staking_rewards` table
- **Rate**: ~50-100 new stakes per day
- **Value**: Powers trending VerusIDs and leaderboards

### **2. VerusID Discovery Scanner** 🆔

- **Data**: New VerusIDs created on the blockchain
- **Database**: `identities` table
- **Rate**: ~10-50 new VerusIDs per day
- **Value**: Expands coverage for staking analysis

### **3. UTXO Scanner** 💰

- **Data**: Current UTXO states for all addresses
- **Database**: `utxos` table
- **Frequency**: Every 6 hours
- **Value**: Real-time balance tracking

## 📊 **Expected Data Growth**

### **Daily Growth**

- **Staking Rewards**: +50-100 records
- **VerusIDs**: +10-50 records
- **UTXO Updates**: ~1000+ records
- **Storage**: ~10-50MB per day

### **Weekly Growth**

- **Staking Rewards**: +350-700 records
- **VerusIDs**: +70-350 records
- **Storage**: ~100-300MB per week

## 🛠️ **Management Commands**

### **Scanner Control**

```bash
# Check status
/home/explorer/verus-dapp/scripts/scanner-manager.sh status

# Start all scanners
/home/explorer/verus-dapp/scripts/scanner-manager.sh start

# Run maintenance
/home/explorer/verus-dapp/scripts/scanner-manager.sh maintenance

# Restart staking scanner
/home/explorer/verus-dapp/scripts/scanner-manager.sh restart-staking

# Restart VerusID discovery
/home/explorer/verus-dapp/scripts/scanner-manager.sh restart-verusid
```

### **Cron Management**

```bash
# View all cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Remove all cron jobs (if needed)
crontab -r
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **RPC Connection Failed**

```bash
# Check if Verus daemon is running
curl -X POST http://127.0.0.1:18843 \
  -H "Content-Type: application/json" \
  -d '{"method":"getblockchaininfo","params":[],"id":1}'

# Restart Verus daemon if needed
sudo systemctl restart verusd
```

#### **Scanner Not Starting**

```bash
# Check logs for errors
tail -50 /home/explorer/verus-dapp/logs/cron.log

# Manually start scanner
/home/explorer/verus-dapp/scripts/scanner-manager.sh start
```

#### **Database Connection Issues**

```bash
# Test database connection
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -c "SELECT 1;"

# Check database status
npm run db:health
```

### **Performance Monitoring**

```bash
# Check system resources
htop

# Monitor disk usage
df -h

# Check memory usage
free -h
```

## 📈 **Optimization Tips**

### **Adjust Cron Frequency**

```bash
# More aggressive (every 2 minutes)
*/2 * * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh start

# More conservative (every 10 minutes)
*/10 * * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh start
```

### **Log Rotation**

```bash
# Add to crontab for log rotation
0 0 * * * find /home/explorer/verus-dapp/logs -name "*.log" -mtime +7 -delete
```

## 🎯 **Success Indicators**

### **Healthy System**

- ✅ Cron jobs running every 5 minutes
- ✅ Staking scanner processing new blocks
- ✅ VerusID discovery finding new identities
- ✅ Database growing with new data
- ✅ No error messages in logs

### **Data Quality**

- ✅ Staking rewards match blockchain data
- ✅ VerusID coverage expanding
- ✅ UTXO data current and accurate
- ✅ Trending calculations working

## 🚨 **Alerts and Notifications**

### **Set Up Monitoring**

```bash
# Add to crontab for email alerts (requires mail setup)
*/5 * * * * /home/explorer/verus-dapp/scripts/scanner-manager.sh start || echo "Scanner failed at $(date)" | mail -s "VerusPulse Alert" admin@yourdomain.com
```

### **Log Monitoring**

```bash
# Monitor for errors
tail -f /home/explorer/verus-dapp/logs/cron.log | grep -i error

# Monitor for successful scans
tail -f /home/explorer/verus-dapp/logs/cron.log | grep -i "scanner started"
```

## 🎉 **You're All Set!**

Your VerusPulse blockchain explorer now has:

- ✅ **Continuous staking data collection**
- ✅ **Automatic VerusID discovery**
- ✅ **Real-time UTXO tracking**
- ✅ **Automatic restart on failures**
- ✅ **Comprehensive monitoring**
- ✅ **Self-healing system**

**Your server will now continuously scan the Verus blockchain and populate your database with valuable data for your explorer!** 🚀

---

**Next Steps:**

1. Monitor the logs for the first few hours
2. Check database growth after 24 hours
3. Verify trending data is updating
4. Enjoy your continuously updated blockchain explorer!
