#!/bin/bash
# Fix Python virtual environment issues

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

echo "=== Virtual Environment Fix ==="

# Check if venv directory exists
if [ ! -d "$VENV_DIR" ]; then
  echo "Virtual environment not found at $VENV_DIR"
  echo "Creating a new virtual environment..."
  /usr/bin/python3 -m venv "$VENV_DIR"
  
  if [ ! -d "$VENV_DIR" ]; then
    echo "Failed to create virtual environment. Please check your Python installation."
    exit 1
  fi
  
  echo "Created new virtual environment at $VENV_DIR"
fi

# Deactivate any existing virtual environment
if [ -n "$VIRTUAL_ENV" ]; then
  echo "Deactivating current virtual environment: $VIRTUAL_ENV"
  deactivate 2>/dev/null || true
fi

# Activate the correct virtual environment
echo "Activating virtual environment at $VENV_DIR"
source "$VENV_DIR/bin/activate"

# Ensure PATH is correct (venv/bin should be first)
if [[ ":$PATH:" != *":$VENV_DIR/bin:"* ]]; then
  export PATH="$VENV_DIR/bin:$PATH"
  echo "Added virtual environment bin directory to PATH"
fi

# Verify Python path
PYTHON_PATH=$(which python)
if [[ "$PYTHON_PATH" == *"$VENV_DIR"* ]]; then
  echo "✓ Success! Python path is correctly set to: $PYTHON_PATH"
else
  echo "✗ Warning: Python path is still incorrect: $PYTHON_PATH"
  echo ""
  echo "This may be due to pyenv or another Python version manager."
  echo "To fix this, you may need to:"
  echo "1. Temporarily disable pyenv: pyenv local system"
  echo "2. Or modify your shell configuration to give venv priority"
fi

# Install required Python packages if needed
if [ ! -f "$VENV_DIR/requirements_installed" ]; then
  echo "Installing required Python packages..."
  "$VENV_DIR/bin/pip" install requests
  touch "$VENV_DIR/requirements_installed"
  echo "✓ Python packages installed"
fi

echo ""
echo "Virtual environment is now activated."
echo "Your Python should be using: $VENV_DIR/bin/python"
echo ""
echo "To verify, run: which python"
echo ""
echo "IMPORTANT: This script must be run with 'source' to affect your current shell:"
echo "  source ./fix_venv.sh"
