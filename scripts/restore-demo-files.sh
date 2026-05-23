#!/bin/bash

# Restore Demo Files Script
# This script restores custom demo files after the nightly build process
# to ensure our no-authentication demo setup persists

# Configuration
FRONTEND_BUILD_DIR="/var/www/html/frontend/build"
DEMO_TEMPLATES_DIR="/var/www/html/scripts/demo-templates"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[DEMO-RESTORE]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create demo templates directory if it doesn't exist
mkdir -p "$DEMO_TEMPLATES_DIR"

print_step "Restoring custom demo files after build..."

# Restore custom index.html with demo redirect logic
cat > "$FRONTEND_BUILD_DIR/index.html" << 'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Legal Estate Management - Demo</title><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="version" content="20250921-persistent"><script>
// Immediate redirect before React loads
(function() {
    const hasHash = window.location.hash;
    const isDemoMode = localStorage.getItem('demoMode') === 'true';

    console.log('🎭 Pre-load check:', { hasHash: !!hasHash, isDemoMode, hash: hasHash });

    // If we have demo mode or dashboard hash, load React app
    if (isDemoMode || hasHash.includes('/app/dashboard')) {
        console.log('✅ Demo mode or dashboard route, loading React app...');
        // Load React app normally
    } else if (!hasHash && !isDemoMode) {
        // Redirect immediately to demo entry - don't load React at all
        console.log('🎭 No demo mode detected, redirecting to demo entry page...');
        window.location.replace('/demo-entry.html');
        return; // Stop execution
    }
})();
</script><script defer="defer" src="/static/js/main.f55b8b5e.js?demo=20250921-persistent"></script><link href="/static/css/main.cd8f1ac0.css?demo=20250921-persistent" rel="stylesheet"></head><body><div id="root"></div></body></html>
EOF

print_success "Restored custom index.html with demo redirect logic"

# Restore demo-entry.html
cat > "$FRONTEND_BUILD_DIR/demo-entry.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Legal Estate Management - Demo Entry</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .demo-container {
            text-align: center;
            max-width: 600px;
            padding: 3rem;
        }

        .logo {
            font-size: 4rem;
            margin-bottom: 1rem;
        }

        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 300;
        }

        .subtitle {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin: 3rem 0;
        }

        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .feature h3 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
        }

        .feature p {
            font-size: 0.9rem;
            opacity: 0.8;
            line-height: 1.4;
        }

        .demo-buttons {
            display: flex;
            gap: 1.5rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 3rem;
        }

        .demo-btn {
            padding: 1rem 2rem;
            font-size: 1.1rem;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            min-width: 200px;
            justify-content: center;
        }

        .primary-btn {
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
        }

        .primary-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.6);
        }

        .secondary-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .secondary-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        .ai-badge {
            display: inline-block;
            background: linear-gradient(45deg, #ff9a9e, #fecfef);
            color: #333;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-left: 0.5rem;
            animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
            from { box-shadow: 0 0 10px rgba(255, 154, 158, 0.5); }
            to { box-shadow: 0 0 20px rgba(255, 154, 158, 0.8); }
        }

        .demo-info {
            background: rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 10px;
            margin-top: 2rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 768px) {
            .demo-container {
                padding: 2rem 1rem;
            }

            h1 {
                font-size: 2rem;
            }

            .features {
                grid-template-columns: 1fr;
            }

            .demo-buttons {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="demo-container">
        <div class="logo">⚖️</div>
        <h1>Legal Estate</h1>
        <p class="subtitle">
            AI-Powered Legal Practice Management
            <span class="ai-badge">🎭 Demo Mode</span>
        </p>

        <div class="features">
            <div class="feature">
                <div class="feature-icon">🤖</div>
                <h3>AI Document Generation</h3>
                <p>Generate contracts, pleadings, and legal documents with GPT-4 and Claude 3</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📊</div>
                <h3>Smart Analytics</h3>
                <p>Predictive case outcomes and legal research with Lex Machina integration</p>
            </div>
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <h3>Workflow Automation</h3>
                <p>Automated time tracking, billing, and case management workflows</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🔗</div>
                <h3>Real-time Collaboration</h3>
                <p>WebRTC meetings, document collaboration, and team communication</p>
            </div>
        </div>

        <div class="demo-buttons">
            <button class="demo-btn primary-btn" onclick="enterDemo()">
                🚀 Enter Dashboard
            </button>
            <a href="/#/app/dashboard" class="demo-btn secondary-btn">
                🎯 Direct Access
            </a>
        </div>

        <div class="demo-info">
            <p><strong>🎭 This is a fully functional demo</strong></p>
            <p>Explore all features with sample data • No authentication required • Reset daily at 3:00 AM UTC</p>
        </div>
    </div>

    <script>
        function enterDemo() {
            console.log('🎭 Entering demo mode without authentication...');

            // Set demo mode directly without authentication
            localStorage.setItem('demoMode', 'true');
            localStorage.setItem('loginType', 'demo');

            // Go directly to dashboard
            console.log('🎯 Going directly to dashboard...');
            window.location.href = '/#/app/dashboard';
        }

        // Add some interactive effects
        document.querySelectorAll('.feature').forEach(feature => {
            feature.addEventListener('mouseenter', () => {
                feature.style.transform = 'translateY(-5px)';
                feature.style.boxShadow = '0 10px 25px rgba(255, 255, 255, 0.1)';
            });

            feature.addEventListener('mouseleave', () => {
                feature.style.transform = 'translateY(0)';
                feature.style.boxShadow = 'none';
            });
        });
    </script>
</body>
</html>
EOF

print_success "Restored demo-entry.html with no-auth demo setup"

# Set proper permissions
chown www-data:www-data "$FRONTEND_BUILD_DIR/index.html" 2>/dev/null || true
chown www-data:www-data "$FRONTEND_BUILD_DIR/demo-entry.html" 2>/dev/null || true
chmod 644 "$FRONTEND_BUILD_DIR/index.html" 2>/dev/null || true
chmod 644 "$FRONTEND_BUILD_DIR/demo-entry.html" 2>/dev/null || true

print_success "Set proper file permissions"

# Update the main JavaScript reference in index.html to match current build
if [ -f "$FRONTEND_BUILD_DIR/static/js/main."*.js ]; then
    MAIN_JS_FILE=$(basename $(ls "$FRONTEND_BUILD_DIR/static/js/main."*.js | head -1))
    sed -i "s/main\.[a-f0-9]*\.js/$MAIN_JS_FILE/g" "$FRONTEND_BUILD_DIR/index.html"
    print_success "Updated JavaScript reference to: $MAIN_JS_FILE"
fi

print_step "Demo file restoration completed successfully"
print_success "✅ Demo setup will persist through nightly resets"
EOF