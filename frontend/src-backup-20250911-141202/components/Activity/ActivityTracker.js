import React, { useState, useEffect } from 'react';
import { useActivityTracker } from '../../hooks/useActivityTracker';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlusIcon,
  ClockIcon,
  DocumentIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  PauseIcon
} from '../Icons';
import { useToast } from '../Common/Toast';

/**
 * Beautiful Activity Tracker Form
 * 
 * Allows users to manually track legal work activities
 * with real-time timer functionality and automatic billing
 */
const ActivityTracker = ({ caseId = null, onActivityTracked = null }) => {
  const { user } = useAuth();
  const { trackLegalWork, loading } = useActivityTracker();
  const toast = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [formData, setFormData] = useState({
    workType: 'legal-research',
    duration: '',
    description: '',
    caseId: caseId || '',
    // Specific fields for different work types
    topic: '',
    documentType: '',
    meetingType: '',
    court: '',
    filingType: ''
  });

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && timerStart) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - timerStart) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStart]);

  const workTypes = [
    {
      value: 'legal-research',
      label: 'Legal Research',
      icon: DocumentIcon,
      color: 'bg-blue-500',
      fields: ['topic']
    },
    {
      value: 'document-drafting',
      label: 'Document Drafting',
      icon: DocumentIcon,
      color: 'bg-green-500',
      fields: ['documentType']
    },
    {
      value: 'client-meeting',
      label: 'Client Meeting',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      fields: ['meetingType']
    },
    {
      value: 'court-filing',
      label: 'Court Filing',
      icon: CheckCircleIcon,
      color: 'bg-red-500',
      fields: ['court', 'filingType']
    }
  ];

  const selectedWorkType = workTypes.find(type => type.value === formData.workType);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setTimerStart(Date.now());
    setIsTimerRunning(true);
    setElapsedTime(0);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    if (elapsedTime > 0) {
      const minutes = Math.ceil(elapsedTime / 60);
      setFormData(prev => ({ ...prev, duration: minutes.toString() }));
    }
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerStart(null);
    setElapsedTime(0);
    setFormData(prev => ({ ...prev, duration: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.caseId) {
      toast?.show?.({
        type: 'error',
        message: 'Please select a case',
        duration: 4000
      });
      return;
    }

    const duration = parseInt(formData.duration) || Math.ceil(elapsedTime / 60);
    
    if (!duration || duration <= 0) {
      toast?.show?.({
        type: 'error',
        message: 'Please enter a valid duration or use the timer',
        duration: 4000
      });
      return;
    }

    try {
      // Prepare the tracking data
      const trackingData = {
        caseId: formData.caseId,
        workType: formData.workType,
        duration,
        description: formData.description
      };

      // Add type-specific fields
      if (selectedWorkType.fields.includes('topic')) {
        trackingData.topic = formData.topic;
      }
      if (selectedWorkType.fields.includes('documentType')) {
        trackingData.documentType = formData.documentType;
      }
      if (selectedWorkType.fields.includes('meetingType')) {
        trackingData.meetingType = formData.meetingType;
      }
      if (selectedWorkType.fields.includes('court')) {
        trackingData.court = formData.court;
      }
      if (selectedWorkType.fields.includes('filingType')) {
        trackingData.filingType = formData.filingType;
      }

      const result = await trackLegalWork(trackingData);
      
      // Reset form and timer
      setFormData({
        workType: 'legal-research',
        duration: '',
        description: '',
        caseId: caseId || '',
        topic: '',
        documentType: '',
        meetingType: '',
        court: '',
        filingType: ''
      });
      
      resetTimer();
      setIsOpen(false);
      
      if (onActivityTracked) {
        onActivityTracked(result);
      }

    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Track Activity
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Track Legal Work Activity
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Work Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Activity Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {workTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('workType', type.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.workType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full ${type.color} bg-opacity-10 mr-3`}>
                        <IconComponent className={`h-5 w-5 ${type.color.replace('bg-', 'text-')}`} />
                      </div>
                      <span className="font-medium text-gray-900">{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Case ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Case ID
            </label>
            <input
              type="text"
              value={formData.caseId}
              onChange={(e) => handleInputChange('caseId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter case ID"
              required
            />
          </div>

          {/* Timer Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                Time Tracker
              </h4>
              <div className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(elapsedTime)}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isTimerRunning ? (
                <button
                  type="button"
                  onClick={startTimer}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTimer}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <StopIcon className="h-4 w-4 mr-1" />
                  Stop
                </button>
              )}
              
              <button
                type="button"
                onClick={resetTimer}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              
              <span className="text-sm text-gray-600">or</span>
              
              <div className="flex items-center">
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="60"
                  min="1"
                />
                <span className="ml-1 text-sm text-gray-600">minutes</span>
              </div>
            </div>
          </div>

          {/* Dynamic Fields Based on Work Type */}
          {selectedWorkType.fields.includes('topic') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Contract law precedents"
              />
            </div>
          )}

          {selectedWorkType.fields.includes('documentType') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => handleInputChange('documentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select document type</option>
                <option value="Motion">Motion</option>
                <option value="Brief">Brief</option>
                <option value="Settlement Agreement">Settlement Agreement</option>
                <option value="Contract">Contract</option>
                <option value="Complaint">Complaint</option>
                <option value="Discovery Request">Discovery Request</option>
              </select>
            </div>
          )}

          {selectedWorkType.fields.includes('meetingType') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Type
              </label>
              <select
                value={formData.meetingType}
                onChange={(e) => handleInputChange('meetingType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select meeting type</option>
                <option value="Initial Consultation">Initial Consultation</option>
                <option value="Strategy Discussion">Strategy Discussion</option>
                <option value="Settlement Negotiation">Settlement Negotiation</option>
                <option value="Case Review">Case Review</option>
                <option value="Deposition Prep">Deposition Prep</option>
              </select>
            </div>
          )}

          {selectedWorkType.fields.includes('court') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Court
              </label>
              <input
                type="text"
                value={formData.court}
                onChange={(e) => handleInputChange('court', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Superior Court"
              />
            </div>
          )}

          {selectedWorkType.fields.includes('filingType') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filing Type
              </label>
              <select
                value={formData.filingType}
                onChange={(e) => handleInputChange('filingType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select filing type</option>
                <option value="Motion to Dismiss">Motion to Dismiss</option>
                <option value="Motion for Summary Judgment">Motion for Summary Judgment</option>
                <option value="Complaint">Complaint</option>
                <option value="Answer">Answer</option>
                <option value="Discovery Motion">Discovery Motion</option>
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Additional notes about this activity..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Tracking...' : 'Track Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityTracker;