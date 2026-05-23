# Legal Estate System Mode Management Guide

## Overview
The Legal Estate system now supports seamless switching between Demo Mode and Production Mode.

## Current System Status
- **Demo Mode**: Active with daily automated resets at 3:00 AM UTC
- **Login Screen**: Enhanced with prominent demo credentials display
- **Production Mode**: Ready to activate when needed

## Available Scripts

### 1. Demo Mode Management
```bash
# Check demo status
/var/www/html/scripts/manage-demo.sh status

# Manual demo reset
/var/www/html/scripts/manage-demo.sh reset

# View demo credentials
/var/www/html/scripts/manage-demo.sh credentials
```

### 2. Production Mode Switching
```bash
# Test production readiness
/var/www/html/scripts/test-production-script.sh

# Switch to production mode (interactive)
sudo /var/www/html/scripts/enable-production.sh
```

### 3. Production Mode Management (after switch)
```bash
# Check production status
/var/www/html/scripts/manage-production.sh status

# Restart production services
/var/www/html/scripts/manage-production.sh restart

# View production logs
/var/www/html/scripts/manage-production.sh logs

# Create production backup
/var/www/html/scripts/manage-production.sh backup
```

## Mode Switching Process

### Demo → Production
1. **Backup Current State**: Automatically backs up demo configuration
2. **Stop Services**: Gracefully stops all demo services
3. **Switch Configuration**: Activates production environment files
4. **Disable Demo Features**: Removes demo reset cron jobs
5. **Rebuild Frontend**: Compiles frontend without demo elements
6. **Clear Demo Data**: Removes demo users and sample data
7. **Start Production Services**: Launches production-ready services
8. **Setup Monitoring**: Configures production health monitoring

### Production → Demo
- Use the demo reset script to restore demo functionality
- Reinstall demo cron jobs if needed

## Key Files

### Configuration Files
- **Demo Backend**: `/var/www/html/backend/.env`
- **Demo Frontend**: `/var/www/html/frontend/.env`
- **Production Backend**: `/var/www/html/backend/.env.production`
- **Production Frontend**: `/var/www/html/frontend/.env.production`

### Management Scripts
- **Demo Management**: `/var/www/html/scripts/manage-demo.sh`
- **Demo Reset**: `/var/www/html/scripts/reset-demo.sh`
- **Production Switch**: `/var/www/html/scripts/enable-production.sh`
- **Production Management**: `/var/www/html/scripts/manage-production.sh`
- **System Test**: `/var/www/html/scripts/test-production-script.sh`

### Enhanced UI Components
- **Login Screen**: `/var/www/html/frontend/src/components/Auth/Login.js`
- **Demo Banner**: `/var/www/html/frontend/src/components/Demo/DemoBanner.js`
- **Demo Watermark**: `/var/www/html/frontend/src/components/Demo/DemoWatermark.js`

## Production Checklist

Before switching to production mode, ensure:

- [ ] SSL certificates are configured
- [ ] DNS settings point to production server
- [ ] Email SMTP settings are configured
- [ ] Payment processor API keys are set
- [ ] AI provider API keys are configured
- [ ] External monitoring is setup
- [ ] Backup strategy is in place
- [ ] Security settings are reviewed

## Monitoring

### Demo Mode
- Automatic daily reset at 3:00 AM UTC
- Demo health monitoring every 15 minutes
- Logs at `/var/www/html/logs/demo-*.log`

### Production Mode
- Production health monitoring every 15 minutes
- SSL certificate checking
- Database connectivity monitoring
- Service restart on failure
- Logs at `/var/www/html/logs/production-*.log`

## Support

For issues or questions:
- **Email**: support@legalestate.tech
- **Logs**: Check respective log files in `/var/www/html/logs/`
- **Status**: Use the appropriate management script status command