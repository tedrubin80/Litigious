import React, { useState, useEffect, createContext, useContext } from 'react';
import { isDemoMode } from '../../config/demo';
import DemoBanner from './DemoBanner';
import DemoWatermark from './DemoWatermark';
import DemoCredentialsHint from './DemoCredentialsHint';
import VirtualTour from './VirtualTour';
import FeatureHighlight from './FeatureHighlight';

// Demo Context for managing demo state across the app
const DemoContext = createContext({
  isDemoMode: false,
  showTour: false,
  setShowTour: () => {},
  showHighlight: null,
  setShowHighlight: () => {},
  tourCompleted: false,
  resetTour: () => {}
});

export const useDemoContext = () => useContext(DemoContext);

const DemoWrapper = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [showHighlight, setShowHighlight] = useState(null);
  const [tourCompleted, setTourCompleted] = useState(false);

  // Check if we're in demo mode
  const demoActive = isDemoMode() ||
                     process.env.REACT_APP_PACKAGE_TYPE === 'demo' ||
                     localStorage.getItem('demoMode') === 'true';

  useEffect(() => {
    // Check if tour has been completed or skipped
    const completed = localStorage.getItem('demoTourCompleted') === 'true';
    const skipped = localStorage.getItem('demoTourSkipped') === 'true';
    setTourCompleted(completed || skipped);

    // Auto-show tour on first visit in demo mode
    if (demoActive && !completed && !skipped) {
      const hasSeenTour = sessionStorage.getItem('hasSeenVirtualTour');
      if (!hasSeenTour) {
        // Small delay to let the page load first
        const timer = setTimeout(() => {
          setShowTour(true);
          sessionStorage.setItem('hasSeenVirtualTour', 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [demoActive]);

  const resetTour = () => {
    localStorage.removeItem('demoTourCompleted');
    localStorage.removeItem('demoTourSkipped');
    sessionStorage.removeItem('hasSeenVirtualTour');
    setTourCompleted(false);
    setShowTour(true);
  };

  const handleTourComplete = () => {
    setTourCompleted(true);
    setShowTour(false);
  };

  const contextValue = {
    isDemoMode: demoActive,
    showTour,
    setShowTour,
    showHighlight,
    setShowHighlight,
    tourCompleted,
    resetTour
  };

  // If not in demo mode, just render children
  if (!demoActive) {
    return <>{children}</>;
  }

  return (
    <DemoContext.Provider value={contextValue}>
      <div className="demo-wrapper relative min-h-screen">
        {/* Demo Banner at top */}
        <DemoBanner />

        {/* Main content */}
        <div className="demo-content">
          {children}
        </div>

        {/* Demo Watermark */}
        <DemoWatermark />

        {/* Virtual Tour Modal */}
        <VirtualTour
          isActive={showTour}
          onClose={() => setShowTour(false)}
          onComplete={handleTourComplete}
        />

        {/* Feature Highlight (conditionally rendered) */}
        {showHighlight && (
          <FeatureHighlight
            targetSelector={showHighlight.selector}
            title={showHighlight.title}
            description={showHighlight.description}
            features={showHighlight.features}
            aiIntegration={showHighlight.aiIntegration}
            isVisible={true}
            onClose={() => setShowHighlight(null)}
          />
        )}

        {/* Floating Demo Controls */}
        <DemoFloatingControls
          onStartTour={() => setShowTour(true)}
          tourCompleted={tourCompleted}
        />
      </div>
    </DemoContext.Provider>
  );
};

// Floating demo controls button
const DemoFloatingControls = ({ onStartTour, tourCompleted }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {isExpanded && (
        <div className="mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Demo Controls</h4>
          <div className="space-y-2">
            <button
              onClick={() => {
                onStartTour();
                setIsExpanded(false);
              }}
              className="w-full flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tourCompleted ? 'Replay Tour' : 'Start Tour'}
            </button>
            <div className="pt-2 border-t border-gray-100">
              <DemoCredentialsHint compact />
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Sample data resets every 24 hours
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isExpanded
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
        }`}
      >
        {isExpanded ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default DemoWrapper;
