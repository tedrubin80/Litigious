import React from 'react';

const IntegrationShowcase = () => {
  const aiProviders = [
    {
      name: 'ChatGPT (OpenAI)',
      logo: '🤖',
      description: 'Advanced language model for document generation, contract analysis, and legal research.',
      benefits: [
        'Superior document drafting and editing capabilities',
        'Complex legal reasoning and analysis',
        'Natural language understanding for client communications',
        'Code generation for legal automation workflows'
      ],
      useCase: 'Best for: Contract drafting, legal briefs, and complex document analysis'
    },
    {
      name: 'Claude (Anthropic)',
      logo: '🧠',
      description: 'Constitutional AI designed for helpful, harmless, and honest legal assistance.',
      benefits: [
        'Exceptional ethical reasoning in legal contexts',
        'Long-form document analysis and summarization',
        'Nuanced understanding of legal precedent',
        'Safe handling of sensitive client information'
      ],
      useCase: 'Best for: Legal research, case analysis, and ethical legal guidance'
    },
    {
      name: 'Gemini (Google)',
      logo: '💎',
      description: 'Multimodal AI capable of processing text, images, and documents simultaneously.',
      benefits: [
        'Advanced document image analysis and OCR',
        'Multilingual legal document processing',
        'Integration with Google Workspace tools',
        'Real-time collaborative legal research'
      ],
      useCase: 'Best for: Document scanning, multilingual cases, and collaborative workflows'
    }
  ];

  const cloudProviders = [
    {
      name: 'Amazon AWS S3',
      logo: '☁️',
      description: 'Enterprise-grade cloud storage with 99.999999999% durability',
      features: ['Unlimited scalability', 'Advanced encryption', 'Compliance certifications', 'Global CDN']
    },
    {
      name: 'Microsoft OneDrive',
      logo: '📁',
      description: 'Seamless integration with Office 365 and Microsoft ecosystem',
      features: ['Office integration', 'Real-time collaboration', 'Advanced sharing controls', 'Enterprise security']
    },
    {
      name: 'Box Enterprise',
      logo: '📦',
      description: 'Purpose-built for business with advanced governance features',
      features: ['Content governance', 'Workflow automation', 'Advanced permissions', 'External collaboration']
    }
  ];

  const paymentIntegrations = [
    {
      name: 'Stripe',
      logo: '💳',
      description: 'Global payment processing with advanced fraud protection',
      features: ['Credit/debit cards', 'ACH transfers', 'International payments', 'Subscription billing']
    },
    {
      name: 'PayPal',
      logo: '🏦',
      description: 'Trusted digital wallet and payment platform',
      features: ['PayPal accounts', 'Guest checkout', 'Buyer protection', 'Multi-currency']
    },
    {
      name: 'Square',
      logo: '⬜',
      description: 'Comprehensive payment and business tools',
      features: ['In-person payments', 'Online checkout', 'Invoicing', 'Analytics']
    },
    {
      name: 'Klarna',
      logo: '🛍️',
      description: 'Buy Now Pay Later for flexible client payments',
      features: ['Pay in 4 installments', 'Pay in 30 days', 'Financing options', 'Credit scoring']
    },
    {
      name: 'Affirm',
      logo: '💰',
      description: 'Transparent installment financing',
      features: ['Monthly payments', '0% APR options', 'Real-time decisions', 'Flexible terms']
    }
  ];

  const otherIntegrations = [
    { name: 'Microsoft Office 365', icon: '📊' },
    { name: 'Google Workspace', icon: '🌐' },
    { name: 'Zapier Automation', icon: '⚡' },
    { name: 'QuickBooks', icon: '💰' },
    { name: 'DocuSign', icon: '✍️' },
    { name: 'Calendly', icon: '📅' },
    { name: 'Slack', icon: '💬' },
    { name: 'Zoom Video', icon: '📹' },
    { name: 'Lex Machina', icon: '⚖️' },
    { name: 'LangChain AI', icon: '🔗' },
    { name: 'Socket.IO', icon: '🔄' },
    { name: 'Twilio', icon: '📞' }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* LangChain AI Section */}
        <div className="lg:text-center mb-16">
          <h2 className="text-base text-purple-600 font-semibold tracking-wide uppercase">AI-Powered by LangChain</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Multi-Model AI Integration
          </p>
          <p className="mt-4 max-w-3xl text-xl text-gray-500 lg:mx-auto">
            LegalEstate leverages LangChain's powerful framework to integrate multiple AI models, giving you the best capabilities from each provider for different legal tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mb-16">
          {aiProviders.map((provider) => (
            <div key={provider.name} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">{provider.logo}</span>
                <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
              </div>
              
              <p className="text-gray-600 mb-4">{provider.description}</p>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Key Benefits:</h4>
                <ul className="space-y-1">
                  {provider.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-1">✓</span>
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 rounded-md p-3">
                <p className="text-sm text-blue-800 font-medium">{provider.useCase}</p>
              </div>
            </div>
          ))}
        </div>

        {/* LangChain Benefits Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">Why LangChain Integration Matters</h3>
            <p className="mt-2 text-gray-600">The power of multiple AI models working together for your legal practice</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center bg-purple-100 rounded-md mb-4">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Smart Routing</h4>
              <p className="text-sm text-gray-600">Automatically routes tasks to the best AI model for optimal results</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center bg-blue-100 rounded-md mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Quality Assurance</h4>
              <p className="text-sm text-gray-600">Cross-validates AI outputs for accuracy and consistency</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center bg-green-100 rounded-md mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Cost Optimization</h4>
              <p className="text-sm text-gray-600">Uses the most cost-effective model for each specific task</p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center bg-red-100 rounded-md mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Fallback Protection</h4>
              <p className="text-sm text-gray-600">Seamlessly switches between models if one becomes unavailable</p>
            </div>
          </div>
        </div>

        {/* Payment Processing Section */}
        <div className="mb-16">
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">Unified Payment Processing</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Accept Payments Your Way
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Multiple payment processors plus Buy Now Pay Later options for flexible client billing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-5">
            {paymentIntegrations.map((provider) => (
              <div key={provider.name} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="text-center mb-4">
                  <span className="text-3xl mb-2 block">{provider.logo}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                </div>
                
                <p className="text-gray-600 mb-4 text-sm">{provider.description}</p>
                
                <ul className="space-y-1">
                  {provider.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2 text-xs">✓</span>
                      <span className="text-xs text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Storage Section */}
        <div className="mb-16">
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Multi-Cloud Storage</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Your Documents, Anywhere
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Choose your preferred cloud provider or use multiple providers for redundancy and compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {cloudProviders.map((provider) => (
              <div key={provider.name} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{provider.logo}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                </div>
                
                <p className="text-gray-600 mb-4">{provider.description}</p>
                
                <ul className="space-y-2">
                  {provider.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-blue-500 mr-2">●</span>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Other Integrations */}
        <div>
          <div className="lg:text-center mb-12">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">200+ Integrations</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Connect Your Existing Tools
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Seamlessly integrate with the tools your practice already uses.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {otherIntegrations.map((integration) => (
              <div key={integration.name} className="bg-white rounded-lg shadow p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <span className="text-2xl mb-2 block">{integration.icon}</span>
                <span className="text-sm text-gray-900 font-medium">{integration.name}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
              View all integrations →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationShowcase;