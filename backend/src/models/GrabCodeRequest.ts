export interface GrabCodeRequest {
  id: string;
  employee_id: string;
  service_needed: 'GrabCar' | 'GrabBike' | 'GrabExpress' | 'GrabFood';
  purpose: string;
  counterpart_name: string;
  usage_date: string; // ISO date string
  usage_time: string; // HH:MM format
  meeting_location: string;
  code_needed: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_at?: string;
  approved_codes?: string[]; // Array of codes provided by HR/Admin
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

export interface UpdateGrabCodeRequestData {
  status?: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_at?: string;
  approved_codes?: string[]; // Array of codes provided by HR/Admin
  rejection_reason?: string;
}