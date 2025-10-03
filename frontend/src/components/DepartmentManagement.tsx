import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Plus, Search, Trash2, AlertCircle, CheckCircle, X, Users } from 'lucide-react';
import { apiService } from '../services/api';
import type { Department, Employee } from '../types';

interface DepartmentFormData {
  name: string;
  details: string;
  head_id?: string;
  employee_ids?: string[];
}

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(10);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    details: '',
    head_id: '',
    employee_ids: []
  });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [formErrors, setFormErrors] = useState<Partial<DepartmentFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; department: Department | null }>({
    show: false,
    department: null
  });

  const fetchDepartments = useCallback(async (page = currentPage, customLimit?: number) => {
    try {
      setLoading(true);
      const actualLimit = customLimit || limit;
      const response = await apiService.get(`/departments?page=${page}&limit=${actualLimit}&search=${encodeURIComponent(searchTerm)}`);
      
      if (response.data) {
        setDepartments(response.data.departments || []);
        setTotal(response.data.total || 0);
        setTotalPages(response.data.totalPages || 0);
        setCurrentPage(response.data.currentPage || page);
      }
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      setError(err.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await apiService.get('/employees?limit=1000&status=Active');
      if (response.data) {
        setEmployees(response.data.employees || []);
      }
    } catch (err: any) {
      console.error('Error fetching employees:', err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, [fetchDepartments]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (currentPage === 1) {
        fetchDepartments(1);
      } else {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const validateForm = (): boolean => {
    const errors: Partial<DepartmentFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Department name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...formData,
        head_id: formData.head_id || null
      };

      if (editingDepartment) {
        await apiService.put(`/departments/${editingDepartment.id}`, submitData);
        setSuccess('Department updated successfully!');
      } else {
        await apiService.post('/departments', submitData);
        setSuccess('Department created successfully!');
      }

      setShowModal(false);
      setEditingDepartment(null);
      resetForm();
      fetchDepartments();
    } catch (err: any) {
      console.error('Error saving department:', err);
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (department: Department) => {
    try {
      // Fetch current department employees
      const employeesResponse = await apiService.getDepartmentEmployees(department.id);
      const currentEmployeeIds = employeesResponse.employees?.map((emp: Employee) => emp.id) || [];
      
      setFormData({
        name: department.name,
        details: department.details || '',
        head_id: department.head_id || '',
        employee_ids: currentEmployeeIds
      });
      setEditingDepartment(department);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching department employees:', error);
      setError('Failed to load department employees');
      // Still allow editing without employee data
      setFormData({
        name: department.name,
        details: department.details || '',
        head_id: department.head_id || '',
        employee_ids: []
      });
      setEditingDepartment(department);
      setShowModal(true);
    }
    setFormErrors({});
  };

  const handleDelete = async (department: Department) => {
    try {
      await apiService.delete(`/departments/${department.id}`);
      setSuccess('Department deleted successfully!');
      setDeleteConfirm({ show: false, department: null });
      fetchDepartments();
    } catch (err: any) {
      console.error('Error deleting department:', err);
      setError(err.response?.data?.message || 'Failed to delete department');
      setDeleteConfirm({ show: false, department: null });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      details: '',
      head_id: '',
      employee_ids: []
    });
    setFormErrors({});
    setEmployeeSearch('');
    setSearchResults([]);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingDepartment(null);
    resetForm();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchDepartments(page);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            currentPage === i
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{Math.min((currentPage - 1) * limit + 1, total)}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * limit, total)}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex space-x-1">
              {pages}
            </div>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
              <p className="text-gray-600">Manage company departments and organizational structure</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
          <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="limit" className="text-sm font-medium text-gray-700">
                Show:
              </label>
              <select
                id="limit"
                value={limit}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value);
                  setLimit(newLimit);
                  setCurrentPage(1);
                  fetchDepartments(1, newLimit);
                }}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading departments...</span>
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No departments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Get started by creating a new department.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Head
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((department) => (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{department.name}</div>
                          {department.details && (
                            <div className="text-sm text-gray-500">{department.details}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {department.head ? department.head.full_name : 'No head assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {department.employee_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(department)}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ show: true, department })}
                            className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      {/* Add/Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDepartment ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter department name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                  Details
                </label>
                <textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department details (optional)"
                />
              </div>

              <div>
                <label htmlFor="head_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Head
                </label>
                <select
                  id="head_id"
                  value={formData.head_id}
                  onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select department head (optional)</option>
                  {employees
                    .filter(emp => emp.role === 'Manager' || emp.role === 'Admin')
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name} - {employee.position}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Employees
                </label>
                
                {/* Search Input */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmployeeSearch(value);
                      if (value.length >= 3) {
                        const filtered = employees.filter(emp => 
                          emp.full_name.toLowerCase().includes(value.toLowerCase()) &&
                          !formData.employee_ids?.includes(emp.id)
                        );
                        setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
                      } else {
                        setSearchResults([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search employee name (min 3 characters)..."
                  />
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {searchResults.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            const currentIds = formData.employee_ids || [];
                            setFormData({ 
                              ...formData, 
                              employee_ids: [...currentIds, employee.id] 
                            });
                            setEmployeeSearch('');
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                        >
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          <div className="text-xs text-gray-500">{employee.position}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Employees */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Selected Employees:</div>
                  {formData.employee_ids && formData.employee_ids.length > 0 ? (
                    <div className="space-y-1">
                      {formData.employee_ids.map((employeeId) => {
                        const employee = employees.find(emp => emp.id === employeeId);
                        return employee ? (
                          <div key={employeeId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                              <div className="text-xs text-gray-500">{employee.position}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const currentIds = formData.employee_ids || [];
                                setFormData({ 
                                  ...formData, 
                                  employee_ids: currentIds.filter(id => id !== employeeId) 
                                });
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No employees selected</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.department && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => setDeleteConfirm({ show: false, department: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the department "{deleteConfirm.department.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, department: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.department!)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;