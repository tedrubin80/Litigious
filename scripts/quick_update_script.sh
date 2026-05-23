#!/bin/bash

# 🔄 Legal Software - Quick Update Script
# This script quickly updates dependencies and pulls latest changes

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${BLUE}➜ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Quick update function
quick_update() {
    echo -e "\n${BLUE}🔄 Legal Software - Quick Update${NC}\n"
    
    # Pull latest changes
    if [[ -d ".git" ]]; then
        print_step "Pulling latest changes from repository..."
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || print_warning "Git pull failed or no remote configured"
        print_success "Repository updated"
    fi
    
    # Update backend dependencies
    if [[ -f "backend/package.json" ]]; then
        print_step "Updating backend dependencies..."
        cd backend
        npm update
        cd ..
        print_success "Backend dependencies updated"
    fi
    
    # Update frontend dependencies  
    if [[ -f "frontend/package.json" ]]; then
        print_step "Updating frontend dependencies..."
        cd frontend
        npm update
        cd ..
        print_success "Frontend dependencies updated"
    fi
    
    # Update global packages
    print_step "Updating global npm packages..."
    npm update -g 2>/dev/null || print_warning "Global update requires permissions"
    
    # Regenerate Prisma client if needed
    if [[ -f "backend/prisma/schema.prisma" ]]; then
        print_step "Regenerating Prisma client..."
        cd backend
        npx prisma generate
        cd ..
        print_success "Prisma client updated"
    fi
    
    # Make scripts executable
    print_step "Updating script permissions..."
    find . -name "*.sh" -exec chmod +x {} \;
    print_success "Script permissions updated"
    
    print_success "🎉 Quick update completed!"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo -e "  • Test with: ./validate-setup.sh"
    echo -e "  • Deploy with: docker-compose up --build"
    echo -e "  • Check status: legal-status"
}

# Validation script
validate_setup() {
    echo -e "\n${BLUE}🔍 Legal Software - Setup Validation${NC}\n"
    
    local errors=0
    local warnings=0
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 18 ]]; then
            print_success "Node.js $(node --version) ✓"
        else
            print_warning "Node.js version should be 18+, found $(node --version)"
            ((warnings++))
        fi
    else
        print_error "Node.js not found"
        ((errors++))
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        print_success "npm $(npm --version) ✓"
    else
        print_error "npm not found"
        ((errors++))
    fi
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        if docker ps >/dev/null 2>&1; then
            print_success "Docker $(docker --version | cut -d',' -f1) ✓"
        else
            print_warning "Docker installed but not running"
            ((warnings++))
        fi
    else
        print_warning "Docker not found (optional but recommended)"
        ((warnings++))
    fi
    
    # Check Docker Compose
    if command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose ✓"
    else
        print_warning "Docker Compose not found"
        ((warnings++))
    fi
    
    # Check project structure
    local required_dirs=("backend" "frontend" "scripts")
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            print_success "Directory $dir/ ✓"
        else
            print_error "Missing directory: $dir/"
            ((errors++))
        fi
    done
    
    # Check essential files
    local essential_files=(
        "backend/package.json"
        "frontend/package.json"
        "docker-compose.yml"
        "README.md"
    )
    
    for file in "${essential_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "File $file ✓"
        else
            print_error "Missing file: $file"
            ((errors++))
        fi
    done
    
    # Check environment files
    if [[ -f "backend/.env" ]]; then
        print_success "Backend environment file ✓"
        
        # Check for required env vars
        if grep -q "DATABASE_URL" backend/.env; then
            print_success "DATABASE_URL configured ✓"
        else
            print_warning "DATABASE_URL not found in backend/.env"
            ((warnings++))
        fi
        
        if grep -q "JWT_SECRET" backend/.env; then
            print_success "JWT_SECRET configured ✓"
        else
            print_error "JWT_SECRET not found in backend/.env"
            ((errors++))
        fi
    else
        print_error "backend/.env file missing"
        ((errors++))
    fi
    
    # Check dependencies
    if [[ -f "backend/package.json" ]]; then
        if [[ -d "backend/node_modules" ]]; then
            print_success "Backend dependencies installed ✓"
        else
            print_error "Backend dependencies not installed (run: cd backend && npm install)"
            ((errors++))
        fi
    fi
    
    if [[ -f "frontend/package.json" ]]; then
        if [[ -d "frontend/node_modules" ]]; then
            print_success "Frontend dependencies installed ✓"
        else
            print_error "Frontend dependencies not installed (run: cd frontend && npm install)"
            ((errors++))
        fi
    fi
    
    # Check Prisma setup
    if [[ -f "backend/prisma/schema.prisma" ]]; then
        print_success "Prisma schema found ✓"
        
        cd backend
        if npx prisma validate 2>/dev/null; then
            print_success "Prisma schema valid ✓"
        else
            print_warning "Prisma schema validation failed"
            ((warnings++))
        fi
        cd ..
    else
        print_warning "Prisma schema not found"
        ((warnings++))
    fi
    
    # Check scripts
    local important_scripts=(
        "scripts/deployment/deploy.sh"
        "scripts/database/setup-neon.sh"
    )
    
    for script in "${important_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                print_success "Script $script ✓"
            else
                print_warning "Script $script not executable"
                chmod +x "$script"
                print_success "Fixed permissions for $script"
            fi
        else
            print_warning "Script $script not found"
            ((warnings++))
        fi
    done
    
    # Test database connection (if possible)
    if [[ -f "backend/.env" ]] && command -v node >/dev/null 2>&1; then
        print_step "Testing database connection..."
        cd backend
        if npm list @prisma/client >/dev/null 2>&1; then
            # Create a simple connection test
            cat > test-db.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection: ✅ SUCCESS');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.log('Database connection: ❌ FAILED');
    console.log('Error:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF
            
            if node test-db.js 2>/dev/null; then
                print_success "Database connection test passed ✓"
            else
                print_warning "Database connection test failed (check DATABASE_URL)"
                ((warnings++))
            fi
            
            rm -f test-db.js
        fi
        cd ..
    fi
    
    # Summary
    echo -e "\n${BLUE}📊 Validation Summary:${NC}"
    if [[ $errors -eq 0 ]] && [[ $warnings -eq 0 ]]; then
        print_success "🎉 All checks passed! Your setup is perfect."
        echo -e "\n${BLUE}🚀 Ready to go:${NC}"
        echo -e "  • Start development: npm run dev"
        echo -e "  • Deploy with Docker: docker-compose up --build"
        echo -e "  • Access app: http://localhost:3000"
    elif [[ $errors -eq 0 ]]; then
        print_success "✅ Setup is functional with $warnings warning(s)"
        echo -e "\n${YELLOW}⚠️ Warnings can be ignored for basic functionality${NC}"
    else
        print_error "❌ Found $errors error(s) and $warnings warning(s)"
        echo -e "\n${RED}🔧 Please fix the errors above before proceeding${NC}"
        return 1
    fi
    
    return 0
}

