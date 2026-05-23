import React, { useState, useEffect } from 'react';

// SVG Icon Components
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const XMarkIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 1.5L5 6l1.5 1.5L5 9l1.5 1.5L5 12l1.5 1.5L5 15l1.5 1.5L5 18l1.5 1.5L5 21M19 3l-1.5 1.5L19 6l-1.5 1.5L19 9l-1.5 1.5L19 12l-1.5 1.5L19 15l-1.5 1.5L19 18l-1.5 1.5L19 21" />
  </svg>
);

const CpuChipIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2}/>
    <rect x="9" y="9" width="6" height="6" strokeWidth={2}/>
    <path d="M9 1v3m6-3v3m4 5h3m-3 6h3m-20-6h3m-3 6h3M9 20v3m6-3v3" strokeWidth={2}/>
  </svg>
);

const UserGroupIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const VirtualTour = ({ isActive, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const tourSteps = [
    {
      id: 'welcome',
      title: '🎭 Welcome to Legal Estate Demo',
      content: 'This virtual walkthrough will show you the key features of our Legal Practice Management System, including powerful AI integrations.',
      position: 'center',
      highlight: null,
      actions: ['Start Tour']
    },
    {
      id: 'dashboard',
      title: '📊 Smart Dashboard',
      content: 'Your command center with real-time analytics, case summaries, and AI-powered insights. The dashboard learns from your usage patterns.',
      position: 'top',
      highlight: '.dashboard-overview',
      actions: ['Next'],
      features: ['Real-time case updates', 'AI-powered analytics', 'Customizable widgets', 'Quick action buttons']
    },
    {
      id: 'ai-integration',
      title: '🤖 AI Document Generation',
      content: 'Our AI can generate legal documents, analyze case files, and provide intelligent suggestions based on your case data.',
      position: 'right',
      highlight: '.ai-features',
      actions: ['Try AI Demo', 'Next'],
      features: [
        'Document auto-generation',
        'Legal research assistance',
        'Contract analysis',
        'Predictive case outcomes'
      ],
      aiDetails: {
        models: ['GPT-4 Turbo', 'Claude 3', 'Ollama Local'],
        capabilities: ['Document Generation', 'Legal Research', 'Case Analysis', 'Risk Assessment']
      }
    },
    {
      id: 'case-management',
      title: '⚖️ Intelligent Case Management',
      content: 'Manage cases with AI-powered timeline suggestions, deadline tracking, and automated task creation.',
      position: 'bottom',
      highlight: '.case-management',
      actions: ['View Sample Case', 'Next'],
      features: [
        'Automated timeline creation',
        'Smart deadline reminders',
        'AI case analysis',
        'Predictive scheduling'
      ]
    },
    {
      id: 'client-portal',
      title: '👥 Client Communication Hub',
      content: 'Secure client portal with AI-powered updates, document sharing, and intelligent status reporting.',
      position: 'left',
      highlight: '.client-features',
      actions: ['View Client View', 'Next'],
      features: [
        'Secure document sharing',
        'AI-generated status updates',
        'Automated client notifications',
        'Real-time case progress'
      ]
    },
    {
      id: 'ai-research',
      title: '🔍 AI Legal Research',
      content: 'Integrated with Lex Machina and powered by multiple AI models for comprehensive legal research and case precedent analysis.',
      position: 'top',
      highlight: '.research-tools',
      actions: ['Try Research', 'Next'],
      features: [
        'Lex Machina integration',
        'Multi-AI research',
        'Precedent analysis',
        'Citation generation'
      ],
      aiDetails: {
        integrations: ['Lex Machina API', 'Westlaw Connect', 'Google Scholar'],
        research: ['Case law analysis', 'Statutory research', 'Regulatory compliance']
      }
    },
    {
      id: 'automation',
      title: '⚡ Workflow Automation',
      content: 'AI-powered automation for routine tasks: document review, deadline management, billing, and client communications.',
      position: 'center',
      highlight: '.automation-features',
      actions: ['See Automation', 'Next'],
      features: [
        'Smart document review',
        'Automated billing',
        'Task prioritization',
        'Email automation'
      ]
    },
    {
      id: 'demo-features',
      title: '🎭 Demo Mode Features',
      content: 'In demo mode, explore all features safely. Data resets daily at 3:00 AM UTC. Perfect for testing and training.',
      position: 'center',
      highlight: null,
      actions: ['Explore Demo', 'Finish Tour'],
      demoInfo: {
        resetTime: '3:00 AM UTC Daily',
        accounts: ['Admin', 'Attorney', 'Paralegal', 'Client'],
        limitations: ['50 cases max', '10 documents per case', '1-hour sessions']
      }
    }
  ];

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isActive]);

  const currentStepData = tourSteps[currentStep];

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem('demoTourCompleted', 'true');
    onComplete?.();
    onClose?.();
  };

  const skipTour = () => {
    localStorage.setItem('demoTourSkipped', 'true');
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      {/* Highlight overlay */}
      {currentStepData.highlight && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full">
            {/* This would highlight the specific element */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
          </div>
        </div>
      )}

      {/* Tour Modal */}
      <div className={`absolute ${getPositionClasses(currentStepData.position)} transform transition-all duration-500`}>
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{currentStepData.title}</h3>
                <p className="text-sm text-gray-500">Step {currentStep + 1} of {tourSteps.length}</p>
              </div>
            </div>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 mb-4">{currentStepData.content}</p>

            {/* Features List */}
            {currentStepData.features && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Features:</h4>
                <ul className="space-y-1">
                  {currentStepData.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <SparklesIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Details */}
            {currentStepData.aiDetails && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <CpuChipIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-sm font-semibold text-blue-900">AI Integration</h4>
                </div>
                {currentStepData.aiDetails.models && (
                  <div className="mb-2">
                    <p className="text-xs text-blue-700 font-medium">AI Models:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentStepData.aiDetails.models.map((model, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {currentStepData.aiDetails.capabilities && (
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Capabilities:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentStepData.aiDetails.capabilities.map((cap, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Demo Info */}
            {currentStepData.demoInfo && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <UserGroupIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h4 className="text-sm font-semibold text-green-900">Demo Information</h4>
                </div>
                <div className="space-y-1 text-xs text-green-800">
                  <p><strong>Reset Schedule:</strong> {currentStepData.demoInfo.resetTime}</p>
                  <p><strong>Available Accounts:</strong> {currentStepData.demoInfo.accounts.join(', ')}</p>
                  <p><strong>Demo Limits:</strong> {currentStepData.demoInfo.limitations.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </button>

            <div className="flex space-x-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getPositionClasses = (position) => {
  switch (position) {
    case 'top':
      return 'top-8 left-1/2 -translate-x-1/2';
    case 'bottom':
      return 'bottom-8 left-1/2 -translate-x-1/2';
    case 'left':
      return 'left-8 top-1/2 -translate-y-1/2';
    case 'right':
      return 'right-8 top-1/2 -translate-y-1/2';
    case 'center':
    default:
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
  }
};

export default VirtualTour;