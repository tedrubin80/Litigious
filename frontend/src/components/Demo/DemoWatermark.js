import React from 'react';
import { isDemoMode } from '../../config/demo';

const DemoWatermark = () => {
  if (!isDemoMode()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="bg-black bg-opacity-10 text-gray-600 px-3 py-1 rounded-lg text-xs font-mono border border-gray-300 backdrop-blur-sm">
        DEMO
      </div>
    </div>
  );
};

export default DemoWatermark;
