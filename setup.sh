#!/bin/bash

# Coco Counseling Platform Setup Script
echo "=========================================="
echo "   Coco Counseling Platform Setup"
echo "=========================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v16+ before continuing."
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm before continuing."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ $NODE_MAJOR_VERSION -lt 16 ]; then
    echo "Node.js version $NODE_VERSION detected. Coco requires Node.js v16 or higher."
    exit 1
fi

echo "Node.js version $NODE_VERSION detected."
echo "Setting up Coco Counseling platform..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Setup backend
echo "Setting up backend..."
cd backend
npm install
echo "Backend dependencies installed."

# Check if .env file exists in backend
if [ ! -f .env ]; then
    echo "Creating backend .env file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOF
# Server settings
PORT=3001
NODE_ENV=development

# Database connection
DATABASE_URL="postgresql://postgres:password@localhost:5432/coco_counseling"

# JWT Secret
JWT_SECRET="your_jwt_secret_key_change_this_in_production"

# Anthropic API
ANTHROPIC_API_KEY="your_anthropic_api_key"

# Security settings
CORS_ORIGIN="http://localhost:3000"
EOF
    echo "Created backend .env file. Please edit with your actual configuration."
else
    echo "Backend .env file already exists."
fi

cd ..

# Setup frontend
echo "Setting up frontend..."
cd frontend
npm install
echo "Frontend dependencies installed."

# Check if .env file exists in frontend
if [ ! -f .env ]; then
    echo "Creating frontend .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001/api
EOF
    echo "Created frontend .env file."
else
    echo "Frontend .env file already exists."
fi

cd ..

echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo "Next steps:"
echo "1. Configure your database in backend/.env"
echo "2. Add your Anthropic API key in backend/.env"
echo "3. Run the database migration: cd backend && npx prisma migrate dev"
echo "4. Start the application: npm start"
echo "=========================================="
