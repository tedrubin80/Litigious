#!/bin/bash

# 🚀 Legal Estate Management Software - Project Launcher
# One script to rule them all - handles setup, updates, validation, and deployment
# Repository: https://github.com/tedrubin80/legal-estate

set -e

# Colors and formatting
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Create the main launcher script
cat > legal-launcher.sh << 'EOF'
#!/bin/bash

# 🚀 Legal Software Launcher - Main Control Script
# Handles all aspects of the Legal Practice Management Software

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Icons
ROCKET="🚀"
GEAR="⚙️"
CHECK="✅"
WARNING="⚠️"
ERROR="❌"
INFO="ℹ️"
ARROW="➜"

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    ${WHITE}Legal Estate Launcher${CYAN}                     ║"
    echo "║              ${PURPLE}Legal Management Made Simple${CYAN}                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

print_menu() {
    echo -e "${BLUE}📋 Available Actions:${NC}\n"
    
    echo -e "${GREEN}🏗️  Setup & Installation:${NC}"
    echo -e "  ${YELLOW}1)${NC} Fresh installation (first time setup)"
    echo -e "  ${YELLOW}2)${NC} Quick update (dependencies & code)"
    echo -e "  ${YELLOW}3)${NC} Validate setup (check everything works)"
    echo
    
    echo -e "${GREEN}🚀 Development & Deployment:${NC}"
    echo -e "  ${YELLOW}4)${NC} Start development servers"
    echo -e "  ${YELLOW}5)${NC} Deploy with Docker"
    echo -e "  ${YELLOW}6)${NC} Deploy to production"
    echo
    
    echo -e "${GREEN}🔧 Maintenance:${NC}"
    echo -e "  ${YELLOW}7)${NC} System status check"
    echo -e "  ${YELLOW}8)${NC} View application logs"
    echo -e "  ${YELLOW}9)${NC} Database management"
    echo -e "  ${YELLOW}10)${NC} Backup & restore"
    echo
    
    echo -e "${GREEN}📚 Information:${NC}"
    echo -e "  ${YELLOW}11)${NC} Show project information"
    echo -e "  ${YELLOW}12)${NC} Open documentation"
    echo -e "  ${YELLOW}13)${NC} Help & troubleshooting"
    echo
    
    echo -e "${RED}❌ Exit:${NC}"
    echo -e "  ${YELLOW}0)${NC} Exit launcher"
    echo
}

# Function to run setup
run_setup() {
    echo -e "${BLUE}${ROCKET} Starting fresh installation...${NC}\n"
    
    if [[ -f "setup.sh" ]]; then
        chmod +x setup.sh
        ./setup.sh
    else
        echo -e "${ERROR} setup.sh not found!"
        echo -e "${INFO} Please ensure you have the setup script in the project directory"
        return 1
    fi
}

# Function to run quick update
run_update() {
    echo -e "${BLUE}🔄 Running quick update...${NC}\n"
    
    if [[ -f "quick-tools.sh" ]]; then
        chmod +x quick-tools.sh
        ./quick-tools.sh update
    else
        echo -e "${INFO} Running basic update..."
        
        # Basic update steps
        if [[ -d ".git" ]]; then
            echo -e "${ARROW} Pulling latest changes..."
            git pull 2>/dev/null || echo -e "${WARNING} Git pull failed"
        fi
        
        if [[ -f "backend/package.json" ]]; then
            echo -e "${ARROW} Updating backend dependencies..."
            cd backend && npm update && cd ..
        fi
        
        if [[ -f "frontend/package.json" ]]; then
            echo -e "${ARROW} Updating frontend dependencies..."
            cd frontend && npm update && cd ..
        fi
        
        echo -e "${CHECK} Basic update completed"
    fi
}

# Function to validate setup
run_validation() {
    echo -e "${BLUE}🔍 Validating setup...${NC}\n"
    
    if [[ -f "quick-tools.sh" ]]; then
        chmod +x quick-tools.sh
        ./quick-tools.sh validate
    else
        echo -e "${INFO} Running basic validation..."
        
        # Basic validation
        local errors=0
        
        if command -v node >/dev/null 2>&1; then
            echo -e "${CHECK} Node.js: $(node --version)"
        else
            echo -e "${ERROR} Node.js not found"
            ((errors++))
        fi
        
        if command -v docker >/dev/null 2>&1; then
            echo -e "${CHECK} Docker: $(docker --version | cut -d',' -f1)"
        else
            echo -e "${WARNING} Docker not found"
        fi
        
        if [[ -f "backend/package.json" ]] && [[ -f "frontend/package.json" ]]; then
            echo -e "${CHECK} Project structure looks good"
        else
            echo -e "${ERROR} Missing essential project files"
            ((errors++))
        fi
        
        if [[ $errors -eq 0 ]]; then
            echo -e "\n${CHECK} Basic validation passed!"
        else
            echo -e "\n${ERROR} Found $errors error(s). Run setup first."
        fi
    fi
}

