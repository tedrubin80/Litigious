import React, { useState, useEffect } from 'react';
import { InformationCircleIcon, XMarkIcon } from '../Icons';

const FeatureHighlight = ({
  targetSelector,
  title,
  description,
  features = [],
  aiIntegration = null,
  position = 'auto',
  isVisible = false,
  onClose
}) => {
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isVisible && targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setHighlightPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });

        // Calculate tooltip position
        const tooltipTop = rect.top + window.scrollY - 10;
        const tooltipLeft = rect.left + window.scrollX + rect.width + 20;

        setTooltipPosition({
          top: Math.max(20, tooltipTop),
          left: Math.min(window.innerWidth - 400, tooltipLeft)
        });
      }
    }
  }, [isVisible, targetSelector]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Backdrop with cutout */}
      <div className="absolute inset-0 bg-black bg-opacity-40">
        {targetSelector && (
          <div
            className="absolute bg-transparent border-4 border-blue-400 rounded-lg shadow-2xl animate-pulse"
            style={{
              top: highlightPosition.top - 8,
              left: highlightPosition.left - 8,
              width: highlightPosition.width + 16,
              height: highlightPosition.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)'
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-xl shadow-2xl max-w-sm border border-gray-200 pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 50
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 mb-3">{description}</p>

          {/* Features */}
          {features.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Features:</h4>
              <ul className="space-y-1">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-600">
                    <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Integration */}
          {aiIntegration && (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">🤖 AI Integration</h4>
              <div className="space-y-2">
                {aiIntegration.models && (
                  <div>
                    <p className="text-xs text-purple-700 font-medium">AI Models:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {aiIntegration.models.map((model, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiIntegration.capabilities && (
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Capabilities:</p>
                    <ul className="mt-1 space-y-1">
                      {aiIntegration.capabilities.map((cap, index) => (
                        <li key={index} className="text-xs text-purple-800">• {cap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureHighlight;