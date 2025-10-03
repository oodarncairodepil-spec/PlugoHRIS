import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { LoginRequest, LoginResponse, User, Employee, LeaveRequest, LeaveType, ApiResponse, GrabCodeRequest, CreateGrabCodeRequestData, Service, CreateServiceData, UpdateServiceData } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = '/api';
    console.log('🔧 ApiService: Initializing with baseURL:', baseURL);
    this.writeDebugLog(`ApiService initialized with baseURL: ${baseURL}`);
    
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.config.url, response.status);
        return response;
      },
      (error) => {
        const errorDetails = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          code: error.code,
          baseURL: error.config?.baseURL,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ API Error:', errorDetails);
        this.writeDebugLog(`API Error: ${JSON.stringify(errorDetails, null, 2)}`);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/auth/profile');
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await this.api.put('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  }

  // Employee endpoints
  async getEmployees(
    page = 1, 
    limit = 10, 
    search?: string, 
    filters?: {
      department?: string;
      manager?: string;
      hireDateFrom?: string;
      hireDateTo?: string;
      employmentType?: string;
      status?: string;
      role?: string;
    }
  ): Promise<{ employees: Employee[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    
    // Add filter parameters
    if (filters) {
      if (filters.department) params.append('department', filters.department);
      if (filters.manager) params.append('manager', filters.manager);
      if (filters.hireDateFrom) params.append('hireDateFrom', filters.hireDateFrom);
      if (filters.hireDateTo) params.append('hireDateTo', filters.hireDateTo);
      if (filters.employmentType) params.append('employmentType', filters.employmentType);
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
    }
    
    const url = `/employees?${params}`;
    const requestDetails = { url, page, limit, search, filters, fullURL: `${window.location.origin}/api${url}`, timestamp: new Date().toISOString() };
    console.log('🔍 Fetching employees:', requestDetails);
    this.writeDebugLog(`Fetching employees: ${JSON.stringify(requestDetails, null, 2)}`);
    
    const response = await this.api.get(url);
    const responseDetails = { count: response.data.employees.length, total: response.data.total, status: response.status };
    console.log('📊 Employees response:', responseDetails);
    this.writeDebugLog(`Employees response: ${JSON.stringify(responseDetails, null, 2)}`);
    return response.data;
  }

  async getEmployee(id: string): Promise<Employee> {
    const response: AxiosResponse<{ employee: Employee }> = await this.api.get(`/employees/${id}`);
    return response.data.employee;
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<{ employee: Employee; temporary_password: string }> {
    const response: AxiosResponse<{ employee: Employee; temporary_password: string }> = await this.api.post('/employees', employee);
    return response.data;
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee> {
    const response: AxiosResponse<Employee> = await this.api.put(`/employees/${id}`, employee);
    return response.data;
  }

async generateNewPassword(id: string): Promise<{ temporary_password: string }> {
    const response: AxiosResponse<{ temporary_password: string }> = await this.api.post(`/employees/${id}/generate-password`);
    return response.data;
  }

  async getManagers(): Promise<{ managers: { id: string; full_name: string; email: string; department: { id: string; name: string } }[] }> {
    const response = await this.api.get('/employees/managers/list');
    return response.data;
  }

  async deleteEmployee(id: string): Promise<ApiResponse<null>> {
    const response: AxiosResponse<ApiResponse<null>> = await this.api.delete(`/employees/${id}`);
    return response.data;
  }
  // Leave endpoints
  async getMyLeaveRequests(page = 1, limit = 10, status?: string): Promise<{ leave_requests: LeaveRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    const response: AxiosResponse<{ leave_requests: LeaveRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> = await this.api.get(`/leaves/my-requests?${params}`);
    return response.data;
  }

  async getLeaveRequestsForApproval(page = 1, limit = 10, status?: string): Promise<{ leave_requests: LeaveRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    const response: AxiosResponse<{ leave_requests: LeaveRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> = await this.api.get(`/leaves/for-approval?${params}`);
    return response.data;
  }

  async createLeaveRequest(request: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    reason: string;
  }): Promise<LeaveRequest> {
    const response: AxiosResponse<LeaveRequest> = await this.api.post('/leaves', request);
    return response.data;
  }

  async approveLeaveRequest(id: string): Promise<LeaveRequest> {
    const response: AxiosResponse<LeaveRequest> = await this.api.put(`/leaves/${id}/approve`);
    return response.data;
  }

  async rejectLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
    const response: AxiosResponse<LeaveRequest> = await this.api.put(`/leaves/${id}/reject`, { reason });
    return response.data;
  }

  async getLeaveTypes(includeInactive = false): Promise<LeaveType[]> {
    const url = includeInactive ? '/leaves/types?include_inactive=true' : '/leaves/types';
    const response: AxiosResponse<{ leave_types: LeaveType[] }> = await this.api.get(url);
    return response.data.leave_types;
  }

  async createLeaveType(leaveType: { name: string; description: string; max_days_per_year?: number; requires_approval?: boolean; type: string; value: number }): Promise<LeaveType> {
    const response: AxiosResponse<{ leave_type: LeaveType }> = await this.api.post('/leaves/types', leaveType);
    return response.data.leave_type;
  }

  async updateLeaveType(id: string, leaveType: { name: string; description: string; max_days_per_year?: number; requires_approval?: boolean; type: string; value: number }): Promise<LeaveType> {
    const response: AxiosResponse<{ leave_type: LeaveType }> = await this.api.put(`/leaves/types/${id}`, leaveType);
    return response.data.leave_type;
  }

  async deleteLeaveType(id: string): Promise<void> {
    await this.api.delete(`/leaves/types/${id}`);
  }

  // Grab Code Request methods
  async createGrabCodeRequest(request: CreateGrabCodeRequestData): Promise<GrabCodeRequest> {
    const response = await this.api.post('/grab-code-requests', request);
    return response.data;
  }

  async getMyGrabCodeRequests(page = 1, limit = 10): Promise<{ grab_code_requests: GrabCodeRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const response = await this.api.get(`/grab-code-requests/my-requests?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getAllGrabCodeRequests(page = 1, limit = 10, status?: string): Promise<{ grab_code_requests: GrabCodeRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) {
      params.append('status', status);
    }
    const response = await this.api.get(`/grab-code-requests?${params.toString()}`);
    return response.data;
  }

  async updateGrabCodeRequestStatus(id: string, status: 'Approved' | 'Rejected', rejectionReason?: string): Promise<GrabCodeRequest> {
    const response = await this.api.put(`/grab-code-requests/${id}/status`, { status, rejection_reason: rejectionReason });
    return response.data;
  }

  async approveGrabCodeRequest(id: string, approvedCodes: string[]): Promise<GrabCodeRequest> {
    const requestData = { 
      status: 'Approved', 
      approved_codes: approvedCodes 
    };
    console.log('API: Sending grab code approval request:', {
      id,
      requestData
    });
    const response = await this.api.put(`/grab-code-requests/${id}/status`, requestData);
    return response.data;
  }

  async rejectGrabCodeRequest(id: string, rejectionReason: string): Promise<GrabCodeRequest> {
    const response = await this.api.put(`/grab-code-requests/${id}/status`, { 
      status: 'Rejected', 
      rejection_reason: rejectionReason 
    });
    return response.data;
  }

  async getGrabCodeRequestById(id: string): Promise<GrabCodeRequest> {
    const response = await this.api.get(`/grab-codes/${id}`);
    return response.data;
  }

  // Business Trip Request methods
  async createBusinessTripRequest(request: {
    destination: string;
    start_date: string;
    end_date: string;
    events: Array<{
      event_name: string;
      start_date: string;
      end_date: string;
      start_time: string;
      end_time: string;
      location: string;
      agenda: string;
    }>;
    participants: Array<{ employee_id: string }>;
  }): Promise<any> {
    const response = await this.api.post('/business-trips', request);
    return response.data;
  }

  async getMyBusinessTripRequests(page = 1, limit = 10, status?: string): Promise<{
    business_trip_requests: any[];
    pagination: { total: number; page: number; pages: number; limit: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/business-trips/my-requests?${params}`);
    return response.data;
  }

  async getBusinessTripRequestsForApproval(page = 1, limit = 10, status?: string): Promise<{
    business_trip_requests: any[];
    pagination: { total: number; page: number; pages: number; limit: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/business-trips/for-approval?${params}`);
    return response.data;
  }

  async approveBusinessTripRequest(id: string): Promise<any> {
    const response = await this.api.put(`/business-trips/${id}/approve`);
    return response.data;
  }

  async rejectBusinessTripRequest(id: string, reason: string): Promise<any> {
    const response = await this.api.put(`/business-trips/${id}/reject`, { rejection_reason: reason });
    return response.data;
  }

  async cancelBusinessTripRequest(id: string): Promise<any> {
    const response = await this.api.put(`/business-trips/${id}/cancel`);
    return response.data;
  }

  // Unified requests endpoint
  async getMyAllRequests(page = 1, limit = 10, status?: string, type?: 'leave' | 'grab' | 'biztrip'): Promise<{
    requests: any[];
    pagination: { total: number; page: number; pages: number; limit: number };
    summary: { total_leave_requests: number; total_grab_requests: number; total_business_trip_requests: number; total_requests: number };
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    
    const response = await this.api.get(`/requests/my-requests?${params}`);
    return response.data;
  }

  // Dashboard API endpoints (Admin only)
  async getAllLeaveRequestsForDashboard(page = 1, limit = 100): Promise<{ leave_requests: LeaveRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.api.get(`/leaves/dashboard/all?${params}`);
    return response.data;
  }

  async getAllGrabCodeRequestsForDashboard(page = 1, limit = 100): Promise<{ grab_code_requests: GrabCodeRequest[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.api.get(`/grab-code-requests/dashboard/all?${params}`);
    return response.data;
  }

  async getAllBusinessTripRequestsForDashboard(page = 1, limit = 100): Promise<{ business_trip_requests: any[]; pagination: { total: number; page: number; pages: number; limit: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.api.get(`/business-trips/dashboard/all?${params}`);
    return response.data;
  }

  // Generic HTTP methods for additional endpoints
  async get(url: string): Promise<any> {
    const response = await this.api.get(url);
    return response;
  }

  async post(url: string, data?: any): Promise<any> {
    const response = await this.api.post(url, data);
    return response;
  }

  async put(url: string, data?: any): Promise<any> {
    const response = await this.api.put(url, data);
    return response;
  }

  async delete(url: string): Promise<any> {
    const response = await this.api.delete(url);
    return response;
  }

  // Department-specific methods
  async getDepartments(): Promise<{ departments: { id: string; name: string; details?: string; employee_count?: number }[] }> {
    const response = await this.api.get('/departments?limit=1000');
    return response.data;
  }

  async getDepartmentEmployees(departmentId: string): Promise<{ employees: Employee[] }> {
    const response: AxiosResponse<{ employees: Employee[] }> = await this.api.get(`/departments/${departmentId}/employees`);
    return response.data;
  }

  // Services API methods
  async getAllServices(): Promise<Service[]> {
    const response = await this.api.get('/services');
    return response.data;
  }

  async getActiveServices(): Promise<Service[]> {
    const response = await this.api.get('/services/active');
    return response.data;
  }

  async getServiceById(id: number): Promise<Service> {
    const response = await this.api.get(`/services/${id}`);
    return response.data;
  }

  async createService(service: CreateServiceData): Promise<Service> {
    const response = await this.api.post('/services', service);
    return response.data;
  }

  async updateService(id: number, service: UpdateServiceData): Promise<Service> {
    const response = await this.api.put(`/services/${id}`, service);
    return response.data;
  }

  async toggleServiceStatus(id: number): Promise<Service> {
    const response = await this.api.patch(`/services/${id}/toggle`);
    return response.data;
  }

  async deleteService(id: number): Promise<void> {
    await this.api.delete(`/services/${id}`);
  }

  private writeDebugLog(message: string) {
    try {
      let logs: any[] = [];
      const storedLogs = localStorage.getItem('api_debug_logs');
      
      if (storedLogs) {
        try {
          logs = JSON.parse(storedLogs);
          // Ensure logs is an array
          if (!Array.isArray(logs)) {
            logs = [];
          }
        } catch (parseError) {
          // If parsing fails, clear corrupted data and start fresh
          console.warn('Corrupted debug logs detected, clearing:', parseError);
          localStorage.removeItem('api_debug_logs');
          logs = [];
        }
      }
      
      logs.push({
        timestamp: new Date().toISOString(),
        message
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('api_debug_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to write debug log:', error);
      // Clear potentially corrupted data
      try {
        localStorage.removeItem('api_debug_logs');
      } catch (clearError) {
        console.warn('Failed to clear corrupted debug logs:', clearError);
      }
    }
  }
}

export const apiService = new ApiService();
export default apiService;