import React from 'react';

const PricingSection = () => {
  const plans = [
    {
      name: 'Solo Practice',
      price: '$149',
      period: '/month',
      yearlyPrice: '$1,490',
      yearlyPeriod: '/year',
      savings: 'save 17%',
      description: 'Perfect for solo practitioners and small firms',
      features: [
        '1 Attorney License + 1 Free Paralegal',
        'Up to 100 Active Cases',
        'Complete Case Management (intake to settlement)',
        'Time Tracking & Billing',
        'Client Portal & Communication',
        'Document Management (5GB storage)',
        'Settlement Calculator',
        'Basic Reporting',
        'Email Support',
        'Mobile App Access'
      ],
      buttonText: 'Start Free Trial',
      popular: false,
      mostPopularFor: 'Solo attorneys, new practices'
    },
    {
      name: 'Growing Firm',
      price: '$99',
      period: '/user/month',
      yearlyPrice: '$990',
      yearlyPeriod: '/user/year',
      savings: 'save 17%',
      description: 'Designed for small to mid-size firms',
      features: [
        'Everything in Solo Practice, Plus:',
        'Unlimited Cases & Clients',
        'Advanced Medical Records Tracking',
        'Automated Settlement Tracking',
        'Team Collaboration Tools',
        'Internal Chat System with case logging',
        'Advanced Reporting & Analytics',
        'API Integrations (Zoom, DocuSign, QuickBooks)',
        'Document Storage (25GB per user)',
        'Phone & Email Support',
        'Custom Training Session'
      ],
      buttonText: 'Start Free Trial',
      popular: true,
      mostPopularFor: '2-25 attorney firms, personal injury specialists'
    },
    {
      name: 'Enterprise Firm',
      price: '$79',
      period: '/user/month',
      yearlyPrice: '$790',
      yearlyPeriod: '/user/year',
      savings: 'save 17%',
      description: 'For large firms and multi-location practices',
      features: [
        'Everything in Growing Firm, Plus:',
        'Unlimited Storage',
        'White-Label Client Portal',
        'Advanced Security & Compliance',
        'Custom Integrations',
        'Dedicated Account Manager',
        '24/7 Priority Support',
        'Custom Reporting',
        'SSO Integration',
        'Multi-Location Support',
        'Data Export Tools',
        'SLA Guarantee (99.9% uptime)'
      ],
      buttonText: 'Start Free Trial',
      popular: false,
      mostPopularFor: '25+ attorney firms, multi-location practices'
    },
    {
      name: 'Custom Enterprise',
      price: 'Contact',
      period: 'for Pricing',
      yearlyPrice: 'Starting at $50',
      yearlyPeriod: '/user/month',
      savings: '',
      description: 'Tailored solutions for unique requirements',
      features: [
        'Everything in Enterprise, Plus:',
        'Custom Development',
        'On-premise Hybrid Options',
        'Advanced API Access',
        'Custom Workflows',
        'Dedicated Infrastructure',
        'White-Glove Migration',
        'Unlimited Training',
        'Custom Compliance Features'
      ],
      buttonText: 'Contact Sales',
      popular: false,
      mostPopularFor: '100+ attorney firms, unique requirements'
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

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
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
                  <div className="mb-2">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-base text-gray-500">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{plan.yearlyPrice}</span>
                      <span className="text-gray-500">{plan.yearlyPeriod}</span>
                      {plan.savings && (
                        <span className="ml-1 text-green-600 font-medium">({plan.savings})</span>
                      )}
                    </div>
                  )}
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
                
                {plan.mostPopularFor && (
                  <div className="mt-6 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-900">Most Popular for:</span> {plan.mostPopularFor}
                    </p>
                  </div>
                )}
                
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