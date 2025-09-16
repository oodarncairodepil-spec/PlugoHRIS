import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import type { LeaveRequest } from '../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalEmployees: 0
  });
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (hasRole('Admin')) {
        // Admin can see all requests and employees
        const [requestsData, employeesData] = await Promise.all([
          apiService.getLeaveRequestsForApproval(),
          apiService.getEmployees()
        ]);
        
        setStats({
          totalRequests: requestsData.leave_requests?.length || 0,
          pendingRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Pending').length || 0,
          approvedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Approved').length || 0,
          rejectedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Rejected').length || 0,
          totalEmployees: employeesData.employees?.length || 0
        });
        
        setRecentRequests(requestsData.leave_requests?.slice(0, 5) || []);
      } else if (hasRole('Manager')) {
        // Manager can see subordinate requests
        const requestsData = await apiService.getLeaveRequestsForApproval();
        
        setStats({
          totalRequests: requestsData.leave_requests?.length || 0,
          pendingRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Pending').length || 0,
          approvedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Approved').length || 0,
          rejectedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Rejected').length || 0,
          totalEmployees: 0
        });
        
        setRecentRequests(requestsData.leave_requests?.slice(0, 5) || []);
      } else {
        // Employee can see only their requests
        const requestsData = await apiService.getMyLeaveRequests();
        
        setStats({
          totalRequests: requestsData.leave_requests?.length || 0,
          pendingRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Pending').length || 0,
          approvedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Approved').length || 0,
          rejectedRequests: requestsData.leave_requests?.filter((r: LeaveRequest) => r.status === 'Rejected').length || 0,
          totalEmployees: 0
        });
        
        setRecentRequests(requestsData.leave_requests?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'Approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-primary-100 rounded-full p-3">
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Welcome back, {user?.employee?.full_name || user?.email}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {hasRole('Admin') ? 'Admin Dashboard' : hasRole('Manager') ? 'Manager Dashboard' : 'Employee Dashboard'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.approvedRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {hasRole('Admin') ? (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Employees
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalEmployees}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rejected
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.rejectedRequests}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Leave Requests
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {hasRole(['Admin', 'Manager']) ? 'Latest requests from your team' : 'Your recent leave requests'}
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentRequests.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-center text-gray-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                No recent requests found
              </div>
            </li>
          ) : (
            recentRequests.map((request) => (
              <li key={request.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(request.status)}
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {typeof request.leave_type === 'string' ? request.leave_type : request.leave_type?.name || 'Unknown'}
                        </p>
                        {hasRole(['Admin', 'Manager']) && (
                          <p className="ml-2 text-sm text-gray-500">
                            by {request.employee?.full_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <p>
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={getStatusBadge(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;