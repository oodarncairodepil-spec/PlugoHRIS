import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, Search, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
// Removed unused import
import { apiService } from '../services/api';
import type { Employee } from '../types';

interface EmployeeFormData {
  nik: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  department: string;
  hire_date: string;
  leave_balance: number;
  status: 'Active' | 'Inactive';
  manager_id?: string;
  employment_type: 'Permanent' | 'Contract';
  role: 'Employee' | 'Manager' | 'Admin' | 'HR';
}

interface Manager {
  id: string;
  full_name: string;
  email: string;
  division: string;
}

interface Department {
  id: string;
  name: string;
  details?: string;
  employee_count?: number;
}

const EmployeeManagement: React.FC = () => {
  // Remove unused user declaration
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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    nik: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    position: '',
    department: '',
    hire_date: '',
    leave_balance: 12,
    status: 'Active',
    manager_id: '',
    employment_type: 'Permanent',
    role: 'Employee'
  });

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  
  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    manager: '',
    hireDateFrom: '',
    hireDateTo: '',
    employmentType: '',
    status: '',
    role: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchManagers = async () => {
    try {
      const response = await apiService.getManagers();
      setManagers(response.managers);
    } catch (err: any) {
      console.error('Error fetching managers:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(response.departments);
    } catch (err: any) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchEmployees = useCallback(async (page = currentPage, customLimit?: number) => {
    try {
      setLoading(true);
      setError('');
      
      const filterParams = {
        department: filters.department || undefined,
        manager: filters.manager || undefined,
        hireDateFrom: filters.hireDateFrom || undefined,
        hireDateTo: filters.hireDateTo || undefined,
        employmentType: filters.employmentType || undefined,
        status: filters.status || undefined,
        role: filters.role || undefined,
      };
      
      const response = await apiService.getEmployees(
        page,
        customLimit || limit,
        searchTerm || undefined,
        filterParams
      );
      
      // Debug: Log employee data to check manager information
      console.log('🔍 Employee data received:', response.employees.map(emp => ({
        name: emp.full_name,
        manager: emp.manager,
        manager_id: emp.manager_id
      })));
      
      setEmployees(response.employees);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
      
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, limit]);

  useEffect(() => {
    // Load initial data on component mount
    setEmployees([]);
    setCurrentPage(1);
    fetchEmployees(1);
    fetchManagers();
    fetchDepartments();
  }, []);

  // Fetch employees when filters or search term changes
  useEffect(() => {
    if (searchTerm !== '' || filters.role || filters.department || filters.status) {
      setCurrentPage(1);
      fetchEmployees(1);
    }
  }, [searchTerm, filters.role, filters.department, filters.status, fetchEmployees]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle phone number - only allow numbers
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'leave_balance' ? parseFloat(value) || 0 : value
    }));
  };



  const resetForm = () => {
    setFormData({
        nik: '', // Keep for backend compatibility
        name: '',
        email: '',
        phone: '',
        address: '',
        position: '',
        department: '',
        hire_date: '',
        leave_balance: 12,
        status: 'Active',
        manager_id: '',
        employment_type: 'Permanent',
        role: 'Employee'
      });

    setEditingEmployee(null);
    setError('');
    setSuccess('');
    setGeneratedPassword('');
  };

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        nik: employee.nik || '',
        name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        position: employee.position || '',
        department: employee.division || '',
        hire_date: employee.start_date ? employee.start_date.split('T')[0] : '',
        leave_balance: employee.leave_balance || 0,
        status: employee.status || 'Active',
        manager_id: employee.manager_id || '',
        employment_type: employee.employment_type || 'Permanent',
        role: employee.role || 'Employee'
      });

    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log('Form submitted with data:', formData);

    try {
      if (editingEmployee) {
        console.log('Updating employee:', editingEmployee.id);
        // Map frontend fields to backend fields
        const backendData = {
          full_name: formData.name,
          division: formData.department,
          employment_type: formData.employment_type,
          leave_balance: formData.leave_balance,
          role: formData.role,
          manager_id: formData.manager_id || undefined,
          status: formData.status,
          phone: formData.phone,
          address: formData.address,
          position: formData.position,

        };
        console.log('Sending backend data:', backendData);
        await apiService.updateEmployee(editingEmployee.id, backendData as any);
        setSuccess('Employee updated successfully!');
      } else {
        console.log('Creating new employee');
        // Map frontend fields to backend fields for creation
        const backendData = {
          full_name: formData.name,
          email: formData.email,
          nik: formData.nik,
          division: formData.department,
          employment_type: formData.employment_type,
          leave_balance: formData.leave_balance,
          start_date: formData.hire_date,
          role: formData.role,
          manager_id: formData.manager_id || undefined,
          phone: formData.phone,
          address: formData.address,
          position: formData.position,
          status: formData.status
        };
        console.log('Sending backend data for creation:', backendData);
        const response = await apiService.createEmployee(backendData as any);
        setGeneratedPassword(response.temporary_password);
        setSuccess('Employee created successfully! Temporary password generated.');
        await fetchEmployees(1);
        // Don't close modal immediately for new employees so admin can copy password
        return;
      }
      await fetchEmployees(1);
      closeModal();
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.message || 'Failed to save employee');
    }
  };

  const handleGeneratePassword = async (employeeId: string) => {
    try {
      setProcessingId(employeeId);
      const response = await apiService.generateNewPassword(employeeId);
      setGeneratedPassword(response.temporary_password);
      setSuccess('New password generated successfully!');
      await fetchEmployees(1);
    } catch (err: any) {
      console.error('Error generating password:', err);
      setError(err.message || 'Failed to generate password');
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Password copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy password');
    });
  };



  const confirmDelete = (employee: Employee) => {
     setEmployeeToDelete(employee);
     setShowDeleteConfirm(true);
   };
 
   const handleDelete = async () => {
    if (!employeeToDelete) return;

    try {
      setProcessingId(employeeToDelete.id);
      await apiService.deleteEmployee(employeeToDelete.id);
      setSuccess('Employee deleted successfully!');
      await fetchEmployees(1);
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleSearch = (): void => {
    setEmployees([]);
    setCurrentPage(1);
    fetchEmployees(1);
  };

  const handleClearSearch = (): void => {
    setSearchTerm('');
    setFilters({
      department: '',
      manager: '',
      hireDateFrom: '',
      hireDateTo: '',
      employmentType: '',
      status: '',
      role: ''
    });
    setEmployees([]);
    setCurrentPage(1);
    fetchEmployees(1);
  };

  const handleFilterChange = (field: string, value: string): void => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      // Trigger search when filters change
      setTimeout(() => {
        setEmployees([]);
        setCurrentPage(1);
        fetchEmployees(1);
      }, 0);
      return newFilters;
    });
  };

  const toggleFilters = (): void => {
    setShowFilters(!showFilters);
  };







  if (loading && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center mb-4 sm:mb-0">
              <Users className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            </div>
            
            <button
              onClick={() => openModal()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </button>
          </div>
          
          {/* Search */}
          <div className="mt-4">
            <div className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search employees..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Search
              </button>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Filter Toggle */}
          <div className="mt-4">
            <button
              onClick={toggleFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Department Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Manager Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <select
                    value={filters.manager}
                    onChange={(e) => handleFilterChange('manager', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Managers</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.full_name}>
                        {manager.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Employment Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={filters.employmentType}
                    onChange={(e) => handleFilterChange('employmentType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                
                {/* Role Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Roles</option>
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                
                {/* Hire Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date From
                  </label>
                  <input
                    type="date"
                    value={filters.hireDateFrom}
                    onChange={(e) => handleFilterChange('hireDateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Hire Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date To
                  </label>
                  <input
                    type="date"
                    value={filters.hireDateTo}
                    onChange={(e) => handleFilterChange('hireDateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {employees.length} of {total} employees
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

        {success && (
          <div className="p-4 bg-green-50 border-l-4 border-green-400">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Employee List - Mobile Friendly Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {employees.map((employee) => (
            <div
              key={employee.id}
              onClick={() => openModal(employee)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200 active:scale-95"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {employee.full_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {employee.position || 'No Position'}
                    </p>
                    {employee.manager && (
                      <p className="text-xs text-blue-600 truncate mt-1">
                        Manager: {employee.manager.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                      employee.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {employee.division}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {employees.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'No employees match your search criteria.' : 'No employees have been added yet.'}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setCurrentPage(1);
                  // Call fetchEmployees with the new limit directly
                  fetchEmployees(1, newLimit);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} employees
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchEmployees(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchEmployees(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchEmployees(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* a. Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* b. NIK */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NIK *
                    </label>
                    <input
                      type="text"
                      name="nik"
                      value={formData.nik}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* c. Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position *
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* d. Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.name}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* e. Manager */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager
                    </label>
                    <select
                      name="manager_id"
                      value={formData.manager_id || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name} - {manager.division}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* f. Hire Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hire Date *
                    </label>
                    <input
                      type="date"
                      name="hire_date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* g. Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* h. Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* i. Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* j. Leave Balance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Balance (Days) *
                    </label>
                    <input
                      type="number"
                      name="leave_balance"
                      value={formData.leave_balance}
                      onChange={handleInputChange}
                      min="0"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* k. Employment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employment Type *
                    </label>
                    <select
                      name="employment_type"
                      value={formData.employment_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  {/* l. Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* m. Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  {editingEmployee && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password Status
                      </label>
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-600">
                          Password changed: {editingEmployee.password_changed ? 'Yes' : 'No (Default password)'}
                        </span>
                        {generatedPassword && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={generatedPassword}
                              readOnly
                              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(generatedPassword)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Generated Password Display for New Employees */}
                  {!editingEmployee && generatedPassword && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Generated Password
                      </label>
                      <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <span className="text-sm text-green-700 font-medium">Temporary Password:</span>
                        <input
                          type="text"
                          value={generatedPassword}
                          readOnly
                          className="px-3 py-2 text-sm border border-gray-300 rounded bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedPassword)}
                          className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Please share this password with the new employee. They will be required to change it on first login.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-6">
                  {editingEmployee ? (
                    <>
                      <button
                        type="button"
                        onClick={() => confirmDelete(editingEmployee)}
                        className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Delete Employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => handleGeneratePassword(editingEmployee.id)}
                          disabled={processingId === editingEmployee.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingId === editingEmployee.id ? 'Generating...' : 'New Password'}
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-end space-x-3 w-full">
                      {generatedPassword && (
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!!generatedPassword}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Employee
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Delete Employee</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{employeeToDelete.full_name}</strong>? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={processingId === employeeToDelete.id}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === employeeToDelete.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;