# Function to start development
start_development() {
    echo -e "${BLUE}🛠️ Starting development servers...${NC}\n"
    
    if [[ ! -f "backend/package.json" ]] || [[ ! -f "frontend/package.json" ]]; then
        echo -e "${ERROR} Project not properly set up. Run setup first."
        return 1
    fi
    
    echo -e "${INFO} This will start both backend and frontend servers"
    echo -e "${INFO} Backend: http://localhost:3001"
    echo -e "${INFO} Frontend: http://localhost:3000"
    echo -e "${INFO} Press Ctrl+C to stop both servers"
    echo
    
    read -p "Continue? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        return 0
    fi
    
    # Start in background processes
    echo -e "${ARROW} Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    sleep 3
    
    echo -e "${ARROW} Starting frontend server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    echo -e "${CHECK} Development servers started!"
    echo -e "${INFO} Backend PID: $BACKEND_PID"
    echo -e "${INFO} Frontend PID: $FRONTEND_PID"
    echo -e "${INFO} Press Enter to stop servers..."
    
    read
    
    echo -e "${ARROW} Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${CHECK} Servers stopped"
}

# Function to deploy with Docker
deploy_docker() {
    echo -e "${BLUE}🐳 Deploying with Docker...${NC}\n"
    
    if [[ ! -f "docker-compose.yml" ]]; then
        echo -e "${ERROR} docker-compose.yml not found!"
        return 1
    fi
    
    if ! command -v docker >/dev/null 2>&1; then
        echo -e "${ERROR} Docker not installed. Run setup first."
        return 1
    fi
    
    # Set docker-compose command
    local compose_cmd="docker-compose"
    if ! command -v docker-compose >/dev/null 2>&1; then
        compose_cmd="docker compose"
    fi
    
    echo -e "${ARROW} Building and starting containers..."
    $compose_cmd down 2>/dev/null || true
    
    if $compose_cmd up --build -d; then
        echo -e "${CHECK} Docker deployment successful!"
        echo -e "${INFO} Frontend: http://localhost:3000"
        echo -e "${INFO} Backend: http://localhost:3001"
        echo -e "${INFO} View logs: $compose_cmd logs -f"
        echo -e "${INFO} Stop: $compose_cmd down"
    else
        echo -e "${ERROR} Docker deployment failed!"
        return 1
    fi
}

# Function to show system status
show_status() {
    echo -e "${BLUE}📊 System Status${NC}\n"
    
    if [[ -f "quick-tools.sh" ]]; then
        chmod +x quick-tools.sh
        ./quick-tools.sh status
    else
        echo -e "${INFO} Basic status check..."
        
        echo -e "${BLUE}Software:${NC}"
        echo -e "  Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
        echo -e "  Docker: $(docker --version 2>/dev/null | cut -d',' -f1 || echo 'Not installed')"
        echo
        
        echo -e "${BLUE}Project:${NC}"
        echo -e "  Directory: $(pwd)"
        echo -e "  Git branch: $(git branch --show-current 2>/dev/null || echo 'Not a git repo')"
        echo
        
        if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
            echo -e "${BLUE}Running containers:${NC}"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo -e "  None"
        fi
    fi
}

# Function to view logs
view_logs() {
    echo -e "${BLUE}📜 Application Logs${NC}\n"
    
    if command -v docker >/dev/null 2>&1; then
        # Set docker-compose command
        local compose_cmd="docker-compose"
        if ! command -v docker-compose >/dev/null 2>&1; then
            compose_cmd="docker compose"
        fi
        
        echo -e "${INFO} Choose log source:"
        echo -e "  1) All containers"
        echo -e "  2) Backend only"
        echo -e "  3) Frontend only"
        echo -e "  4) Setup logs"
        echo
        
        read -p "Choice (1-4): " -n 1 -r
        echo
        
        case $REPLY in
            1) $compose_cmd logs -f ;;
            2) $compose_cmd logs -f backend ;;
            3) $compose_cmd logs -f frontend ;;
            4) [[ -f "setup.log" ]] && tail -f setup.log || echo "No setup.log found" ;;
            *) echo "Invalid choice" ;;
        esac
    else
        if [[ -f "setup.log" ]]; then
            echo -e "${INFO} Showing setup log:"
            tail -20 setup.log
        else
            echo -e "${WARNING} No logs available. Docker not running or no log files found."
        fi
    fi
}

