import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, Send, AlertCircle, Upload, Car, Users } from 'lucide-react';
import { apiService } from '../services/api';
import type { LeaveType, CreateGrabCodeRequestData, Service } from '../types';

type RequestType = 'leave' | 'grab' | null;

const LeaveRequest: React.FC = () => {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestType>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [grabFormData, setGrabFormData] = useState({
    service_needed: '',
    purpose: '',
    counterpart_name: '',
    usage_date: '',
    usage_time: '',
    meeting_location: '',
    code_needed: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLeaveTypes();
    fetchServices();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const leaveTypesData = await apiService.getLeaveTypes();
      setLeaveTypes(leaveTypesData);
    } catch (err) {
      setError('Failed to load leave types');
    }
  };

  const fetchServices = async () => {
    try {
      const servicesData = await apiService.getActiveServices();
      setServices(servicesData);
    } catch (err) {
      console.error('Failed to load services:', err);
      // Don't set error here as it's not critical for the form to work
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleGrabInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGrabFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.leave_type_id || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill in all required fields');
      }

      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        throw new Error('End date must be after start date');
      }

      const requestData = {
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason
      };

      await apiService.createLeaveRequest(requestData);
      setSuccess('Leave request submitted successfully!');
      
      // Redirect to My Requests page after a short delay
      setTimeout(() => {
        navigate('/my-requests');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleGrabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!grabFormData.service_needed || !grabFormData.purpose || !grabFormData.counterpart_name || 
          !grabFormData.usage_date || !grabFormData.usage_time || !grabFormData.meeting_location || 
          !grabFormData.code_needed) {
        throw new Error('Please fill in all required fields');
      }

      const requestData: CreateGrabCodeRequestData = {
        service_needed: grabFormData.service_needed as 'GrabCar' | 'GrabBike' | 'GrabExpress' | 'GrabFood',
        purpose: grabFormData.purpose,
        counterpart_name: grabFormData.counterpart_name,
        usage_date: grabFormData.usage_date,
        usage_time: grabFormData.usage_time,
        meeting_location: grabFormData.meeting_location,
        code_needed: parseInt(grabFormData.code_needed) || 0
      };
      
      await apiService.createGrabCodeRequest(requestData);
      console.log('Grab code request submitted successfully:', requestData);
      setSuccess('Grab code request submitted successfully!');
      
      // Redirect to My Requests page after a short delay
      setTimeout(() => {
        navigate('/my-requests');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit grab code request');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Selection screen
  if (requestType === null) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <FileText className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Request Type</h1>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 mb-6">Please select the type of request you want to make:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setRequestType('leave')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <Users className="h-12 w-12 text-gray-400 group-hover:text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Leave Request</h3>
                  <p className="text-sm text-gray-600">Submit a regular leave request for vacation, sick leave, etc.</p>
                </div>
              </button>

              <button
                onClick={() => setRequestType('grab')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex flex-col items-center text-center">
                  <Car className="h-12 w-12 text-gray-400 group-hover:text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Grab Code</h3>
                  <p className="text-sm text-gray-600">Request Grab service codes for business purposes</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grab Code Request Form
  if (requestType === 'grab') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <Car className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Request Grab Code</h1>
            <button
              onClick={() => setRequestType(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <span className="text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={handleGrabSubmit} className="space-y-6">
            {/* Service Needed */}
            <div>
              <label htmlFor="service_needed" className="block text-sm font-medium text-gray-700 mb-2">
                Service Needed *
              </label>
              <select
                id="service_needed"
                name="service_needed"
                value={grabFormData.service_needed}
                onChange={handleGrabInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <textarea
                id="purpose"
                name="purpose"
                value={grabFormData.purpose}
                onChange={handleGrabInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Meeting with seller/bazaar event/transport in Bandung/meals allowance for standby"
                required
              />
            </div>

            {/* Counterpart Name */}
            <div>
              <label htmlFor="counterpart_name" className="block text-sm font-medium text-gray-700 mb-2">
                Name of the counterpart (seller/client/partner) *
              </label>
              <input
                type="text"
                id="counterpart_name"
                name="counterpart_name"
                value={grabFormData.counterpart_name}
                onChange={handleGrabInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: GoneGani/Paxel/etc"
                required
              />
            </div>

            {/* Usage Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="usage_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Usage Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    id="usage_date"
                    name="usage_date"
                    value={grabFormData.usage_date}
                    onChange={handleGrabInputChange}
                    min={today}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="usage_time" className="block text-sm font-medium text-gray-700 mb-2">
                  Usage Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    id="usage_time"
                    name="usage_time"
                    value={grabFormData.usage_time}
                    onChange={handleGrabInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Meeting Location */}
            <div>
              <label htmlFor="meeting_location" className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Location *
              </label>
              <input
                type="text"
                id="meeting_location"
                name="meeting_location"
                value={grabFormData.meeting_location}
                onChange={handleGrabInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Kemang Village/ Jln. Jendral Sudirman no. 81/ etc"
                required
              />
            </div>

            {/* Code Needed */}
            <div>
              <label htmlFor="code_needed" className="block text-sm font-medium text-gray-700 mb-2">
                Code Needed *
              </label>
              <input
                type="number"
                id="code_needed"
                name="code_needed"
                value={grabFormData.code_needed}
                onChange={handleGrabInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Number of codes expected"
                min="1"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Leave Request Form (original)
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <FileText className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Submit Leave Request</h1>
          <button
            onClick={() => setRequestType(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <span className="text-green-700">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label htmlFor="leave_type_id" className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type *
            </label>
            <select
              id="leave_type_id"
              name="leave_type_id"
              value={formData.leave_type_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} {type.max_days_per_year && `(${type.max_days_per_year} days allowed)`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  min={today}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  min={formData.start_date || today}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Days Calculation */}
          {formData.start_date && formData.end_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  Total days requested: {calculateDays()}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Leave
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Please provide a reason for your leave request (optional)..."
            />
          </div>

          {/* File Upload for Sick Leave */}
          {leaveTypes.find(type => type.id === formData.leave_type_id)?.name === 'Sick Leave' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Doctor's Affidavit (Surat Keterangan Sakit)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="doctor_affidavit"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="doctor_affidavit" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Accepted formats: Images, PDF, DOC, DOCX
                  </p>
                </label>
              </div>
              <p className="text-sm text-orange-600 mt-2">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                If you can't provide the affidavit, your leave will be deducted from annual leave.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequest;