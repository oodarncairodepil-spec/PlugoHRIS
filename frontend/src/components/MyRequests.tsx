import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText, Car, Filter, Copy } from 'lucide-react';
import { apiService } from '../services/api';

const MyRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'leave' | 'grab' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total_leave_requests: 0, total_grab_requests: 0, total_requests: 0 });

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter, typeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyAllRequests(
        currentPage,
        10,
        statusFilter || undefined,
        typeFilter || undefined
      );
      setRequests(response.requests);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
      setSummary(response.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
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

  const handleTypeFilterChange = (type: 'leave' | 'grab' | '') => {
    setTypeFilter(type);
    setCurrentPage(1);
  };

  const getRequestIcon = (requestType: string) => {
    return requestType === 'leave' ? 
      <FileText className="h-5 w-5 text-blue-500" /> : 
      <Car className="h-5 w-5 text-purple-500" />;
  };

  const getRequestTypeLabel = (requestType: string) => {
    return requestType === 'leave' ? 'Leave Request' : 'Grab Code Request';
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
              <Calendar className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => handleTypeFilterChange(e.target.value as 'leave' | 'grab' | '')}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="leave">Leave Requests</option>
                  <option value="grab">Grab Requests</option>
                </select>
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-600 font-medium">Total Requests</div>
              <div className="text-2xl font-bold text-blue-800">{summary.total_requests}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-green-600 font-medium">Leave Requests</div>
              <div className="text-2xl font-bold text-green-800">{summary.total_leave_requests}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-purple-600 font-medium">Grab Requests</div>
              <div className="text-2xl font-bold text-purple-800">{summary.total_grab_requests}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
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
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">
                {statusFilter || typeFilter ? 
                  `No ${typeFilter ? typeFilter + ' ' : ''}${statusFilter ? statusFilter.toLowerCase() + ' ' : ''}requests found.` : 
                  'You haven\'t submitted any requests yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={`${request.request_type}-${request.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getRequestIcon(request.request_type)}
                        {getStatusIcon(request.status)}
                        <h3 className="ml-2 text-lg font-medium text-gray-900">
                          {request.request_type === 'leave' ? 
                            (typeof request.leave_type === 'string' ? request.leave_type : request.leave_type?.name || 'Leave Request') :
                            `${request.service_needed} - ${getRequestTypeLabel(request.request_type)}`
                          }
                        </h3>
                        <span className={`ml-3 ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      
                      {request.request_type === 'leave' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{formatDate(request.start_date)} - {formatDate(request.end_date)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{request.total_days || request.days_requested} days</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Requester:</span>
                            <br />
                            <span className="text-gray-600">{request.employee?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Approval Manager:</span>
                            <br />
                            <span className="text-gray-600">{request.approved_by_user?.full_name || 'Not assigned'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{formatDate(request.usage_time)}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Meeting Location:</span>
                            <br />
                            <span className="text-gray-600">{request.meeting_location}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Requester:</span>
                            <br />
                            <span className="text-gray-600">{request.employee?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Code Needed:</span>
                            <br />
                            <span className="text-gray-600">{request.code_needed ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Submitted: {formatDate(request.created_at)}
                      </div>
                      
                      {request.status === 'Approved' && request.approved_at && (
                        <div className="mt-2 text-sm text-green-600">
                          <span className="font-medium">Approved on:</span> {formatDate(request.approved_at)}
                          {request.request_type === 'grab' && request.approved_codes && request.approved_codes.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium">Approved Codes:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {request.approved_codes.map((code: string, index: number) => (
                                  <div key={index} className="flex items-center bg-green-100 text-green-800 rounded px-2 py-1">
                                    <span className="font-mono text-sm mr-2">{code}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(code);
                                        // You could add a toast notification here
                                      }}
                                      className="text-green-600 hover:text-green-800 transition-colors"
                                      title="Copy code"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {request.status === 'Rejected' && request.rejection_reason && (
                        <div className="mt-2 text-sm text-red-600">
                          <span className="font-medium">Rejection reason:</span> {request.rejection_reason}
                        </div>
                      )}
                    </div>
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
    </div>
  );
};

export default MyRequests;