#!/bin/bash
# Start OpenClaw gateway with Gemini CLI OAuth plugin
# Uses google-gemini-cli-auth plugin for authentication

set -e

# Check if openclaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw CLI not found. Install: npm install -g openclaw"
    exit 1
fi

# Check if Gemini CLI is installed
if ! command -v gemini &> /dev/null; then
    echo "❌ Gemini CLI not found. Install: npm install -g @anthropic-ai/gemini-cli"
    echo "   Then login: gemini auth login"
    exit 1
fi

# Check Gemini CLI auth status
GEMINI_CREDS="$HOME/.gemini/oauth_creds.json"
if [ ! -f "$GEMINI_CREDS" ]; then
    echo "⚠️  Gemini CLI not logged in. Running: gemini auth login"
    gemini auth login
fi

# Enable Gemini CLI auth plugin if not already enabled
echo "🔧 Ensuring Gemini CLI auth plugin is enabled..."
openclaw plugins enable google-gemini-cli-auth 2>/dev/null || true

# Check if already authenticated with Gemini CLI provider
AUTH_STATUS=$(openclaw models auth status --provider google-gemini-cli 2>/dev/null || echo "not-configured")

if [[ "$AUTH_STATUS" == *"not-configured"* ]] || [[ "$AUTH_STATUS" == *"expired"* ]]; then
    echo "🔑 Setting up Gemini CLI OAuth as default provider..."
    openclaw models auth login --provider google-gemini-cli --set-default
fi

echo "✅ Using Gemini CLI OAuth (via plugin)"
echo "🦞 Starting OpenClaw gateway..."

# Kill existing gateway
pkill -f "openclaw-gateway" 2>/dev/null || true
sleep 2

# Start gateway
openclaw gateway "$@"
