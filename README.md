# Legal Estate Management System - Virtual Demo

A comprehensive legal practice management system with AI integration, built with React.js frontend and Node.js backend.

## 🎭 Virtual Demo Features

### Interactive Virtual Tour
- **8-step guided walkthrough** explaining all features
- **AI integration demonstrations** with model explanations
- **Feature highlighting** with interactive tooltips
- **Demo mode indicators** and watermarks

### AI-Powered Capabilities
- **Document Generation**: GPT-4 Turbo, Claude 3, Local Ollama
- **Legal Research**: Lex Machina API integration
- **Case Analysis**: Predictive outcomes and risk assessment
- **Contract Review**: Automated analysis and suggestions

## 🔐 Demo Credentials

### Working Demo Accounts
```
👑 Administrator: demo@legalestate.tech / demo123
⚖️  Attorney:      user@legalestate.tech / user123
👤 Client:        client@demo.tech / client123
```

### Access Points
- **Main Demo**: https://legalestate.tech/
- **Admin Portal**: https://legalestate.tech/admin/login
- **Client Portal**: https://legalestate.tech/client/login

## 🏗️ Architecture

### Frontend (React.js)
- **Location**: `/frontend/`
- **Framework**: React 18 with Create React App
- **Styling**: Tailwind CSS
- **Icons**: Custom SVG icon system
- **Features**:
  - Virtual tour system (`/src/components/Demo/`)
  - Authentication system
  - Role-based routing
  - Real-time collaboration
  - Responsive design

### Backend (Node.js)
- **Location**: `/backend/`
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO
- **Features**:
  - RESTful API
  - AI service integrations
  - Payment processing
  - WebRTC for meetings
  - Email services

### Database
- **Type**: PostgreSQL
- **Backup**: `/database-backup/legal_estate_backup.sql`
- **ORM**: Prisma
- **Features**:
  - Complete schema
  - Demo user accounts
  - Sample case data
  - Relationship management

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Nginx (for production)

### Database Setup
```bash
# Restore database from backup
psql -U postgres -c "CREATE DATABASE legal_estate;"
psql -U postgres -d legal_estate < database-backup/legal_estate_backup.sql
```

### Backend Setup
```bash
cd backend
npm install
cp .env.demo .env
# Update database connection in .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.demo .env
npm start
```

## 📁 Project Structure

```
/var/www/html/
├── frontend/                 # React.js application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Demo/        # Virtual tour components
│   │   │   ├── Auth/        # Authentication
│   │   │   ├── Icons/       # Custom SVG icons
│   │   │   └── ...
│   │   ├── contexts/        # React contexts
│   │   └── utils/
│   ├── build/              # Production build
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── scripts/            # Database scripts
│   └── package.json
├── database-backup/         # Database exports
│   └── legal_estate_backup.sql
├── scripts/                # System management scripts
└── README.md
```

## 🎯 Key Features

### Virtual Tour System
- **Component**: `frontend/src/components/Demo/VirtualTour.js`
- **Highlighting**: `frontend/src/components/Demo/FeatureHighlight.js`
- **Triggers**: Integrated into login screens
- **Content**: 8 interactive steps with AI explanations

### Demo Mode Integration
- **Environment Detection**: Auto-detects demo mode
- **Credential Display**: Shows working demo accounts
- **Feature Explanations**: AI model and capability details
- **Reset Schedule**: Daily data reset at 3 AM UTC

### Authentication System
- **JWT Tokens**: Secure token-based auth
- **Role-based Access**: Admin, Attorney, Client roles
- **Demo Integration**: Special handling for demo accounts
- **Security**: Rate limiting and validation

### AI Integrations
- **Mock Services**: Demo-safe AI implementations
- **Model Support**: GPT-4, Claude 3, Ollama
- **Capabilities**: Document gen, research, analysis
- **Research Tools**: Lex Machina integration

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/legal_estate"

# JWT
JWT_SECRET="your-secret-key"

# Demo Mode
DEMO_MODE=true
PACKAGE_TYPE=demo

# AI Services (demo/mock)
OPENAI_API_KEY=demo
ANTHROPIC_API_KEY=demo
```

### Nginx Configuration
- **Location**: `/etc/nginx/sites-enabled/legalestate.tech`
- **Features**: SSL, caching, API proxy
- **Cache Busting**: Disabled for demo deployment

## 📊 Database Schema

### Core Tables
- **Users**: Authentication and profiles
- **Cases**: Legal case management
- **Clients**: Client information
- **Documents**: File management
- **Tasks**: Task tracking
- **TimeEntries**: Time tracking
- **Billing**: Invoice management

### Demo Data
- Pre-populated with sample cases
- Demo user accounts with different roles
- Sample documents and templates
- Mock billing and time entries

## 🤖 AI Services

### Supported Models
- **OpenAI**: GPT-4 Turbo for document generation
- **Anthropic**: Claude 3 for legal analysis
- **Local**: Ollama for on-premise deployment

### Capabilities
- Document auto-generation
- Legal research assistance
- Contract analysis and review
- Predictive case outcomes
- Risk assessment

## 🛠️ Development

### Available Scripts

#### Frontend
```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
```

#### Backend
```bash
npm run dev        # Development with nodemon
npm start          # Production server
npm run db:seed    # Seed demo data
npm run db:reset   # Reset database
```

### Git Workflow
- **Main Branch**: `package/professional`
- **Commits**: Include comprehensive messages
- **Exclusions**: node_modules, build files, logs

## 🔒 Security Features

- **HTTPS**: SSL/TLS encryption
- **JWT**: Secure token authentication
- **Rate Limiting**: API protection
- **CORS**: Cross-origin security
- **Input Validation**: Data sanitization
- **Role-based Access**: Permission system

## 📝 Documentation

### Additional Docs
- `DEMO_LOGIN_FIX.md` - Login troubleshooting
- `DEMO_PRODUCTION_STATUS.md` - System status
- `PRODUCTION_LOGIN_GUIDE.md` - Production setup
- `scripts/system-mode-guide.md` - Mode management

### API Documentation
- RESTful endpoints with OpenAPI spec
- Authentication required for most endpoints
- Rate limiting: 20 requests per 5 minutes
- JSON request/response format

## 🎬 Demo Showcase

### Virtual Tour Highlights
1. **Welcome Screen**: System overview
2. **Smart Dashboard**: Analytics and insights
3. **AI Document Generation**: Live demonstration
4. **Case Management**: Intelligent workflow
5. **Client Portal**: Communication hub
6. **Legal Research**: AI-powered search
7. **Workflow Automation**: Task management
8. **Demo Features**: System capabilities

### AI Integration Demo
- Real-time document generation
- Contract analysis examples
- Legal research demonstrations
- Predictive analytics showcase

## 📞 Support

### Demo Access
- **Email**: support@legalestate.tech
- **Demo Reset**: Daily at 3:00 AM UTC
- **Session Limit**: 1 hour for demo accounts

### Technical Requirements
- **Browser**: Modern browsers (Chrome, Firefox, Safari)
- **JavaScript**: Enabled
- **Cookies**: Enabled for authentication
- **Network**: HTTPS connection required

---

**🤖 System Status**: Virtual demo ready with AI-powered features
**📅 Last Updated**: September 21, 2025
**💻 Generated with**: Claude Code Assistant