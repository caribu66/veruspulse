#!/bin/bash
# Add a VerusID to monitoring

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./add-verusid.sh <i-address> <name>"
    echo ""
    echo "Example:"
    echo "  ./add-verusid.sh iABC123... farinole"
    echo ""
    exit 1
fi

I_ADDR="$1"
NAME="$2"

# Validate I-address format
if [[ ! $I_ADDR =~ ^i[a-zA-Z0-9]{33}$ ]]; then
    echo "❌ Invalid I-address format. Must start with 'i' and be 34 characters."
    exit 1
fi

echo "===================================================="
echo "  Adding VerusID to Monitoring"
echo "===================================================="
echo ""
echo "   Name: $NAME"
echo "   I-address: $I_ADDR"
echo ""

# Add to database
PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db << EOF
INSERT INTO identities (identity_address, base_name, friendly_name, last_refreshed_at)
VALUES ('$I_ADDR', '$NAME', '${NAME}@', NOW())
ON CONFLICT (identity_address) 
DO UPDATE SET 
    base_name = '$NAME',
    friendly_name = '${NAME}@',
    last_refreshed_at = NOW();
EOF

if [ $? -eq 0 ]; then
    echo "✅ Successfully added $NAME@ to monitoring!"
    echo ""
    echo "The real-time monitor will now track this VerusID automatically."
    echo "Check current stakes:"
    echo "  PGPASSWORD=verus_secure_2024 psql -U verus_user -d verus_utxo_db \\"
    echo "    -c \"SELECT COUNT(*) FROM stake_events WHERE address = '$I_ADDR';\""
    echo ""
else
    echo "❌ Failed to add VerusID"
    exit 1
fi

