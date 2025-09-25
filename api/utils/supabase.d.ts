export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export interface Employee {
    id: string;
    full_name: string;
    email: string;
    nik: string;
    division: string;
    employment_type: 'Permanent' | 'Contract';
    leave_balance: number;
    status: 'Active' | 'Inactive';
    start_date: string;
    role: 'Employee' | 'Manager' | 'Admin';
    manager_id?: string;
    created_at: string;
    updated_at: string;
}
export interface LeaveRequest {
    id: string;
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_requested: number;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
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
}
//# sourceMappingURL=supabase.d.ts.map