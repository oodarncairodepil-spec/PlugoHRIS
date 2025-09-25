import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';



interface LeaveBalanceData {
  employee_id: number;
  name: string;
  email: string;
  join_date: string;
  months_joined: number;
  employment_type: 'Permanent' | 'Contract';
  total_balance: number;
  total_balance_used: number;
  current_leave_balance: number;
}

const LeaveBalanceChecker: React.FC = () => {
  const [employees, setEmployees] = useState<LeaveBalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [calculatedData, setCalculatedData] = useState<LeaveBalanceData[]>([]);

  const fetchLeaveBalanceData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/leave-balance');
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching leave balance data:', err);
      setError('Failed to fetch leave balance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveBalances = async () => {
    try {
      setCalculating(true);
      const response = await apiService.post('/leave-balance/calculate');
      // Backend returns { data: employeeBalanceData, message, updatedCount, etc }
      setCalculatedData(response.data?.data || []);
      setShowSaveOptions(true);
      setError(null);
    } catch (err) {
      console.error('Error calculating leave balances:', err);
      setError('Failed to calculate leave balances');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    try {
      // The calculation already saved to database, just refresh the view
      await fetchLeaveBalanceData();
      setShowSaveOptions(false);
      setCalculatedData([]);
    } catch (err) {
      console.error('Error saving changes:', err);
      setError('Failed to save changes');
    }
  };

  const handleCancel = () => {
    setShowSaveOptions(false);
    setCalculatedData([]);
  };

  const calculateMonthsJoined = (joinDate: string): number => {
    const join = new Date(joinDate);
    const today = new Date();
    const months = (today.getFullYear() - join.getFullYear()) * 12 + (today.getMonth() - join.getMonth());
    return Math.max(0, months);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchLeaveBalanceData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Balance Checker</h1>
        <div className="flex space-x-2">
          {showSaveOptions ? (
            <>
              <button
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={calculateLeaveBalances}
              disabled={calculating}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? 'Calculating...' : 'Calculate'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Months Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(showSaveOptions ? calculatedData : employees).map((employee, index) => (
                <tr key={employee.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(employee.join_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateMonthsJoined(employee.join_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.employment_type === 'Permanent' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {employee.employment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.total_balance.toFixed(2)} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.total_balance_used.toFixed(2)} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-semibold ${
                      employee.current_leave_balance < 0 
                        ? 'text-red-600' 
                        : employee.current_leave_balance < 5 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                    }`}>
                      {employee.current_leave_balance.toFixed(2)} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {employees.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Leave Balance Rules:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Permanent employees: 1.25 days per month</li>
          <li>• Contract employees: 1.00 day per month</li>
          <li>• Balance addition cutoff: 16th day of each month</li>
          <li>• Employees joining on/before 15th get balance on 16th of same month</li>
          <li>• Employees joining on/after 16th get balance on 16th of next month</li>
        </ul>
      </div>
    </div>
  );
};

export default LeaveBalanceChecker;