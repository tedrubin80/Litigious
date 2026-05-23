import React from 'react';

const TestimonialSection = () => {
  const testimonials = [
    {
      quote: "LegalEstate has transformed how we manage our practice. The AI-powered document generation alone saves us 10+ hours per week, and the multi-cloud storage gives us peace of mind for client data security.",
      author: "Sarah Chen",
      title: "Managing Partner",
      company: "Chen & Associates",
      location: "San Francisco, CA",
      avatar: "👩‍💼"
    },
    {
      quote: "The integration between ChatGPT and Claude is brilliant. We use ChatGPT for complex contract drafting and Claude for ethical guidance and case analysis. Having both in one platform is a game-changer.",
      author: "Michael Rodriguez",
      title: "Senior Attorney",
      company: "Rodriguez Legal Group",
      location: "Miami, FL",
      avatar: "👨‍💼"
    },
    {
      quote: "Our clients love the portal access, and the calendar integration has eliminated scheduling conflicts. The ROI was evident within the first month - we're billing 15% more hours with better client satisfaction.",
      author: "Jennifer Kim",
      title: "Solo Practitioner",
      company: "Kim Family Law",
      location: "Austin, TX",
      avatar: "👩‍⚖️"
    },
    {
      quote: "The multi-cloud approach was exactly what our firm needed for compliance. We use Box for client files, AWS for archives, and OneDrive for collaboration. LegalEstate makes it seamless.",
      author: "David Thompson",
      title: "IT Director",
      company: "Thompson, Baker & Associates",
      location: "New York, NY",
      avatar: "👨‍💻"
    },
    {
      quote: "As a personal injury firm, we handle massive amounts of documentation. The AI summarization and case analysis features have revolutionized our case preparation process.",
      author: "Maria Santos",
      title: "Partner",
      company: "Santos & Partners PI",
      location: "Los Angeles, CA",
      avatar: "⚖️"
    },
    {
      quote: "The time tracking and billing integration is flawless. We've reduced billing errors by 95% and improved our collection rate significantly. The automated invoicing is a lifesaver.",
      author: "Robert Clark",
      title: "Managing Partner",
      company: "Clark Corporate Law",
      location: "Chicago, IL",
      avatar: "👔"
    }
  ];

  const stats = [
    {
      metric: "98%",
      description: "Client Satisfaction Rate",
      icon: "😊"
    },
    {
      metric: "45%",
      description: "Increase in Billable Hours",
      icon: "⏰"
    },
    {
      metric: "80%",
      description: "Reduction in Admin Tasks",
      icon: "📋"
    },
    {
      metric: "99.9%",
      description: "System Uptime",
      icon: "🔧"
    }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="text-center mb-16">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Trusted by Legal Professionals</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Real Results from Real Law Firms
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg p-6 text-center shadow">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-blue-600 mb-1">{stat.metric}</div>
              <div className="text-sm text-gray-600">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">{testimonial.avatar}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.author}</h4>
                  <p className="text-sm text-gray-600">{testimonial.title}</p>
                  <p className="text-sm text-blue-600">{testimonial.company}</p>
                  <p className="text-xs text-gray-500">{testimonial.location}</p>
                </div>
              </div>
              
              <blockquote className="text-gray-700 italic">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="mt-4 flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-sm text-gray-500">5.0</span>
              </div>
            </div>
          ))}
        </div>

        {/* Case Studies CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              See How Leading Law Firms Use LegalEstate
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Discover detailed case studies showing how firms achieved 40%+ efficiency gains and improved client satisfaction with our integrated AI and cloud storage solutions.
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="#"
                className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-md font-medium"
              >
                Download Case Studies
              </a>
              <a
                href="#"
                className="border border-blue-200 text-white hover:bg-blue-800 px-6 py-3 rounded-md font-medium"
              >
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialSection;