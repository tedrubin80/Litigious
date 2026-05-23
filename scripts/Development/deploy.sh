#!/bin/bash
# Legal Software - Docker Deployment Script
# Deploys the application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Header
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Legal Software Docker Deployment     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker from https://docker.com"
    exit 1
fi
print_success "Docker found"

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running!"
    echo "Please start Docker and try again"
    exit 1
fi
print_success "Docker is running"

# Check if docker-compose exists
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    # Try docker compose (newer syntax)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        print_success "Using docker compose"
    else
        print_error "docker-compose is not installed!"
        exit 1
    fi
else
    print_success "Using docker-compose"
fi

# Check required files
print_step "Checking required files..."

if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

if [ ! -f "Dockerfile.backend" ]; then
    print_error "Dockerfile.backend not found!"
    exit 1
fi

if [ ! -f "Dockerfile.frontend" ]; then
    print_error "Dockerfile.frontend not found!"
    exit 1
fi

print_success "All required files found"

# Environment check
print_step "Checking environment configuration..."

if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env not found, creating from example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        print_success "Created backend/.env from example"
        print_warning "Please update backend/.env with your configuration"
    else
        print_error "No backend/.env or .env.example found!"
        exit 1
    fi
fi

# Stop existing containers
print_step "Stopping existing containers..."
$COMPOSE_CMD down 2>/dev/null || true
print_success "Existing containers stopped"

# Build images
print_step "Building Docker images..."
$COMPOSE_CMD build --no-cache

if [ $? -eq 0 ]; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    exit 1
fi

# Start containers
print_step "Starting containers..."
$COMPOSE_CMD up -d

if [ $? -eq 0 ]; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi

# Wait for services to be ready
print_step "Waiting for services to be ready..."
sleep 5

# Check if services are running
print_step "Checking service status..."

# Check backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
    print_success "Backend API is running at http://localhost:3001"
else
    print_warning "Backend API is not responding yet"
    echo "Check logs with: $COMPOSE_CMD logs backend"
fi

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    print_success "Frontend is running at http://localhost:3000"
else
    print_warning "Frontend is not responding yet"
    echo "Check logs with: $COMPOSE_CMD logs frontend"
fi

# Show running containers
echo ""
print_step "Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Deployment Complete! 🚀              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  API Health: http://localhost:3001/health"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs: $COMPOSE_CMD logs -f"
echo "  Stop all: $COMPOSE_CMD down"
echo "  Restart: $COMPOSE_CMD restart"
echo "  Shell into backend: docker exec -it legal-software-backend-1 bash"
echo ""
echo -e "${YELLOW}Note:${NC} First startup may take a few minutes while"
echo "      dependencies are installed and built."
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"