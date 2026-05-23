import React from 'react';
import icons from './index';

/**
 * Reusable Icon component that provides dynamic icon loading
 * and consistent styling across the application.
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Icon name (e.g., 'home', 'document', 'user')
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Icon size: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {string} props.color - Icon color variant
 * @param {Object} props.style - Inline styles
 * @param {...Object} props.rest - Additional props passed to the SVG element
 */
const Icon = ({ 
  name, 
  className = '', 
  size = 'md',
  color,
  style,
  ...rest 
}) => {
  // Size mappings
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  // Color mappings
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    muted: 'text-gray-400'
  };

  // Get the icon component from our registry
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon registry`);
    return null;
  }

  // Build className
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = color ? colorClasses[color] : '';
  const finalClassName = [sizeClass, colorClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <IconComponent 
      className={finalClassName}
      style={style}
      {...rest}
    />
  );
};

// Export individual icon components for direct use
export { default as icons } from './index';
export * from './index';

export default Icon;