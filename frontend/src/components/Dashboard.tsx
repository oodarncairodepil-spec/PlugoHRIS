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
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalEmployees: 0
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Admin can see ALL data from ALL employees with ALL statuses
      const [leaveRequestsData, grabCodeRequestsData, employeesData] = await Promise.all([
        apiService.getAllLeaveRequestsForDashboard(),
        apiService.getAllGrabCodeRequestsForDashboard(),
        apiService.getEmployees()
      ]);
      
      const allLeaveRequests = leaveRequestsData.leave_requests || [];
      const allGrabRequests = grabCodeRequestsData.grab_code_requests || [];
      const totalRequests = allLeaveRequests.length + allGrabRequests.length;
      
      // Calculate stats from ALL requests (leave + grab code)
      const pendingLeave = allLeaveRequests.filter((r: LeaveRequest) => r.status === 'Pending').length;
      const approvedLeave = allLeaveRequests.filter((r: LeaveRequest) => r.status === 'Approved').length;
      const rejectedLeave = allLeaveRequests.filter((r: LeaveRequest) => r.status === 'Rejected').length;
      
      const pendingGrab = allGrabRequests.filter((r: any) => r.status === 'Pending').length;
      const approvedGrab = allGrabRequests.filter((r: any) => r.status === 'Approved').length;
      const rejectedGrab = allGrabRequests.filter((r: any) => r.status === 'Rejected').length;
      
      setStats({
        totalRequests,
        pendingRequests: pendingLeave + pendingGrab,
        approvedRequests: approvedLeave + approvedGrab,
        rejectedRequests: rejectedLeave + rejectedGrab,
        totalEmployees: employeesData.employees?.length || 0
      });
      
      // Show recent requests from both leave and grab code requests
      const combinedRequests = [
        ...allLeaveRequests.map((r: any) => ({ ...r, type: 'Leave' as const })),
        ...allGrabRequests.map((r: any) => ({ ...r, type: 'Grab Code' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setRecentRequests(combinedRequests.slice(0, 10));
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
                  Admin Dashboard - All Employee Data
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
                    Total Requests (Leave + Grab Code)
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
      </div>

      {/* Additional Stats Row for Admin */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    All Statuses Included
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Pending, Approved, Rejected
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Requests (All Employees)
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest leave and grab code requests from all employees with all statuses
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          {request.type}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          {request.type === 'Leave' 
                            ? (typeof request.leave_type === 'string' ? request.leave_type : request.leave_type?.name || 'Leave Request')
                            : `${request.codes_requested || request.days_requested || 1} Grab Code${(request.codes_requested || request.days_requested || 1) > 1 ? 's' : ''}`
                          }
                        </p>
                        <p className="ml-2 text-sm text-gray-500">
                          by {request.employee?.full_name}
                        </p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <p>
                          {request.type === 'Leave' 
                            ? `${new Date(request.start_date).toLocaleDateString()} - ${new Date(request.end_date).toLocaleDateString()}`
                            : `Requested: ${new Date(request.created_at).toLocaleDateString()}`
                          }
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