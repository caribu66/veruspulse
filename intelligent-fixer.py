#!/usr/bin/env python3
"""
Intelligent TypeScript error fixer
"""

import re

def fix_file(filepath, fixes):
    """Apply fixes to a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        for pattern, replacement in fixes:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
    return False

# Define fixes for each file
file_fixes = {
    'components/featured-verusids-carousel.tsx': [
        (r'const currentID = featuredIDs\[currentIndex\];',
         'const currentID = featuredIDs[currentIndex];\n\n  if (!currentID) return null;'),
    ],
    'components/charts/heatmap-calendar.tsx': [
        (r"toLocaleDateString\('en-US'", "toLocaleDateString('en-US' as string"),
        (r"const formattedDate = date;", "const formattedDate = date || 'Unknown';"),
    ],
    'components/interactive-charts.tsx': [
        (r'miningStats\.difficulty', 'miningStats?.difficulty'),
        (r'miningStats\.networkHashrate', 'miningStats?.networkHashrate'),
        (r'stakingStats\.apy', 'stakingStats?.apy'),
    ],
    'components/moving-price-ticker.tsx': [
        (r"useEffect\(\(\) => \{", "useEffect(() => {\n      if (!currentPrice) return;"),
        (r'currentPrice\.price', 'currentPrice?.price ?? 0'),
    ],
    'components/pull-to-refresh.tsx': [
        (r'containerRef\.current\.scrollTop', 'containerRef.current?.scrollTop ?? 0'),
    ],
    'components/quick-stats-ticker.tsx': [
        (r'networkStats\.connections', 'networkStats?.connections'),
        (r'stakingStats\.networkWeight', 'stakingStats?.networkWeight'),
    ],
    'components/ui/breadcrumb.tsx': [
        (r'firstItem\.label', 'firstItem?.label'),
        (r'firstItem\.href', 'firstItem?.href'),
    ],
    'components/i18n-error-boundary.tsx': [
        (r'override componentDidCatch', 'componentDidCatch'),
    ],
    'components/blocks-explorer.tsx': [
        (r'calculateTemporalMetrics\(\s*block,', 'calculateTemporalMetrics(\n                  block!,'),
    ],
    'lib/cache/cache-utils.ts': [
        (r'result\?\.value\.headers', 'result?.value?.headers'),
    ],
    'lib/database/secure-db-client.ts': [
        (r'this\.pool\.query', 'this.pool!.query'),
    ],
    'lib/hooks/use-touch-gestures.ts': [
        (r'event\.touches\[0\]\.clientX', 'event.touches[0]?.clientX ?? 0'),
        (r'event\.touches\[0\]\.clientY', 'event.touches[0]?.clientY ?? 0'),
    ],
    'lib/i18n/utils.ts': [
        (r"code\.split\('-'\)\[0\]", "code?.split('-')[0] || code || 'en'"),
        (r'for \(const \{ code \} of languages\)', 'for (const { code } of languages) {\n    if (!code) continue;'),
    ],
}

print("Applying intelligent fixes...")
for filepath, fixes in file_fixes.items():
    if fix_file(filepath, fixes):
        print(f"✓ Fixed {filepath}")

print("\nDone!")