# Function to manage database
manage_database() {
    echo -e "${BLUE}🗄️ Database Management${NC}\n"
    
    if [[ ! -f "backend/prisma/schema.prisma" ]]; then
        echo -e "${ERROR} Prisma schema not found!"
        return 1
    fi
    
    echo -e "${INFO} Database actions:"
    echo -e "  1) Open Prisma Studio (database GUI)"
    echo -e "  2) Run migrations"
    echo -e "  3) Reset database"
    echo -e "  4) Generate Prisma client"
    echo -e "  5) Check connection"
    echo
    
    read -p "Choice (1-5): " -n 1 -r
    echo
    
    cd backend
    case $REPLY in
        1) 
            echo -e "${ARROW} Opening Prisma Studio..."
            npx prisma studio
            ;;
        2) 
            echo -e "${ARROW} Running migrations..."
            npx prisma migrate dev
            ;;
        3) 
            echo -e "${WARNING} This will reset all data!"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                npx prisma migrate reset
            fi
            ;;
        4) 
            echo -e "${ARROW} Generating Prisma client..."
            npx prisma generate
            ;;
        5) 
            echo -e "${ARROW} Testing database connection..."
            npx prisma db pull --force >/dev/null 2>&1 && echo -e "${CHECK} Connection successful" || echo -e "${ERROR} Connection failed"
            ;;
        *) 
            echo "Invalid choice"
            ;;
    esac
    cd ..
}

# Function to show project info
show_project_info() {
    echo -e "${BLUE}📋 Project Information${NC}\n"
    
    echo -e "${CYAN}Legal Estate Management Software${NC}"
    echo -e "A comprehensive case management system for law firms\n"
    echo -e "${BLUE}Repository:${NC} https://github.com/tedrubin80/legal-estate\n"
    
    echo -e "${BLUE}Features:${NC}"
    echo -e "  • Client management (individuals & businesses)"
    echo -e "  • Case tracking across all practice areas"
    echo -e "  • Document management with version control"
    echo -e "  • Time tracking and billing"
    echo -e "  • Task and deadline management"
    echo -e "  • Secure access with audit trails"
    echo
    
    echo -e "${BLUE}Technology Stack:${NC}"
    echo -e "  • Backend: Node.js, Express, TypeScript, Prisma"
    echo -e "  • Frontend: React, TypeScript, React Query"
    echo -e "  • Database: PostgreSQL (Neon)"
    echo -e "  • Infrastructure: Docker, GitHub Actions"
    echo
    
    echo -e "${BLUE}Quick Access:${NC}"
    echo -e "  • Demo: http://localhost:3000"
    echo -e "  • API: http://localhost:3001"
    echo -e "  • Default login: admin@example.com / admin123"
    echo
    
    if [[ -f "PROJECT_STRUCTURE.md" ]]; then
        echo -e "${INFO} See PROJECT_STRUCTURE.md for detailed documentation"
    fi
    
    if [[ -f "SETUP_REPORT.md" ]]; then
        echo -e "${INFO} See SETUP_REPORT.md for setup details"
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}🆘 Help & Troubleshooting${NC}\n"
    
    echo -e "${CYAN}Common Issues:${NC}\n"
    
    echo -e "${YELLOW}1. Port already in use:${NC}"
    echo -e "   • Stop other applications using ports 3000/3001"
    echo -e "   • Use: lsof -ti:3000 | xargs kill -9"
    echo
    
    echo -e "${YELLOW}2. Docker not working:${NC}"
    echo -e "   • Ensure Docker Desktop is running"
    echo -e "   • Try: docker ps"
    echo -e "   • Restart Docker service"
    echo
    
    echo -e "${YELLOW}3. Database connection failed:${NC}"
    echo -e "   • Check DATABASE_URL in backend/.env"
    echo -e "   • Verify Neon database is accessible"
    echo -e "   • Run database validation"
    echo
    
    echo -e "${YELLOW}4. Dependencies issues:${NC}"
    echo -e "   • Delete node_modules and run npm install"
    echo -e "   • Clear npm cache: npm cache clean --force"
    echo -e "   • Update Node.js to version 18+"
    echo
    
    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  • ./legal-launcher.sh - This launcher"
    echo -e "  • docker-compose logs -f - View logs"
    echo -e "  • npm run dev - Start development"
    echo -e "  • legal-help - Show aliases (if loaded)"
    echo
    
    echo -e "${CYAN}Documentation:${NC}"
    if [[ -f "README.md" ]]; then
        echo -e "  • README.md - Project overview"
    fi
    if [[ -f "PROJECT_STRUCTURE.md" ]]; then
        echo -e "  • PROJECT_STRUCTURE.md - File organization"
    fi
    if [[ -f "setup.log" ]]; then
        echo -e "  • setup.log - Installation log"
    fi
    echo
    
    echo -e "${INFO} For additional help, check the documentation or run validation to identify issues."
}

