#!/bin/bash
# scripts/setup-pdf-env.sh

echo "Setting up PDF export environment..."

# Check if .env exists in current or parent directory
if [ -f ".env" ]; then
    echo "✅ .env already exists in current directory"
elif [ -f "../.env" ]; then
    echo "Copying .env from parent directory..."
    cp "../.env" ".env"
    echo "✅ .env copied successfully"
else
    echo "⚠️  No .env found in current or parent directory"
    echo "Please ensure .env exists in the project directory"
    exit 1
fi

# Verify critical variables
echo "Verifying environment variables..."
required_vars=(
    "DATABASE_URL"
    "BETTER_AUTH_SECRET"
    "GOOGLE_API_KEY"
    "GROQ_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '  %s\n' "${missing_vars[@]}"
    exit 1
fi

echo "✅ Environment setup complete"