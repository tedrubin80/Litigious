import React from 'react';

const PricingSection = () => {
  const plans = [
    {
      name: 'Solo Practice',
      price: '$99',
      period: '/month',
      description: 'Perfect for individual attorneys and small practices',
      features: [
        'Up to 100 active cases',
        '5 GB cloud storage',
        'Basic AI document generation',
        'Client portal access',
        'Email support',
        'Standard integrations'
      ],
      buttonText: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: '$199',
      period: '/month',
      description: 'Ideal for growing law firms with multiple attorneys',
      features: [
        'Up to 500 active cases',
        '50 GB cloud storage',
        'Advanced AI with ChatGPT & Claude',
        'Multi-cloud storage options',
        'Priority support',
        'Advanced analytics',
        'Custom workflows',
        'Calendar integration'
      ],
      buttonText: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'Comprehensive solution for large firms and organizations',
      features: [
        'Unlimited cases',
        'Unlimited storage',
        'Full AI suite (GPT-4, Claude, Gemini)',
        'Multi-tenant architecture',
        'White-label options',
        '24/7 dedicated support',
        'Custom integrations',
        'Advanced security features',
        'Training & onboarding'
      ],
      buttonText: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Pricing</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Choose the plan that fits your practice. All plans include a 30-day free trial.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-lg shadow-lg ${
                plan.popular
                  ? 'ring-2 ring-blue-600 bg-blue-50'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-500">{plan.description}</p>
                
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-lg text-gray-500">{plan.period}</span>
                </div>
                
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-1 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-8">
                  <button
                    className={`w-full py-3 px-6 rounded-md font-medium ${
                      plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    } transition-colors duration-200`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            All plans include SSL encryption, regular backups, and 99.9% uptime guarantee.
          </p>
          <p className="mt-2 text-gray-500">
            Need a custom solution? <a href="#" className="text-blue-600 hover:text-blue-500">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;