import React from 'react';
import { ExclamationCircleIcon } from '../Icons';

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  rows = 3,
  className = '',
  helpText,
  icon: Icon
}) => {
  const baseInputClasses = `
    block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset 
    ${error ? 'ring-red-300 focus:ring-red-500' : 'ring-gray-300 focus:ring-blue-600'}
    placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6
    ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
    ${className}
  `;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            name={name}
            id={name}
            rows={rows}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputClasses}
          />
        );
      
      case 'select':
        return (
          <select
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="">Select {label}...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              name={name}
              id={name}
              checked={value || false}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
              {label}
            </label>
          </div>
        );
      
      default:
        return (
          <div className="relative">
            {Icon && (
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <input
              type={type}
              name={name}
              id={name}
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              placeholder={placeholder}
              className={Icon ? `pl-10 ${baseInputClasses}` : baseInputClasses}
            />
          </div>
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className="mb-4">
        {renderInput()}
        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <ExclamationCircleIcon className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}
        {helpText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium leading-6 text-gray-900 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      {helpText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;