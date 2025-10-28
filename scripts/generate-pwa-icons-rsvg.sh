#!/bin/bash
# Generate PWA icons from source SVG using rsvg-convert
# Requires: librsvg2-bin

echo "🎨 Generating PWA icons with rsvg-convert..."

SOURCE_ICON="public/verus-icon-blue.svg"
OUTPUT_DIR="public/icons"

# Create output directory
mkdir -p $OUTPUT_DIR

# Icon sizes for different platforms
SIZES=(72 96 128 144 152 167 180 192 384 512)

echo "Converting SVG to PNG icons..."

for SIZE in "${SIZES[@]}"; do
  echo "  → ${SIZE}x${SIZE}..."
  rsvg-convert -w ${SIZE} -h ${SIZE} \
    $SOURCE_ICON -o ${OUTPUT_DIR}/icon-${SIZE}x${SIZE}.png
done

echo ""
echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated icons:"
ls -lh $OUTPUT_DIR

echo ""
echo "📊 File sizes (should be larger than before):"
du -h $OUTPUT_DIR/*.png