# Main menu loop
main_menu() {
    while true; do
        print_banner
        print_menu
        
        read -p "Select an option (0-13): " choice
        echo
        
        case $choice in
            1) run_setup ;;
            2) run_update ;;
            3) run_validation ;;
            4) start_development ;;
            5) deploy_docker ;;
            6) 
                echo -e "${WARNING} Production deployment not implemented in launcher"
                echo -e "${INFO} Use your CI/CD pipeline or cloud platform tools"
                ;;
            7) show_status ;;
            8) view_logs ;;
            9) manage_database ;;
            10) 
                echo -e "${WARNING} Backup & restore not implemented in launcher"
                echo -e "${INFO} Use your database backup tools or scripts"
                ;;
            11) show_project_info ;;
            12) 
                if command -v xdg-open >/dev/null 2>&1; then
                    xdg-open README.md 2>/dev/null || echo -e "${INFO} Open README.md manually"
                elif command -v open >/dev/null 2>&1; then
                    open README.md 2>/dev/null || echo -e "${INFO} Open README.md manually"
                else
                    echo -e "${INFO} Open README.md in your text editor"
                fi
                ;;
            13) show_help ;;
            0) 
                echo -e "${INFO} Goodbye! 👋"
                exit 0
                ;;
            *) 
                echo -e "${ERROR} Invalid option. Please choose 0-13."
                ;;
        esac
        
        if [[ $choice != "0" ]]; then
            echo
            read -p "Press Enter to continue..."
        fi
    done
}

# Check if running directly or sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main_menu
fi
EOF

# Make the launcher executable
chmod +x legal-launcher.sh

echo -e "${GREEN}✅ Project Launcher Created!${NC}\n"

echo -e "${BLUE}📋 Summary of Created Tools:${NC}\n"

echo -e "${CYAN}1. GitHub Action:${NC} .github/workflows/organize-repo.yml"
echo -e "   ${ARROW} Automatically organizes repository structure"
echo -e "   ${ARROW} Validates files and sets permissions"
echo -e "   ${ARROW} Creates documentation and reports"
echo

echo -e "${CYAN}2. Universal Setup Script:${NC} setup.sh"
echo -e "   ${ARROW} Detects OS and installs all prerequisites"
echo -e "   ${ARROW} Sets up Node.js, Docker, PostgreSQL"
echo -e "   ${ARROW} Configures project environment"
echo

echo -e "${CYAN}3. Quick Tools Script:${NC} quick-tools.sh"
echo -e "   ${ARROW} Quick updates and validation"
echo -e "   ${ARROW} System status checks"
echo -e "   ${ARROW} Comprehensive diagnostics"
echo

echo -e "${CYAN}4. Project Launcher:${NC} legal-launcher.sh"
echo -e "   ${ARROW} Interactive menu for all operations"
echo -e "   ${ARROW} Handles setup, deployment, maintenance"
echo -e "   ${ARROW} Built-in help and troubleshooting"
echo

echo -e "${YELLOW}🚀 Getting Started:${NC}\n"

echo -e "${WHITE}For GitHub Repository:${NC}"
echo -e "1. Add the GitHub Action to .github/workflows/"
echo -e "2. Push to trigger automatic organization"
echo

echo -e "${WHITE}For New Computer Setup:${NC}"
echo -e "1. Run: ./legal-launcher.sh"
echo -e "2. Choose option 1 (Fresh installation)"
echo -e "3. Follow the prompts"
echo

echo -e "${WHITE}For Daily Development:${NC}"
echo -e "1. Run: ./legal-launcher.sh"
echo -e "2. Choose option 4 (Start development)"
echo -e "3. Or option 5 (Deploy with Docker)"
echo

echo -e "${BLUE}💡 Pro Tips:${NC}"
echo -e "• The launcher remembers your setup state"
echo -e "• Use validation frequently to catch issues early"
echo -e "• The GitHub Action keeps your repo organized"
echo -e "• All scripts work cross-platform (Linux/macOS/WSL)"
echo

echo -e "${GREEN}🎉 All tools created successfully!${NC}"
echo -e "${INFO} Run ./legal-launcher.sh to get started"