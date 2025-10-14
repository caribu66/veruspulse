#!/bin/bash

echo "🔍 Finding Daemon Server IP Address"
echo "===================================="
echo ""

echo "📡 Network Interfaces:"
ip addr show | grep "inet " | grep -v 127.0.0.1

echo ""
echo "🌐 Default Route:"
ip route | grep default

echo ""
echo "🔗 Active Connections:"
ss -tuln | grep :18843 || echo "Port 18843 not in use yet"

echo ""
echo "💡 Your IP address should be one of the above (usually 192.168.x.x or 10.x.x.x)"
echo "   Look for the IP that matches your router's network range"

