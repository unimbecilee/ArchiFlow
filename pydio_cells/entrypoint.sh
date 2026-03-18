#!/bin/sh
set -e

CELLS_BIN="/app/cells"
WORKDIR="${CELLS_WORKING_DIR:-/var/cells}"
CONFIG_FILE="$WORKDIR/pydio.json"

echo "▶ Starting Pydio Cells"
echo "▶ Working directory: $WORKDIR"

# Ensure working directory exists
mkdir -p "$WORKDIR"
cd "$WORKDIR"

# If configuration does not exist, run configuration first
if [ ! -f "$CONFIG_FILE" ]; then
  echo "⚠ Configuration file not found: $CONFIG_FILE" 
  echo ""
  echo "▶ Running configuration..."
  /app/configure.sh
  echo ""
  echo "✅ Configuration completed"
fi

echo "✅ Configuration found"

# Force APPLICATION_TITLE to "SGDS" in the configuration
if [ -f "$CONFIG_FILE" ]; then
  echo "🔧 Setting APPLICATION_TITLE to SGDS..."
  # Use a temporary file for sed on Alpine Linux
  sed 's/"APPLICATION_TITLE": "Pydio Cells"/"APPLICATION_TITLE": "SGDS"/g; s/"APPLICATION_TITLE": "UniDoc"/"APPLICATION_TITLE": "SGDS"/g' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  echo "✅ APPLICATION_TITLE updated to SGDS"
fi

echo "▶ Launching Cells..."

exec "$CELLS_BIN" start