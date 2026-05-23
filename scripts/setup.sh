#!/bin/bash

set -e

echo "🚀 Starting Legal Estate Backend Environment Setup..."

# Update and install system packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# Install Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Optional: Install yarn
npm install -g yarn

# Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install Prisma CLI
echo "📦 Installing Prisma CLI..."
npm install -g prisma

# Optional: Clone your GitHub repo
# echo "📥 Cloning repo..."
# git clone https://github.com/YOUR_USERNAME/legal-estate-backend.git
# cd legal-estate-backend

# Setup environment file
echo "🔧 Configuring environment..."
cat <<EOF > .env
# PostgreSQL
DATABASE_URL="postgresql://youruser:yourpass@yourhost:5432/yourdb?schema=public"
JWT_SECRET="your_super_secret_key"
PORT=3000
EOF

# Install dependencies
echo "📦 Installing npm packages..."
npm install

# Generate Prisma client
echo "🛠️ Generating Prisma client..."
npx prisma generate

echo "✅ Setup complete! You can now run the backend with:"
echo "   npm run start:dev"
