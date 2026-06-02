#!/bin/bash

# Eskom Theft Detection — Local Development Setup
# This script helps set up and run the application locally before deploying to Render

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Eskom Theft Detection — Local Development Setup              ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env created. Please edit it with your actual credentials:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_KEY"
        echo "   - JWT_SECRET"
        echo "   - OPENAI_API_KEY"
        echo ""
        echo "Edit the .env file and run this script again."
        exit 1
    else
        echo "❌ .env.example not found. Cannot proceed."
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Check if .env has all required variables
echo ""
echo "🔍 Checking required environment variables..."

required_vars=("SUPABASE_URL" "SUPABASE_KEY" "JWT_SECRET" "OPENAI_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    value=$(grep "^$var=" .env | cut -d'=' -f2-)
    if [ -z "$value" ] || [[ "$value" == *"your-"* ]] || [[ "$value" == *"example"* ]]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing or incomplete environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please edit .env and set these variables before starting the server."
    exit 1
fi

echo "✅ All required environment variables are set"

# Start the server
echo ""
echo "🚀 Starting Eskom Theft Detection server..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Server will be available at: http://localhost:3000"
echo "═══════════════════════════════════════════════════════════════"
echo ""

node server.js
