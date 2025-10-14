# ZMQ Setup for Remote Verus Daemon

Your explorer is configured to use a **remote Verus daemon** at `192.168.86.89:18843`.

For ZMQ real-time updates to work, you need to configure ZMQ on the **remote machine**.

---

## ✅ What's Already Done

1. ✅ `zeromq` npm package installed locally
2. ✅ `VERUS_ZMQ_ADDRESS` configured in `.env.local`
3. ✅ Setup script created: `setup-remote-zmq.sh`

---

## 🔧 What You Need to Do

### Option 1: Automatic Setup (Recommended)

Run the setup script which will try to configure the remote daemon via SSH:

```bash
./setup-remote-zmq.sh
```

This will:
- Check connectivity to the remote machine
- Attempt to SSH and configure ZMQ automatically
- Start the daemon with ZMQ enabled

**Note**: You'll need SSH access to the remote machine.

---

### Option 2: Manual Setup

If you prefer to configure manually or SSH doesn't work:

#### 1. SSH into the remote daemon machine

```bash
ssh build@192.168.86.89
```

#### 2. Stop the Verus daemon

```bash
verus stop
sleep 10
```

#### 3. Backup the config

```bash
cp ~/.komodo/VRSC/VRSC.conf ~/.komodo/VRSC/VRSC.conf.backup
```

#### 4. Add ZMQ configuration

```bash
cat >> ~/.komodo/VRSC/VRSC.conf << 'EOF'

# ZMQ Real-Time Notifications
zmqpubhashblock=tcp://0.0.0.0:28332
zmqpubhashtx=tcp://0.0.0.0:28332
zmqpubrawblock=tcp://0.0.0.0:28332
zmqpubrawtx=tcp://0.0.0.0:28332
EOF
```

**Or** use the prepared config snippet:

```bash
# Copy zmq-config-snippet.conf to the remote machine
scp zmq-config-snippet.conf build@192.168.86.89:~/

# Then on remote machine:
cat ~/zmq-config-snippet.conf >> ~/.komodo/VRSC/VRSC.conf
```

#### 5. Start the daemon

```bash
verusd &
```

#### 6. Verify ZMQ is running

Wait a few seconds, then check:

```bash
netstat -an | grep 28332
```

You should see:
```
tcp   0   0 0.0.0.0:28332   0.0.0.0:*   LISTEN
```

#### 7. Check firewall (if needed)

If you have a firewall, allow port 28332:

```bash
# UFW
sudo ufw allow 28332/tcp

# Firewalld
sudo firewall-cmd --add-port=28332/tcp --permanent
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 28332 -j ACCEPT
```

---

## 🧪 Test the Connection

### From your local machine:

```bash
# 1. Check if port is reachable
nc -zv 192.168.86.89 28332

# 2. Restart your explorer
npm run dev

# 3. Check ZMQ status
curl http://localhost:3000/api/zmq/status
```

Expected response:
```json
{
  "success": true,
  "zmq": {
    "available": true,
    "connected": true,
    "status": "connected"
  },
  "indexer": {
    "running": true
  }
}
```

### Watch for real-time block updates:

In your explorer logs, you should see:
```
✅ Connected to Verus ZMQ: tcp://192.168.86.89:28332
🔔 New Block: 0000000000abcdef...
✅ Block indexed: 12345 (15 txs)
```

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to ZMQ"

**Possible causes:**

1. **ZMQ not configured on remote daemon**
   - Run the setup script or configure manually
   - Restart the daemon after configuration

2. **Port 28332 blocked by firewall**
   ```bash
   # On remote machine
   sudo ufw status
   sudo netstat -an | grep 28332
   ```

3. **Daemon not running**
   ```bash
   # On remote machine
   verus getinfo
   ```

4. **Wrong IP address**
   - Check `.env.local` has correct `VERUS_ZMQ_ADDRESS`
   - Should match your RPC host: `192.168.86.89`

### Issue: "ZMQ available but disconnected"

The explorer will automatically try to reconnect. Check:
- Is the daemon still running?
- Network connectivity
- Firewall rules

---

## 📊 What You'll Get

Once ZMQ is configured:

✅ **Real-time block notifications** (<1 second)  
✅ **90% less RPC calls** (better performance)  
✅ **Automatic block indexing**  
✅ **Instant UI updates**  
✅ **Lower daemon load**

---

## 🎯 Quick Commands

```bash
# Setup (automatic)
./setup-remote-zmq.sh

# Check remote daemon
ssh build@192.168.86.89 "verus getinfo && netstat -an | grep 28332"

# Test connection
nc -zv 192.168.86.89 28332

# Check explorer status
curl http://localhost:3000/api/zmq/status

# View logs
npm run dev | grep -E "ZMQ|Block|🔔"
```

---

## 📝 Configuration Summary

**Local Machine** (.env.local):
```env
VERUS_RPC_HOST=http://192.168.86.89:18843
VERUS_ZMQ_ADDRESS=tcp://192.168.86.89:28332
```

**Remote Machine** (VRSC.conf):
```conf
zmqpubhashblock=tcp://0.0.0.0:28332
zmqpubhashtx=tcp://0.0.0.0:28332
zmqpubrawblock=tcp://0.0.0.0:28332
zmqpubrawtx=tcp://0.0.0.0:28332
```

---

## ℹ️ Important Notes

1. **Using 0.0.0.0** allows connections from any IP on your network
2. **Port 28332** is the standard ZMQ port
3. **Daemon restart required** after config changes
4. **Firewall must allow** port 28332
5. **Optional feature** - explorer works without ZMQ

---

## 🆘 Need Help?

See the full guide: `ZMQ-SETUP-GUIDE.md`

Or check status at: http://localhost:3000/api/zmq/status

---

**Next Steps:**
1. Run `./setup-remote-zmq.sh` OR configure manually
2. Restart your explorer: `npm run dev`
3. Check status: `curl http://localhost:3000/api/zmq/status`
4. Watch for block notifications in logs

Good luck! 🚀



