export interface User {
  id: string;
  email: string;
  role: 'Employee' | 'Manager' | 'Admin' | 'HR';
  employee?: Employee;
}

export interface Employee {
  id: string;
  nik: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  division: string;
  start_date: string;
  salary: number;
  leave_balance: number;
  status: 'Active' | 'Inactive';
  manager_id?: string;
  manager?: Employee;
  employment_type: 'Permanent' | 'Contract';
  role: 'Employee' | 'Manager' | 'Admin' | 'HR';
  password_changed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  max_days_per_year?: number;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: Employee;
  leave_type_id: string;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  days_requested: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_by_user?: Employee;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Department {
  id: string;
  name: string;
  details?: string;
  head_id?: string;
  head?: Employee;
  employee_count?: number;
}

export interface GrabCodeRequest {
  id: string;
  employee_id: string;
  employee?: Employee;
  service_needed: 'GrabCar' | 'GrabBike' | 'GrabExpress' | 'GrabFood';
  purpose: string;
  counterpart_name: string;
  usage_date: string;
  usage_time: string;
  meeting_location: string;
  code_needed: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_by_user?: Employee;
  approved_at?: string;
  approved_codes?: string[];
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGrabCodeRequestData {
  service_needed: 'GrabCar' | 'GrabBike' | 'GrabExpress' | 'GrabFood';
  purpose: string;
  counterpart_name: string;
  usage_date: string;
  usage_time: string;
  meeting_location: string;
  code_needed: number;
}

export interface DepartmentEmployee {
  id: string;
  department_id: string;
  employee_id: string;
  department?: Department;
  employee?: Employee;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}