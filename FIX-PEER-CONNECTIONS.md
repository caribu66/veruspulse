# Fix: Increase Verus Peer Connections

**Problem:** Stuck at 5 peers, sync is slow

**Root Cause:** Node not accepting incoming connections

---

## 🎯 Quick Fix (Recommended)

### Step 1: Create/Update verus.conf

```bash
# Create the config file
nano ~/.komodo/VRSC/verus.conf
```

Add these lines:

```conf
# Network Configuration
maxconnections=125          # Allow up to 125 connections
listen=1                    # Listen for incoming connections
server=1                    # Act as a server node

# Add reliable seed nodes (Official Verus Foundation nodes)
addnode=185.25.48.236:27485          # Verus Foundation seed 1
addnode=185.64.105.111:27485         # Verus Foundation seed 2
addnode=149.56.29.163:27485          # Verus Foundation seed 3
addnode=24.54.206.138:27485          # Verus Foundation seed 4
addnode=185.25.51.56:27485           # Verus Foundation seed 5
addnode=136.243.227.142:27485        # Verus Foundation seed 6

# Additional reliable community nodes
addnode=5.9.102.210:27485            # Community node DE
addnode=80.240.20.198:27485          # Community node NL
addnode=51.38.132.153:27485          # Community node FR
addnode=94.130.169.205:27485         # Community node DE
addnode=88.99.212.81:27485           # Community node DE
addnode=116.203.120.91:27485         # Community node DE
addnode=95.217.43.33:27485           # Community node FI
addnode=168.119.236.241:27485        # Community node DE
addnode=135.181.60.217:27485         # Community node FI
addnode=168.119.155.45:27485         # Community node DE

# RPC Settings (keep your existing ones)
rpcuser=verus
rpcpassword=1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=18843

# Optional: Increase memory usage for faster sync
dbcache=2048               # Use 2GB RAM for database cache
```

### Step 2: Open Firewall Port

```bash
# For UFW (Ubuntu)
sudo ufw allow 27485/tcp comment 'Verus P2P'

# For iptables
sudo iptables -A INPUT -p tcp --dport 27485 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# For firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=27485/tcp
sudo firewall-cmd --reload
```

### Step 3: Router Port Forwarding (If behind NAT)

Forward port **27485** (TCP) to your server's local IP address.

Example for common routers:

1. Log into router (usually 192.168.1.1 or 192.168.0.1)
2. Find "Port Forwarding" section
3. Add rule:
   - External Port: 27485
   - Internal Port: 27485
   - Protocol: TCP
   - Internal IP: Your server's local IP
   - Description: Verus P2P

### Step 4: Restart Verus Daemon

```bash
# Stop daemon
verus stop

# Wait 10 seconds
sleep 10

# Start daemon
verusd &

# Check it's running
verus getinfo
```

### Step 5: Verify

```bash
# Check connections after a few minutes
verus getconnectioncount

# Check if listening
netstat -tuln | grep 27485
# Should show: tcp  0  0.0.0.0:27485  LISTEN

# View peer info
verus getpeerinfo | jq '.[] | {addr, inbound}'
```

---

## 📊 Expected Results

**Before:**

- 5 connections (all outbound)
- Slow sync

**After:**

- 50-125 connections (mix of inbound/outbound)
- Much faster sync
- Contributing to network health

---

## 🚀 Quick One-Liner Setup

```bash
cat << 'EOF' > ~/.komodo/VRSC/verus.conf
maxconnections=125
listen=1
server=1
addnode=185.25.48.236:27485
addnode=185.64.105.111:27485
addnode=149.56.29.163:27485
addnode=24.54.206.138:27485
addnode=185.25.51.56:27485
addnode=136.243.227.142:27485
addnode=5.9.102.210:27485
addnode=80.240.20.198:27485
addnode=51.38.132.153:27485
addnode=94.130.169.205:27485
addnode=88.99.212.81:27485
addnode=116.203.120.91:27485
addnode=95.217.43.33:27485
addnode=168.119.236.241:27485
addnode=135.181.60.217:27485
addnode=168.119.155.45:27485
rpcuser=verus
rpcpassword=1CvFqDVqdPlznV4pksyoiyZ1eKhLoRKb
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=18843
dbcache=2048
EOF

# Open firewall (choose your system)
sudo ufw allow 27485/tcp  # Ubuntu/Debian
# OR
sudo firewall-cmd --permanent --add-port=27485/tcp && sudo firewall-cmd --reload  # CentOS

# Restart daemon
verus stop && sleep 10 && verusd &

# Check after 5 minutes
verus getconnectioncount
```

---

## 🔍 Troubleshooting

### Still Only 5 Connections?

**Check 1: Is daemon listening?**

```bash
netstat -tuln | grep 27485
```

Should show port 27485 in LISTEN state.

**Check 2: Is firewall blocking?**

```bash
sudo ufw status | grep 27485  # Ubuntu
sudo iptables -L -n | grep 27485  # Generic
```

**Check 3: Can others reach you?**

```bash
# From another machine, test:
telnet YOUR_PUBLIC_IP 27485
# Or
nc -zv YOUR_PUBLIC_IP 27485
```

**Check 4: Behind NAT?**

- Check if you have a public IP: `curl ifconfig.me`
- If it doesn't match `ip addr`, you're behind NAT
- **Must configure router port forwarding**

### VPS/Cloud Servers

Most VPS providers require security group rules:

- **AWS:** Edit EC2 Security Group, add inbound rule for port 27485
- **GCP:** Edit Firewall Rules, add rule for port 27485
- **Azure:** Edit Network Security Group, add inbound rule
- **DigitalOcean:** Edit Firewall, add rule for port 27485

---

## 💡 Performance Tips

### For Faster Sync:

```conf
# Add to verus.conf
dbcache=4096               # Use 4GB RAM (if available)
maxmempool=512             # Larger mempool
par=4                      # Parallel script verification (CPU cores)
```

### For Maximum Connections:

```conf
maxconnections=250         # Maximum allowed
timeout=60000              # Connection timeout
```

---

## 📈 Monitor Improvements

Use the super monitor script:

```bash
./scripts/monitor-verus-sync.sh
```

It will show:

- Connection count updates
- Sync rate improvements
- Network statistics

---

## ⚠️ Important Notes

1. **Port 27485 must be open** - This is the Verus mainnet P2P port
2. **Router forwarding required** if behind NAT
3. **Sync will be faster** with more peers (50-100 is ideal)
4. **You help the network** by accepting incoming connections
5. **Restart required** after config changes

---

## ✅ Success Checklist

- [ ] Created/updated verus.conf
- [ ] Added maxconnections=125
- [ ] Added listen=1 and server=1
- [ ] Added seed nodes
- [ ] Opened firewall port 27485
- [ ] Configured router (if needed)
- [ ] Restarted daemon
- [ ] Verified port is listening
- [ ] Waited 5-10 minutes
- [ ] Checked connection count (should be 20+)

---

**After following these steps, you should see 50-125 connections and much faster sync!**
