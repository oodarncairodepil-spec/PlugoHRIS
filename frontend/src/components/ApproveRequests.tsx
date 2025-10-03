import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, User, MessageSquare, Car, Paperclip, FileText, MapPin, X } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext'; // Commented out - unused
import { apiService } from '../services/api';
import type { LeaveRequest, GrabCodeRequest, BusinessTripRequest } from '../types';

type CombinedRequest = (LeaveRequest & { request_type: 'leave' }) | (GrabCodeRequest & { request_type: 'grab' }) | (BusinessTripRequest & { request_type: 'biztrip' });

const ApproveRequests: React.FC = () => {
  // const { user } = useAuth(); // Commented out unused variable
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<'leave' | 'grab' | 'biztrip' | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalCodes, setApprovalCodes] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<CombinedRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter, requestTypeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const combinedRequests: CombinedRequest[] = [];
      
      // Fetch leave requests if not filtered to grab or biztrip only
      if (requestTypeFilter !== 'grab' && requestTypeFilter !== 'biztrip') {
        try {
          const leaveResponse = await apiService.getLeaveRequestsForApproval(
            currentPage,
            10,
            statusFilter || undefined
          );
          const leaveRequests = leaveResponse.leave_requests.map(req => ({
            ...req,
            request_type: 'leave' as const
          }));
          combinedRequests.push(...leaveRequests);
        } catch (err) {
          console.warn('Failed to fetch leave requests:', err);
        }
      }
      
      // Fetch grab code requests if not filtered to leave or biztrip only
       if (requestTypeFilter !== 'leave' && requestTypeFilter !== 'biztrip') {
         try {
           // Pass status filter to API, default to 'Pending' if no filter is set
           const grabResponse = await apiService.getAllGrabCodeRequests(1, 100, statusFilter || 'Pending');
           const grabRequests = Array.isArray(grabResponse) ? grabResponse : grabResponse.grab_code_requests || [];
           const filteredGrabRequests = grabRequests.map((req: any) => ({
             ...req,
             request_type: 'grab' as const
           }));
           combinedRequests.push(...filteredGrabRequests);
         } catch (err) {
           console.warn('Failed to fetch grab code requests:', err);
         }
       }
       
       // Fetch business trip requests if not filtered to leave or grab only
       if (requestTypeFilter !== 'leave' && requestTypeFilter !== 'grab') {
         try {
           const biztripResponse = await apiService.getBusinessTripRequestsForApproval(
             currentPage,
             10,
             statusFilter || undefined
           );
           const biztripRequests = biztripResponse.business_trip_requests.map(req => ({
             ...req,
             request_type: 'biztrip' as const
           }));
           combinedRequests.push(...biztripRequests);
         } catch (err) {
           console.warn('Failed to fetch business trip requests:', err);
         }
       }
      
      // Sort by created_at descending
      combinedRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setRequests(combinedRequests);
      setTotal(combinedRequests.length);
      setTotalPages(Math.ceil(combinedRequests.length / 10));
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (request?.request_type === 'grab') {
      setSelectedRequestId(requestId);
      setSelectedRequestType('grab');
      setShowApproveModal(true);
      // Initialize approval codes array with the correct number of empty strings
      const grabRequest = request as GrabCodeRequest & { request_type: 'grab' };
      const initialCodes = Array(grabRequest.code_needed).fill('');
      setApprovalCodes(initialCodes);
    } else if (request?.request_type === 'biztrip') {
      try {
        setProcessingId(requestId);
        await apiService.approveBusinessTripRequest(requestId);
        await fetchRequests(); // Refresh the list
      } catch (err: any) {
        setError(err.message || 'Failed to approve business trip request');
      } finally {
        setProcessingId(null);
      }
    } else {
      try {
        setProcessingId(requestId);
        await apiService.approveLeaveRequest(requestId);
        await fetchRequests(); // Refresh the list
      } catch (err: any) {
        setError(err.message || 'Failed to approve request');
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleGrabCodeApprove = async () => {
    if (!selectedRequestId || approvalCodes.length === 0 || approvalCodes.some(code => !code.trim())) {
      setError('Please provide all approval codes');
      return;
    }
    
    const filteredCodes = approvalCodes.filter(code => code.trim());
    console.log('Approving grab code request:', {
      requestId: selectedRequestId,
      codes: filteredCodes,
      codesCount: filteredCodes.length
    });
    
    try {
      setProcessingId(selectedRequestId);
      await apiService.approveGrabCodeRequest(selectedRequestId, filteredCodes);
      await fetchRequests();
      setShowApproveModal(false);
      setSelectedRequestId(null);
      setSelectedRequestType(null);
      setApprovalCodes([]);
    } catch (err: any) {
      console.error('Error approving grab code request:', err);
      setError(err.message || 'Failed to approve grab code request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequestId || !rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    const request = requests.find(r => r.id === selectedRequestId);
    
    try {
      setProcessingId(selectedRequestId);
      if (request?.request_type === 'grab') {
        await apiService.rejectGrabCodeRequest(selectedRequestId, rejectionReason);
      } else if (request?.request_type === 'biztrip') {
        await apiService.rejectBusinessTripRequest(selectedRequestId, rejectionReason);
      } else {
        await apiService.rejectLeaveRequest(selectedRequestId, rejectionReason);
      }
      await fetchRequests(); // Refresh the list
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequestId(null);
      setSelectedRequestType(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    setSelectedRequestId(requestId);
    setSelectedRequestType(request?.request_type || null);
    setShowRejectModal(true);
    setRejectionReason('');
    setError('');
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedRequestId(null);
    setSelectedRequestType(null);
    setRejectionReason('');
    setError('');
  };

  const closeApproveModal = () => {
    setShowApproveModal(false);
    setSelectedRequestId(null);
    setSelectedRequestType(null);
    setApprovalCodes([]);
    setError('');
  };

  const openDetailsModal = (request: CombinedRequest) => {
    setSelectedRequestForDetails(request);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRequestForDetails(null);
  };



  const updateApprovalCode = (index: number, value: string) => {
    const newCodes = [...approvalCodes];
    newCodes[index] = value;
    setApprovalCodes(newCodes);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'Pending':
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'Approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'Pending':
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <CheckCircle className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Approve Requests</h1>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={requestTypeFilter}
                  onChange={(e) => setRequestTypeFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Requests</option>
                  <option value="leave">Leave Requests</option>
                  <option value="grab">Grab Code Requests</option>
                  <option value="biztrip">Business Trip Requests</option>
                </select>
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {requests.length} of {total} requests
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Requests List */}
        <div className="p-6">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
              <p className="text-gray-500">
                {statusFilter ? `No ${statusFilter.toLowerCase()} requests found.` : 'No leave requests require your approval at this time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div 
                  key={request.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetailsModal(request)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {request.request_type === 'leave' ? getStatusIcon(request.status) : 
                         request.request_type === 'biztrip' ? <MapPin className="h-5 w-5 text-green-500" /> :
                         <Car className="h-5 w-5 text-blue-500" />}
                        <h3 className="ml-2 text-lg font-medium text-gray-900">
                          {request.request_type === 'leave' 
                            ? (typeof request.leave_type === 'string' ? request.leave_type : request.leave_type?.name || 'Unknown Leave Type')
                            : request.request_type === 'biztrip'
                            ? `Business Trip to ${request.destination}`
                            : 'Grab Code Request'
                          }
                        </h3>
                        <span className={`ml-3 ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center mb-2 text-sm text-gray-600">
                        <User className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {request.employee?.full_name || 'Unknown Employee'}
                        </span>
                        <span className="ml-2 text-gray-500">
                          ({request.employee?.department?.name || 'Unknown Department'})
                        </span>
                      </div>
                      
                      {request.request_type === 'leave' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(request.start_date)} - {formatDate(request.end_date)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{request.total_days} days</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Submitted: {formatDate(request.created_at)}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Reason:</span> {request.reason}
                            </p>
                          </div>
                          
                          {/* Document Links for Leave Requests */}
                          {request.document_links && request.document_links.length > 0 && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center mb-2">
                                <Paperclip className="h-4 w-4 text-gray-600 mr-2" />
                                <span className="text-sm font-medium text-gray-700">Attached Documents:</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {request.document_links.map((document: string, index: number) => (
                                  <div key={index} className="flex items-center bg-white border border-gray-200 rounded px-3 py-1 text-sm">
                                    <FileText className="h-3 w-3 text-blue-500 mr-2" />
                                    <span className="text-gray-700">{document}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : request.request_type === 'biztrip' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(request.start_date)} - {formatDate(request.end_date)}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{request.destination}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Submitted: {formatDate(request.created_at)}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Events:</span> {request.events?.length || 0} event(s)
                            </p>
                            {request.participants && request.participants.length > 0 && (
                              <p className="text-sm text-gray-700 mt-2">
                                <span className="font-medium">Participants:</span> {request.participants.length} participant(s)
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(request.usage_time)}</span>
                            </div>
                            <div className="flex items-center">
                               <Clock className="h-4 w-4 mr-1" />
                               <span>{request.code_needed} codes needed</span>
                             </div>
                            <div className="text-xs text-gray-500">
                              Submitted: {formatDate(request.created_at)}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Purpose:</span> {request.purpose}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Meeting Location:</span> {request.meeting_location}
                            </p>
                          </div>
                        </>
                      )}
                      
                      {request.status === 'Approved' && request.approved_at && (
                        <div className="text-sm text-green-600">
                          <span className="font-medium">Approved on:</span> {formatDate(request.approved_at)}
                        </div>
                      )}
                      
                      {request.status === 'Rejected' && request.rejection_reason && (
                        <div className="text-sm text-red-600">
                          <span className="font-medium">Rejection reason:</span> {request.rejection_reason}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {request.status === 'Pending' && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 lg:ml-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processingId === request.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(request.id)}
                          disabled={processingId === request.id}
                          className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal for Grab Code Requests */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Car className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Approve Grab Code Request</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please provide the grab codes for this request:
            </p>
            
            <div className="space-y-3">
              {approvalCodes.map((code, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => updateApprovalCode(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={`Grab code ${index + 1}`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeApproveModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleGrabCodeApprove}
                disabled={approvalCodes.some(code => !code.trim()) || processingId === selectedRequestId}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingId === selectedRequestId ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Reject {selectedRequestType === 'grab' ? 'Grab Code' : selectedRequestType === 'biztrip' ? 'Business Trip' : 'Leave'} Request
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this {selectedRequestType === 'grab' ? 'grab code' : selectedRequestType === 'biztrip' ? 'business trip' : 'leave'} request:
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter rejection reason..."
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === selectedRequestId}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingId === selectedRequestId ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showDetailsModal && selectedRequestForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {selectedRequestForDetails.request_type === 'leave' ? getStatusIcon(selectedRequestForDetails.status) : 
                   selectedRequestForDetails.request_type === 'biztrip' ? <MapPin className="h-6 w-6 text-green-500" /> :
                   <Car className="h-6 w-6 text-blue-500" />}
                  <h3 className="ml-2 text-xl font-semibold text-gray-900">
                    {selectedRequestForDetails.request_type === 'leave' 
                      ? (typeof selectedRequestForDetails.leave_type === 'string' ? selectedRequestForDetails.leave_type : selectedRequestForDetails.leave_type?.name || 'Unknown Leave Type')
                      : selectedRequestForDetails.request_type === 'biztrip'
                      ? `Business Trip to ${selectedRequestForDetails.destination}`
                      : 'Grab Code Request'
                    } - Details
                  </h3>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Employee Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Employee Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>
                    <p className="text-gray-600">{selectedRequestForDetails.employee?.full_name || 'Unknown Employee'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Department:</span>
                    <p className="text-gray-600">{selectedRequestForDetails.employee?.department?.name || 'Unknown Department'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <p className="text-gray-600">{selectedRequestForDetails.employee?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 ${getStatusBadge(selectedRequestForDetails.status)}`}>
                      {selectedRequestForDetails.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Request Details</h4>
                
                {selectedRequestForDetails.request_type === 'leave' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Leave Type:</span>
                        <p className="text-gray-600">
                          {typeof selectedRequestForDetails.leave_type === 'string' 
                            ? selectedRequestForDetails.leave_type 
                            : selectedRequestForDetails.leave_type?.name || 'Unknown Leave Type'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <p className="text-gray-600">{selectedRequestForDetails.total_days} days</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Start Date:</span>
                        <p className="text-gray-600">{formatDate(selectedRequestForDetails.start_date)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">End Date:</span>
                        <p className="text-gray-600">{formatDate(selectedRequestForDetails.end_date)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Reason:</span>
                      <p className="text-gray-600 mt-1">{selectedRequestForDetails.reason}</p>
                    </div>
                    
                    {selectedRequestForDetails.document_links && selectedRequestForDetails.document_links.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Documents:</span>
                        <div className="mt-2 space-y-2">
                          {selectedRequestForDetails.document_links.map((link, index) => (
                            <a
                              key={index}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Paperclip className="h-4 w-4 mr-1" />
                              Document {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedRequestForDetails.request_type === 'biztrip' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Destination:</span>
                        <p className="text-gray-600">{selectedRequestForDetails.destination}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <p className="text-gray-600">
                          {formatDate(selectedRequestForDetails.start_date)} - {formatDate(selectedRequestForDetails.end_date)}
                          {(() => {
                            const start = new Date(selectedRequestForDetails.start_date);
                            const end = new Date(selectedRequestForDetails.end_date);
                            const diffTime = Math.abs(end.getTime() - start.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            return ` (${diffDays} days)`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    {selectedRequestForDetails.events && selectedRequestForDetails.events.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Events:</span>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Event Name</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Date & Time</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Meeting Location</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Agenda</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedRequestForDetails.events.map((event, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{event.event_name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    {(() => {
                                      const dateRange = event.event_date || '';
                                      const timeRange = event.event_time || '';
                                      
                                      // Check if time range has actual times (not just ' - ' or empty)
                                      const hasValidTime = timeRange.trim() && timeRange.trim() !== '-' && !timeRange.match(/^\s*-\s*$/);
                                      
                                      if (hasValidTime) {
                                        // Parse the date range and time range to format properly
                                        const dates = dateRange.split(' to ');
                                        const times = timeRange.split(' - ');
                                        
                                        if (dates.length === 2 && times.length === 2) {
                                          const startDate = dates[0].trim();
                                          const endDate = dates[1].trim();
                                          const startTime = times[0].trim();
                                          const endTime = times[1].trim();
                                          
                                          if (startTime && endTime) {
                                            return `${startDate} at ${startTime} to ${endDate} at ${endTime}`;
                                          }
                                        }
                                      }
                                      
                                      // Return just the date range if no valid time
                                      return dateRange;
                                    })()} 
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{event.meeting_location || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{event.agenda || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {selectedRequestForDetails.participants && selectedRequestForDetails.participants.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Participants:</span>
                        <div className="mt-2 space-y-1">
                          {selectedRequestForDetails.participants.map((participant, index) => (
                            <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-gray-700">
                                {participant.employee?.full_name || 'Unknown Employee'}
                              </span>
                              {participant.employee?.email && (
                                <span className="text-sm text-gray-500 ml-2">({participant.employee.email})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Usage Date:</span>
                        <p className="text-gray-600">{formatDate(selectedRequestForDetails.usage_time)}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Codes Needed:</span>
                        <p className="text-gray-600">{selectedRequestForDetails.code_needed}</p>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Purpose:</span>
                      <p className="text-gray-600 mt-1">{selectedRequestForDetails.purpose}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Meeting Location:</span>
                      <p className="text-gray-600 mt-1">{selectedRequestForDetails.meeting_location}</p>
                    </div>
                    
                    {selectedRequestForDetails.status === 'Approved' && selectedRequestForDetails.approved_codes && selectedRequestForDetails.approved_codes.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Approved Codes:</span>
                        <div className="mt-2 space-y-1">
                          {selectedRequestForDetails.approved_codes.map((code, index) => (
                            <p key={index} className="text-gray-600 font-mono bg-gray-50 p-2 rounded">{code}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submission Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Submission Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Submitted On:</span>
                    <p className="text-gray-600">{formatDate(selectedRequestForDetails.created_at)}</p>
                  </div>
                  {selectedRequestForDetails.status === 'Approved' && selectedRequestForDetails.approved_at && (
                    <div>
                      <span className="font-medium text-gray-700">Approved On:</span>
                      <p className="text-gray-600">{formatDate(selectedRequestForDetails.approved_at)}</p>
                    </div>
                  )}
                  {selectedRequestForDetails.status === 'Rejected' && selectedRequestForDetails.rejection_reason && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Rejection Reason:</span>
                      <p className="text-red-600 mt-1">{selectedRequestForDetails.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveRequests;