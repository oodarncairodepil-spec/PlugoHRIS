import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Filter, User, MessageSquare, Car } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext'; // Commented out - unused
import { apiService } from '../services/api';
import type { LeaveRequest, GrabCodeRequest } from '../types';

type CombinedRequest = (LeaveRequest & { request_type: 'leave' }) | (GrabCodeRequest & { request_type: 'grab' });

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
  const [selectedRequestType, setSelectedRequestType] = useState<'leave' | 'grab' | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvalCodes, setApprovalCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter, requestTypeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const combinedRequests: CombinedRequest[] = [];
      
      // Fetch leave requests if not filtered to grab only
      if (requestTypeFilter !== 'grab') {
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
      
      // Fetch grab code requests if not filtered to leave only
       if (requestTypeFilter !== 'leave') {
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
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {request.request_type === 'leave' ? getStatusIcon(request.status) : <Car className="h-5 w-5 text-blue-500" />}
                        <h3 className="ml-2 text-lg font-medium text-gray-900">
                          {request.request_type === 'leave' 
                            ? (typeof request.leave_type === 'string' ? request.leave_type : request.leave_type?.name || 'Unknown Leave Type')
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
                          ({request.employee?.division || 'Unknown Division'})
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
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 lg:mt-0 lg:ml-4">
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
                Reject {selectedRequestType === 'grab' ? 'Grab Code' : 'Leave'} Request
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this {selectedRequestType === 'grab' ? 'grab code' : 'leave'} request:
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
    </div>
  );
};

export default ApproveRequests;