# Create a comprehensive status check
system_status() {
    echo -e "\n${BLUE}📊 Legal Software - System Status${NC}\n"
    
    # System info
    echo -e "${BLUE}🖥️ System Information:${NC}"
    echo -e "  OS: $(uname -s)"
    echo -e "  Architecture: $(uname -m)"
    echo -e "  Kernel: $(uname -r)"
    echo
    
    # Software versions
    echo -e "${BLUE}🛠️ Software Versions:${NC}"
    echo -e "  Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo -e "  npm: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo -e "  Docker: $(docker --version 2>/dev/null | cut -d',' -f1 || echo 'Not installed')"
    echo -e "  Git: $(git --version 2>/dev/null || echo 'Not installed')"
    echo
    
    # Project status
    echo -e "${BLUE}📁 Project Status:${NC}"
    echo -e "  Directory: $(pwd)"
    echo -e "  Git branch: $(git branch --show-current 2>/dev/null || echo 'Not a git repository')"
    echo -e "  Last commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'No commits')"
    echo
    
    # Running services
    echo -e "${BLUE}🔄 Running Services:${NC}"
    if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
        local running_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null)
        if [[ -n "$running_containers" ]]; then
            echo "$running_containers"
        else
            echo -e "  No containers running"
        fi
    else
        echo -e "  Docker not available"
    fi
    echo
    
    # Port usage
    echo -e "${BLUE}🌐 Port Status:${NC}"
    for port in 3000 3001 5432; do
        if command -v lsof >/dev/null 2>&1; then
            local process=$(lsof -ti:$port 2>/dev/null)
            if [[ -n "$process" ]]; then
                local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
                echo -e "  Port $port: 🔴 Used by $process_name (PID: $process)"
            else
                echo -e "  Port $port: 🟢 Available"
            fi
        else
            echo -e "  Port $port: ❓ Cannot check (lsof not available)"
        fi
    done
    echo
    
    # Disk usage
    echo -e "${BLUE}💾 Disk Usage:${NC}"
    echo -e "  Project size: $(du -sh . 2>/dev/null | cut -f1)"
    if [[ -d "node_modules" ]]; then
        echo -e "  node_modules: $(du -sh node_modules 2>/dev/null | cut -f1)"
    fi
    if [[ -d "backend/node_modules" ]]; then
        echo -e "  backend/node_modules: $(du -sh backend/node_modules 2>/dev/null | cut -f1)"
    fi
    if [[ -d "frontend/node_modules" ]]; then
        echo -e "  frontend/node_modules: $(du -sh frontend/node_modules 2>/dev/null | cut -f1)"
    fi
    echo
}

# Main function to handle different modes
case "${1:-help}" in
    "update")
        quick_update
        ;;
    "validate")
        validate_setup
        ;;
    "status")
        system_status
        ;;
    "all")
        quick_update
        echo
        validate_setup
        echo
        system_status
        ;;
    "help"|*)
        echo -e "\n${BLUE}🛠️ Legal Software - Quick Tools${NC}\n"
        echo -e "Usage: $0 [command]\n"
        echo -e "Commands:"
        echo -e "  ${BLUE}update${NC}    - Quick update dependencies and pull changes"
        echo -e "  ${BLUE}validate${NC}  - Validate setup and configuration"
        echo -e "  ${BLUE}status${NC}    - Show detailed system status"
        echo -e "  ${BLUE}all${NC}       - Run update, validate, and status"
        echo -e "  ${BLUE}help${NC}      - Show this help message\n"
        echo -e "Examples:"
        echo -e "  $0 update     # Quick update"
        echo -e "  $0 validate   # Check if everything is working"
        echo -e "  $0 status     # See what's running"
        echo -e "  $0 all        # Do everything\n"
        ;;
esac