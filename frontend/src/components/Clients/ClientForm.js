import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { endpoints } from '../../utils/api';
import FormField from '../Forms/FormField';
import { validateForm, clientValidationSchema } from '../../utils/validation';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '../Icons';

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    ssn: '',
    dateOfBirth: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchClient();
    }
  }, [id, isEditing]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const client = await endpoints.clients.get(id);
      
      setFormData({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || '',
        ssn: client.ssn || '',
        dateOfBirth: client.dateOfBirth ? client.dateOfBirth.split('T')[0] : '',
        emergencyContact: client.emergencyContact || '',
        emergencyPhone: client.emergencyPhone || '',
        notes: client.notes || ''
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      if (error.response?.status === 404) {
        navigate('/app/clients');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    
    // Validate individual field on blur
    const fieldValidation = validateForm({ [name]: formData[name] }, { [name]: clientValidationSchema[name] });
    if (!fieldValidation.isValid) {
      setErrors(prev => ({
        ...prev,
        [name]: fieldValidation.errors[name]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate entire form
    const validation = validateForm(formData, clientValidationSchema);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitLoading(true);
      setErrors({});

      const submitData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null
      };

      if (isEditing) {
        await endpoints.clients.update(id, submitData);
      } else {
        await endpoints.clients.create(submitData);
      }

      navigate('/app/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        // Handle general error message
        setErrors({ general: error.response.data.message });
      } else {
        // Handle network or other errors
        setErrors({ general: 'An error occurred while saving the client. Please try again.' });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const stateOptions = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {isEditing ? 'Edit Client' : 'Add New Client'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isEditing ? 'Update client information and contact details.' : 'Enter the client\'s personal information and contact details.'}
            </p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                
                {/* General Error */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="text-sm text-red-600">{errors.general}</div>
                  </div>
                )}

                {/* Personal Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.firstName}
                      required
                      icon={UserIcon}
                      placeholder="Enter first name"
                    />
                    
                    <FormField
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.lastName}
                      required
                      icon={UserIcon}
                      placeholder="Enter last name"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.email}
                      icon={EnvelopeIcon}
                      placeholder="client@example.com"
                      helpText="We'll use this email to send important updates"
                    />
                    
                    <FormField
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.phone}
                      icon={PhoneIcon}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      label="Date of Birth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.dateOfBirth}
                    />
                    
                    <FormField
                      label="Social Security Number"
                      name="ssn"
                      value={formData.ssn}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.ssn}
                      placeholder="XXX-XX-XXXX"
                      helpText="Required for legal documentation"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Address Information</h4>
                  <FormField
                    label="Street Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.address}
                    icon={MapPinIcon}
                    placeholder="Enter street address"
                  />
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
                    <FormField
                      label="City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.city}
                      placeholder="Enter city"
                    />
                    
                    <FormField
                      label="State"
                      name="state"
                      type="select"
                      value={formData.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.state}
                      options={stateOptions}
                    />
                    
                    <FormField
                      label="ZIP Code"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.zipCode}
                      placeholder="12345"
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Emergency Contact</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Emergency Contact Name"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.emergencyContact}
                      placeholder="Enter emergency contact name"
                    />
                    
                    <FormField
                      label="Emergency Phone"
                      name="emergencyPhone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.emergencyPhone}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <FormField
                    label="Notes"
                    name="notes"
                    type="textarea"
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.notes}
                    placeholder="Additional notes about the client..."
                    helpText="Any additional information that might be relevant"
                  />
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/clients')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {isEditing ? 'Update Client' : 'Create Client'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;