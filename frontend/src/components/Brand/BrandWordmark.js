import React from 'react';
import brand from '../../config/brand';

const BrandWordmark = ({ className = '', style = {} }) => (
  <p
    className={`text-xs font-semibold tracking-widest uppercase ${className}`.trim()}
    style={{ color: 'oklch(0.55 0.006 60)', ...style }}
  >
    {brand.appName}
  </p>
);

export default BrandWordmark;
