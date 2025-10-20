# Installing k6 for Load Testing

## Quick Installation (Linux/Ubuntu)

### Method 1: Using apt (Recommended)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Method 2: Download Binary Directly (No sudo required)
```bash
# Download k6 binary
cd /tmp
curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -o k6.tar.gz

# Extract and move to local bin
tar -xzf k6.tar.gz
mkdir -p ~/bin
mv k6-v0.48.0-linux-amd64/k6 ~/bin/
chmod +x ~/bin/k6

# Add to PATH (add this to ~/.bashrc to make permanent)
export PATH="$HOME/bin:$PATH"

# Verify installation
k6 version
```

### Method 3: Using Docker (No installation required)
```bash
# Pull k6 Docker image
docker pull grafana/k6:latest

# Run tests using Docker
docker run --network="host" -v $PWD:/scripts grafana/k6 run /scripts/load-tests/k6-load-test.js
```

## Verify Installation

After installation, verify k6 is working:
```bash
k6 version
```

You should see output like:
```
k6 v0.48.0 (go1.21.5, linux/amd64)
```

## Next Steps

Once k6 is installed, run the load tests:

```bash
# Standard load test (100 users)
./load-tests/run-load-tests.sh load

# Or run directly with k6
k6 run load-tests/k6-load-test.js
```

## Troubleshooting

### Permission Denied
If you see "permission denied" when running the script:
```bash
chmod +x load-tests/run-load-tests.sh
```

### Command Not Found
If k6 is not found after installation:
```bash
# Add to PATH
export PATH="$HOME/bin:$PATH"

# Or use full path
~/bin/k6 run load-tests/k6-load-test.js
```

### Docker Alternative
If you can't install k6 directly, use Docker:
```bash
docker run --rm -v $PWD:/app -w /app --network="host" grafana/k6 run load-tests/k6-load-test.js
```

