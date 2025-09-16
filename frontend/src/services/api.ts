import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { LoginRequest, LoginResponse, User, Employee, LeaveRequest, LeaveType, ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    console.log('🔧 ApiService: Initializing with baseURL: /api (using Vite proxy)');
    this.writeDebugLog('ApiService initialized with baseURL: /api (using Vite proxy)');
    
    this.api = axios.create({
      baseURL: '/api',
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
    const response: AxiosResponse<Employee> = await this.api.get(`/employees/${id}`);
    return response.data;
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

  async getManagers(): Promise<{ managers: { id: string; full_name: string; email: string; division: string }[] }> {
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

  async getLeaveTypes(): Promise<LeaveType[]> {
    const response: AxiosResponse<{ leave_types: LeaveType[] }> = await this.api.get('/leaves/types');
    return response.data.leave_types;
  }

  private writeDebugLog(message: string) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}`;
      
      // Store debug logs in localStorage for inspection
      const existingLogs = localStorage.getItem('api_debug_logs') || '';
      const newLogs = existingLogs + logEntry + '\n';
      
      // Keep only last 50 log entries to prevent localStorage overflow
      const logLines = newLogs.split('\n').slice(-50);
      localStorage.setItem('api_debug_logs', logLines.join('\n'));
      
      console.log('🐛 DEBUG:', logEntry);
    } catch (error) {
      // Silently fail to avoid breaking the app
    }
  }
}

export const apiService = new ApiService();
export default apiService;