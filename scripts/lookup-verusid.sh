#!/bin/bash
# Lookup VerusID and get I-address

if [ -z "$1" ]; then
    echo "Usage: ./lookup-verusid.sh <verusid_name>"
    echo ""
    echo "Examples:"
    echo "  ./lookup-verusid.sh joanna"
    echo "  ./lookup-verusid.sh farinole"
    echo ""
    exit 1
fi

NAME="$1"

echo "===================================================="
echo "  Looking up VerusID: $NAME"
echo "===================================================="
echo ""

# Try the API first
echo "Method 1: Via Next.js API..."
RESULT=$(curl -s -X POST http://localhost:3000/api/verusid-lookup \
    -H "Content-Type: application/json" \
    -d "{\"identity\": \"$NAME\"}" | jq -r '.verusID.identity.identityaddress // empty')

if [ -n "$RESULT" ]; then
    echo "✅ Found via API!"
    echo ""
    echo "   Name: $NAME"
    echo "   I-address: $RESULT"
    echo ""
    exit 0
fi

# Try database
echo "Method 2: Checking database..."
I_ADDR=$(PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db -t -c \
    "SELECT identity_address FROM identities 
     WHERE LOWER(base_name) = LOWER('$NAME') 
        OR LOWER(friendly_name) = LOWER('${NAME}@')
        OR LOWER(friendly_name) = LOWER('${NAME}.vrsc@')
     LIMIT 1;" 2>/dev/null | xargs)

if [ -n "$I_ADDR" ]; then
    echo "✅ Found in database!"
    echo ""
    echo "   Name: $NAME"
    echo "   I-address: $I_ADDR"
    echo ""
    exit 0
fi

echo "❌ Not found in API or database"
echo ""
echo "Alternative methods:"
echo "  1. Use Verus Explorer: https://explorer.verus.io"
echo "  2. If you have the I-address, add it with:"
echo "     ./scripts/add-verusid.sh <i-address> <name>"
echo ""

