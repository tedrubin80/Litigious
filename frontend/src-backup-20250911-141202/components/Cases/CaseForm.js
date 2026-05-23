import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import FormField from '../Forms/FormField';
import { validateForm, caseValidationSchema } from '../../utils/validation';
import { 
  DocumentIcon, 
  UserIcon, 
  CurrencyDollarIcon,
  CalendarIcon
} from '../Icons';

const CaseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    clientId: '',
    status: 'ACTIVE',
    incidentDate: '',
    filingDate: '',
    courtLocation: '',
    caseNumber: '',
    opposingParty: '',
    opposingCounsel: '',
    settlementAmount: '',
    attorneyFees: '',
    costs: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const caseTypes = [
    { value: 'PERSONAL_INJURY', label: 'Personal Injury' },
    { value: 'AUTO_ACCIDENT', label: 'Auto Accident' },
    { value: 'MEDICAL_MALPRACTICE', label: 'Medical Malpractice' },
    { value: 'WORKERS_COMPENSATION', label: 'Workers Compensation' },
    { value: 'PREMISES_LIABILITY', label: 'Premises Liability' },
    { value: 'PRODUCT_LIABILITY', label: 'Product Liability' },
    { value: 'WRONGFUL_DEATH', label: 'Wrongful Death' },
    { value: 'OTHER', label: 'Other' }
  ];

  const caseStatuses = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SETTLED', label: 'Settled' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'ON_HOLD', label: 'On Hold' }
  ];

  useEffect(() => {
    fetchClients();
    if (isEditing) {
      fetchCase();
    }
  }, [id, isEditing]);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data.map(client => ({
        value: client.id,
        label: `${client.firstName} ${client.lastName}`
      })));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchCase = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/cases/${id}`);
      const caseData = response.data;
      
      setFormData({
        title: caseData.title || '',
        description: caseData.description || '',
        type: caseData.type || '',
        clientId: caseData.clientId?.toString() || '',
        status: caseData.status || 'ACTIVE',
        incidentDate: caseData.incidentDate ? caseData.incidentDate.split('T')[0] : '',
        filingDate: caseData.filingDate ? caseData.filingDate.split('T')[0] : '',
        courtLocation: caseData.courtLocation || '',
        caseNumber: caseData.caseNumber || '',
        opposingParty: caseData.opposingParty || '',
        opposingCounsel: caseData.opposingCounsel || '',
        settlementAmount: caseData.settlementAmount || '',
        attorneyFees: caseData.attorneyFees || '',
        costs: caseData.costs || '',
        notes: caseData.notes || ''
      });
    } catch (error) {
      console.error('Error fetching case:', error);
      if (error.response?.status === 404) {
        navigate('/app/cases');
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
    const fieldValidation = validateForm({ [name]: formData[name] }, { [name]: caseValidationSchema[name] });
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
    const validation = validateForm(formData, caseValidationSchema);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitLoading(true);
      setErrors({});

      const submitData = {
        ...formData,
        clientId: parseInt(formData.clientId),
        incidentDate: formData.incidentDate || null,
        filingDate: formData.filingDate || null,
        settlementAmount: formData.settlementAmount ? parseFloat(formData.settlementAmount) : null,
        attorneyFees: formData.attorneyFees ? parseFloat(formData.attorneyFees) : null,
        costs: formData.costs ? parseFloat(formData.costs) : null
      };

      if (isEditing) {
        await axios.put(`/api/cases/${id}`, submitData);
      } else {
        await axios.post('/api/cases', submitData);
      }

      navigate('/app/cases');
    } catch (error) {
      console.error('Error saving case:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'An error occurred while saving the case. Please try again.' });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading || loadingClients) {
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
              {isEditing ? 'Edit Case' : 'Create New Case'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {isEditing ? 'Update case information and details.' : 'Enter the case details and assign to a client.'}
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

                {/* Case Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Case Information</h4>
                  
                  <FormField
                    label="Case Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.title}
                    required
                    icon={DocumentIcon}
                    placeholder="Enter descriptive case title"
                    helpText="A clear, descriptive title for this case"
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      label="Case Type"
                      name="type"
                      type="select"
                      value={formData.type}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.type}
                      required
                      options={caseTypes}
                    />
                    
                    <FormField
                      label="Client"
                      name="clientId"
                      type="select"
                      value={formData.clientId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.clientId}
                      required
                      options={clients}
                      icon={UserIcon}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      label="Case Status"
                      name="status"
                      type="select"
                      value={formData.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.status}
                      options={caseStatuses}
                    />
                    
                    <FormField
                      label="Case Number"
                      name="caseNumber"
                      value={formData.caseNumber}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.caseNumber}
                      placeholder="Court assigned case number"
                    />
                  </div>

                  <FormField
                    label="Case Description"
                    name="description"
                    type="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.description}
                    placeholder="Detailed description of the case..."
                    helpText="Brief summary of the case and key issues"
                  />
                </div>

                {/* Incident & Court Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Incident & Court Information</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Incident Date"
                      name="incidentDate"
                      type="date"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.incidentDate}
                      icon={CalendarIcon}
                    />
                    
                    <FormField
                      label="Filing Date"
                      name="filingDate"
                      type="date"
                      value={formData.filingDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.filingDate}
                      icon={CalendarIcon}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      label="Court Location"
                      name="courtLocation"
                      value={formData.courtLocation}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.courtLocation}
                      placeholder="County Superior Court, etc."
                    />
                    
                    <FormField
                      label="Opposing Party"
                      name="opposingParty"
                      value={formData.opposingParty}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.opposingParty}
                      placeholder="Defendant or opposing party name"
                    />
                  </div>

                  <FormField
                    label="Opposing Counsel"
                    name="opposingCounsel"
                    value={formData.opposingCounsel}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.opposingCounsel}
                    placeholder="Name and firm of opposing counsel"
                    className="mt-4"
                  />
                </div>

                {/* Financial Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Financial Information</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField
                      label="Settlement Amount"
                      name="settlementAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.settlementAmount}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.settlementAmount}
                      icon={CurrencyDollarIcon}
                      placeholder="0.00"
                    />
                    
                    <FormField
                      label="Attorney Fees"
                      name="attorneyFees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.attorneyFees}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.attorneyFees}
                      icon={CurrencyDollarIcon}
                      placeholder="0.00"
                    />
                    
                    <FormField
                      label="Costs"
                      name="costs"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costs}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={errors.costs}
                      icon={CurrencyDollarIcon}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <FormField
                    label="Additional Notes"
                    name="notes"
                    type="textarea"
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.notes}
                    placeholder="Additional case notes and important information..."
                    icon={DocumentIcon}
                    helpText="Any additional information relevant to this case"
                  />
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 space-x-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/cases')}
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
                      {isEditing ? 'Update Case' : 'Create Case'}
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

export default CaseForm;