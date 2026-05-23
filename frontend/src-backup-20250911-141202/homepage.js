import React, { useState } from 'react';
import Dashboard from './Dashboard';

function LegalEstateHomepage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const features = [
    {
      icon: "📋",
      title: "Case Management",
      description: "Complete case lifecycle tracking from intake to settlement with automated workflows."
    },
    {
      icon: "🏥",
      title: "Medical Records",
      description: "Centralized medical provider tracking and automated records management."
    },
    {
      icon: "💰",
      title: "Settlement Tracking", 
      description: "Advanced settlement calculators and financial reporting tools."
    },
    {
      icon: "🚗",
      title: "Incident Reconstruction",
      description: "Detailed accident reconstruction tools with photo management."
    },
    {
      icon: "👥",
      title: "Client Portal",
      description: "Secure client communication portal with document sharing."
    },
    {
      icon: "📊", 
      title: "Analytics & Reports",
      description: "Comprehensive reporting suite with case metrics and insights."
    }
  ];

  const pricingPlans = [
    {
      name: "Solo",
      price: "$99",
      period: "/month",
      description: "For solo practitioners",
      features: [
        "Up to 100 active cases",
        "Basic case management", 
        "Client portal",
        "Email support",
        "2GB storage"
      ],
      isPopular: false
    },
    {
      name: "Practice",
      price: "$299", 
      period: "/month",
      description: "For small to medium firms",
      features: [
        "Up to 500 active cases",
        "Advanced case management",
        "Medical records integration", 
        "Settlement tracking",
        "Priority support",
        "10GB storage",
        "Team collaboration"
      ],
      isPopular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large firms",
      features: [
        "Unlimited cases",
        "Full feature suite",
        "Custom integrations",
        "24/7 dedicated support", 
        "Unlimited storage",
        "Advanced analytics",
        "On-premise option"
      ],
      isPopular: false
    }
  ];

  // Button Handlers
  const handleGetStarted = () => {
    setShowSignup(true);
  };


  const handleCloseModal = () => {
    setShowSignup(false);
    setShowLogin(false);
    setLoginError('');
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        handleCloseModal();
      } else {
        const error = await response.json();
        setLoginError(error.message || 'Invalid email or password');
      }
    } catch (error) {
      setLoginError('Unable to connect to server. Please try again later.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsLoggedIn(false);
  };

  const handleSmoothScroll = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ 
      behavior: 'smooth' 
    });
    setIsMenuOpen(false);
  };

  const styles = {
    container: { minHeight: '100vh', backgroundColor: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' },
    nav: { backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #e5e7eb' },
    navContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' },
    logo: { fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb', cursor: 'pointer' },
    navLinks: { display: 'flex', gap: '2rem', alignItems: 'center' },
    navLink: { color: '#4b5563', textDecoration: 'none', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'color 0.3s' },
    button: { backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.3s' },
    hero: { background: 'linear-gradient(135deg, #f8fafc 0%, white 50%, #f1f5f9 100%)', padding: '4rem 1rem', textAlign: 'center' },
    heroContent: { maxWidth: '1200px', margin: '0 auto' },
    heroTitle: { fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '700', color: '#1f2937', marginBottom: '1rem', lineHeight: '1.2' },
    heroTitleSpan: { color: '#2563eb', display: 'block' },
    heroText: { fontSize: '1.125rem', color: '#6b7280', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto', lineHeight: '1.6' },
    heroButtons: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' },
    heroButtonPrimary: { backgroundColor: '#2563eb', color: 'white', padding: '0.75rem 2rem', borderRadius: '0.5rem', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.3s' },
    heroButtonSecondary: { backgroundColor: 'transparent', color: '#2563eb', border: '2px solid #2563eb', padding: '0.75rem 2rem', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s' },
    section: { padding: '4rem 1rem' },
    sectionGray: { padding: '4rem 1rem', backgroundColor: '#f9fafb' },
    sectionContent: { maxWidth: '1200px', margin: '0 auto' },
    sectionTitle: { fontSize: '2rem', fontWeight: '700', textAlign: 'center', marginBottom: '1rem', color: '#1f2937' },
    sectionSubtitle: { fontSize: '1.125rem', color: '#6b7280', textAlign: 'center', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' },
    featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' },
    featureCard: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' },
    featureIcon: { fontSize: '2rem', marginBottom: '1rem' },
    featureTitle: { fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' },
    featureDescription: { color: '#6b7280', lineHeight: '1.6', fontSize: '0.875rem' },
    pricingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' },
    pricingCard: { borderRadius: '0.75rem', padding: '1.5rem', border: '2px solid', backgroundColor: 'white' },
    pricingCardPopular: { borderColor: '#2563eb', transform: 'scale(1.02)' },
    pricingCardRegular: { borderColor: '#e5e7eb' },
    pricingBadge: { backgroundColor: '#2563eb', color: 'white', fontSize: '0.75rem', fontWeight: '500', padding: '0.25rem 0.75rem', borderRadius: '9999px', display: 'inline-block', marginBottom: '1rem' },
    pricingName: { fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' },
    pricingPrice: { fontSize: '2rem', fontWeight: '700', color: '#1f2937' },
    pricingPeriod: { color: '#6b7280', fontSize: '0.875rem' },
    pricingDescription: { color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' },
    pricingFeatures: { listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' },
    pricingFeature: { display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem' },
    pricingCheck: { color: '#10b981', marginRight: '0.5rem', fontSize: '0.875rem' },
    pricingFeatureText: { color: '#374151' },
    pricingButton: { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', border: 'none', fontSize: '0.875rem', transition: 'background-color 0.3s' },
    pricingButtonPopular: { backgroundColor: '#2563eb', color: 'white' },
    pricingButtonRegular: { backgroundColor: '#f3f4f6', color: '#1f2937' },
    footer: { backgroundColor: '#1f2937', color: 'white', padding: '3rem 1rem 2rem 1rem' },
    footerContent: { maxWidth: '1200px', margin: '0 auto', textAlign: 'center' },
    footerLogo: { fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' },
    footerText: { color: '#9ca3af', marginBottom: '2rem', fontSize: '0.875rem' },
    footerBottom: { borderTop: '1px solid #374151', paddingTop: '1.5rem', color: '#9ca3af', fontSize: '0.75rem' },
    // Modal Styles
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '0.75rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    modalTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' },
    closeButton: { backgroundColor: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' },
    formGroup: { marginBottom: '1rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' },
    input: { width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' },
    submitButton: { width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }
  };

  // If user is logged in, show dashboard
  if (isLoggedIn && user) {
    return React.createElement(Dashboard, { 
      user: user,
      onLogout: handleLogout
    });
  }

  return React.createElement('div', { style: styles.container },
    // Navigation
    React.createElement('nav', { style: styles.nav },
      React.createElement('div', { style: styles.navContent },
        React.createElement('div', { 
          style: styles.logo,
          onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
        }, '🏛️ Legal Estate'),
        React.createElement('div', { style: { ...styles.navLinks, display: 'flex' } },
          React.createElement('a', { 
            style: styles.navLink,
            onClick: () => handleSmoothScroll('features')
          }, 'Features'),
          React.createElement('a', { 
            style: styles.navLink,
            onClick: () => handleSmoothScroll('pricing')
          }, 'Pricing')
        ),
        React.createElement('div', { style: { ...styles.navLinks, display: 'flex' } },
          React.createElement('button', { 
            style: { ...styles.button, backgroundColor: 'transparent', color: '#2563eb' },
            onClick: () => setShowLogin(true)
          }, 'Sign In'),
          React.createElement('button', { 
            style: styles.button,
            onClick: handleGetStarted
          }, 'Get Started')
        )
      )
    ),

    // Hero Section
    React.createElement('section', { style: styles.hero },
      React.createElement('div', { style: styles.heroContent },
        React.createElement('h1', { style: styles.heroTitle },
          'Legal Practice',
          React.createElement('span', { style: styles.heroTitleSpan }, 'Management System')
        ),
        React.createElement('p', { style: styles.heroText },
          'Comprehensive case management, medical records tracking, and settlement tools designed for personal injury attorneys.'
        ),
        React.createElement('div', { style: styles.heroButtons },
          React.createElement('button', { 
            style: styles.heroButtonPrimary,
            onClick: handleGetStarted
          }, 'Start Free Trial'),
          React.createElement('button', { 
            style: styles.heroButtonSecondary,
            onClick: () => setShowLogin(true)
          }, 'Sign In')
        )
      )
    ),

    // Features Section
    React.createElement('section', { id: 'features', style: styles.sectionGray },
      React.createElement('div', { style: styles.sectionContent },
        React.createElement('div', { style: { textAlign: 'center', marginBottom: '3rem' } },
          React.createElement('h2', { style: styles.sectionTitle }, 'Core Features'),
          React.createElement('p', { style: styles.sectionSubtitle }, 'Essential tools for modern legal practice management.')
        ),
        React.createElement('div', { style: styles.featuresGrid },
          ...features.map((feature, index) =>
            React.createElement('div', { key: index, style: styles.featureCard },
              React.createElement('div', { style: styles.featureIcon }, feature.icon),
              React.createElement('h3', { style: styles.featureTitle }, feature.title),
              React.createElement('p', { style: styles.featureDescription }, feature.description)
            )
          )
        )
      )
    ),


    // Pricing Section
    React.createElement('section', { id: 'pricing', style: styles.section },
      React.createElement('div', { style: styles.sectionContent },
        React.createElement('div', { style: { textAlign: 'center', marginBottom: '3rem' } },
          React.createElement('h2', { style: styles.sectionTitle }, 'Pricing Plans'),
          React.createElement('p', { style: styles.sectionSubtitle }, 'Choose the plan that fits your practice needs.')
        ),
        React.createElement('div', { style: styles.pricingGrid },
          ...pricingPlans.map((plan, index) =>
            React.createElement('div', {
              key: index,
              style: {
                ...styles.pricingCard,
                ...(plan.isPopular ? styles.pricingCardPopular : styles.pricingCardRegular)
              }
            },
              plan.isPopular && React.createElement('div', { style: styles.pricingBadge }, 'Popular'),
              React.createElement('h3', { style: styles.pricingName }, plan.name),
              React.createElement('div', { style: { marginBottom: '1rem' } },
                React.createElement('span', { style: styles.pricingPrice }, plan.price),
                React.createElement('span', { style: styles.pricingPeriod }, plan.period)
              ),
              React.createElement('p', { style: styles.pricingDescription }, plan.description),
              React.createElement('ul', { style: styles.pricingFeatures },
                ...plan.features.map((feature, featureIndex) =>
                  React.createElement('li', { key: featureIndex, style: styles.pricingFeature },
                    React.createElement('span', { style: styles.pricingCheck }, '✓'),
                    React.createElement('span', { style: styles.pricingFeatureText }, feature)
                  )
                )
              ),
              React.createElement('button', {
                style: {
                  ...styles.pricingButton,
                  ...(plan.isPopular ? styles.pricingButtonPopular : styles.pricingButtonRegular)
                },
                onClick: handleGetStarted
              }, plan.price === 'Custom' ? 'Contact Sales' : 'Get Started')
            )
          )
        )
      )
    ),

    // Footer
    React.createElement('footer', { style: styles.footer },
      React.createElement('div', { style: styles.footerContent },
        React.createElement('div', { style: styles.footerLogo }, '🏛️ Legal Estate'),
        React.createElement('p', { style: styles.footerText }, 'Professional legal practice management software designed for personal injury attorneys.'),
        React.createElement('div', { style: styles.footerBottom }, '© 2024 Legal Estate. All rights reserved.')
      )
    ),

    // Demo Modal
    false && React.createElement('div', { style: styles.modal },
      React.createElement('div', { style: styles.modalContent },
        React.createElement('div', { style: styles.modalHeader },
          React.createElement('h3', { style: styles.modalTitle }, 'System Demo'),
          React.createElement('button', { 
            style: styles.closeButton,
            onClick: handleCloseModal
          }, '×')
        ),
        React.createElement('div', null,
          React.createElement('p', { style: { marginBottom: '1rem' } }, 'Interactive demo coming soon! For now, try our demo user account:'),
          React.createElement('div', { style: { backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.875rem' } },
            React.createElement('strong', null, 'Demo Credentials:'),
            React.createElement('br'),
            'Email: demo@legalestate.com',
            React.createElement('br'),
            'Password: demo123'
          ),
          React.createElement('button', { 
            style: { ...styles.submitButton, marginTop: '1rem' },
            onClick: () => {
              handleCloseModal();
              handleDemoUser();
            }
          }, 'Try Demo User')
        )
      )
    ),

    // Login Modal
    showLogin && React.createElement('div', { style: styles.modal },
      React.createElement('div', { style: styles.modalContent },
        React.createElement('div', { style: styles.modalHeader },
          React.createElement('h3', { style: styles.modalTitle }, 'Sign In'),
          React.createElement('button', { 
            style: styles.closeButton,
            onClick: handleCloseModal
          }, '×')
        ),
        React.createElement('form', { 
          onSubmit: (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const email = formData.get('email');
            const password = formData.get('password');
            handleLogin(email, password);
          }
        },
          loginError && React.createElement('div', { 
            style: { 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#dc2626', 
              padding: '0.75rem', 
              borderRadius: '0.375rem', 
              marginBottom: '1rem',
              fontSize: '0.875rem',
              whiteSpace: 'pre-line'
            } 
          }, loginError),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.label }, 'Email'),
            React.createElement('input', { 
              type: 'email', 
              name: 'email',
              style: styles.input,
              placeholder: 'Enter your email',
              required: true
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.label }, 'Password'),
            React.createElement('input', { 
              type: 'password', 
              name: 'password',
              style: styles.input,
              placeholder: 'Enter your password',
              required: true
            })
          ),
          React.createElement('button', { 
            type: 'submit',
            style: styles.submitButton
          }, 'Sign In'),
          React.createElement('div', { 
            style: { 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            } 
          },
            React.createElement('strong', null, 'Demo Accounts:'),
            React.createElement('br'),
            '👤 Admin: admin@legalestate.com / admin123',
            React.createElement('br'),
            '👤 User: demo@legalestate.com / demo123'
          )
        )
      )
    ),

    // Signup Modal
    showSignup && React.createElement('div', { style: styles.modal },
      React.createElement('div', { style: styles.modalContent },
        React.createElement('div', { style: styles.modalHeader },
          React.createElement('h3', { style: styles.modalTitle }, 'Get Started'),
          React.createElement('button', { 
            style: styles.closeButton,
            onClick: handleCloseModal
          }, '×')
        ),
        React.createElement('form', { 
          onSubmit: (e) => {
            e.preventDefault();
            alert('Account creation coming soon! For now, try the demo user account.');
            handleCloseModal();
          }
        },
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.label }, 'Full Name'),
            React.createElement('input', { 
              type: 'text', 
              style: styles.input,
              placeholder: 'Enter your full name',
              required: true
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.label }, 'Email'),
            React.createElement('input', { 
              type: 'email', 
              style: styles.input,
              placeholder: 'Enter your email',
              required: true
            })
          ),
          React.createElement('div', { style: styles.formGroup },
            React.createElement('label', { style: styles.label }, 'Law Firm'),
            React.createElement('input', { 
              type: 'text', 
              style: styles.input,
              placeholder: 'Enter your law firm name'
            })
          ),
          React.createElement('button', { 
            type: 'submit',
            style: styles.submitButton
          }, 'Start Free Trial')
        )
      )
    )
  );
}

export default LegalEstateHomepage;