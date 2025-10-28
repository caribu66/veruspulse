#!/bin/bash
# Generate PWA icons from source SVG
# Requires: imagemagick

echo "🎨 Generating PWA icons..."

SOURCE_ICON="public/verus-icon-blue.svg"
OUTPUT_DIR="public/icons"

# Create output directory
mkdir -p $OUTPUT_DIR

# Icon sizes for different platforms
SIZES=(72 96 128 144 152 167 180 192 384 512)

echo "Converting SVG to PNG icons..."

for SIZE in "${SIZES[@]}"; do
  echo "  → ${SIZE}x${SIZE}..."
  convert -background none -resize ${SIZE}x${SIZE} \
    $SOURCE_ICON ${OUTPUT_DIR}/icon-${SIZE}x${SIZE}.png
done

echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated icons:"
ls -lh $OUTPUT_DIR

echo ""
echo "📝 Note: You may need to manually create splash screens"
echo "   Splash screen directory: public/splash/"
echo "   Recommended tool: https://www.appicon.co/ or https://appsco.pe/developer/splash-screens"

