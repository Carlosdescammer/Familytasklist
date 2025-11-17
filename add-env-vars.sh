#!/bin/bash

# Add environment variables to Vercel
echo "Adding environment variables to Vercel..."

# Read .env.local and add each variable
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  
  # Clean up the value (remove quotes if present)
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/')
  
  echo "Adding: $key"
  echo "$value" | vercel env add "$key" production --force
done < .env.local

echo "✅ All environment variables added to Vercel!"
