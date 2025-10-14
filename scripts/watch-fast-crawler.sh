#!/bin/bash
# Watch the fast crawler progress in real-time

echo "Watching fast crawler progress..."
echo "Press Ctrl+C to stop watching (crawler will continue running)"
echo ""

watch -n 5 'tail -25 /tmp/fast-crawler.log'

