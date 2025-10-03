import { Response } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { AuthRequest } from '../middleware/auth';

interface EmployeeLeaveBalance {
  employee_id: string;
  name: string;
  email: string;
  join_date: string;
  months_joined: number;
  employment_type: 'Permanent' | 'Contract';
  total_balance: number;
  total_balance_used: number;
  total_added: number;
  current_leave_balance: number;
}

// Calculate months joined from start date to current date
const calculateMonthsJoined = (joinDate: string): number => {
  const join = new Date(joinDate);
  const now = new Date();
  return Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
};

// Calculate leave balance based on employment type and months joined
const calculateLeaveBalance = (employmentType: 'Permanent' | 'Contract', monthsJoined: number): number => {
  const rate = employmentType === 'Permanent' ? 1.25 : 1.0;
  return monthsJoined * rate;
};

// Check if employee should get balance this month (16th day rule)
const shouldGetBalanceThisMonth = (joinDate: string): boolean => {
  const join = new Date(joinDate);
  const now = new Date();
  
  // If joined this month
  if (join.getFullYear() === now.getFullYear() && join.getMonth() === now.getMonth()) {
    // Only get balance if joined on or before 16th
    return join.getDate() <= 16;
  }
  
  // If joined in previous months, they should get balance
  return true;
};

// Get all employees with their leave balance data
export const getLeaveBalanceData = async (req: AuthRequest, res: Response) => {
  try {
    // Get all active employees with their leave data
    const { data: employees, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        start_date,
        employment_type,
        leave_balance
      `)
      .eq('status', 'Active')
      .order('full_name');

    if (employeeError) {
      console.error('Error fetching employees:', employeeError);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    if (!employees) {
      return res.json([]);
    }

    // Get total approved leave days for each employee
    const employeeBalanceData: EmployeeLeaveBalance[] = [];

    for (const employee of employees) {
      // Calculate total approved leave days with leave type information
      const { data: approvedLeaves, error: leaveError } = await supabaseAdmin
        .from('leave_requests')
        .select(`
          days_requested,
          leave_types!inner(
            name,
            max_days_per_year
          )
        `)
        .eq('employee_id', employee.id)
        .eq('status', 'Approved');

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
        continue;
      }

      // Separate additions and subtractions
      let totalBalanceUsed = 0;
      let totalAdded = 0;

      if (approvedLeaves) {
         for (const leave of approvedLeaves) {
           const leaveType = (leave as any).leave_types;
           const days = leave.days_requested || 0;
           
           // For now, treat all approved leaves as balance used (subtraction)
           // TODO: Add logic to determine if leave type should add or subtract balance
           totalBalanceUsed += days;
         }
       }

      const monthsJoined = calculateMonthsJoined(employee.start_date);
      
      employeeBalanceData.push({
        employee_id: employee.id,
        name: employee.full_name,
        email: employee.email || '',
        join_date: employee.start_date,
        months_joined: monthsJoined,
        employment_type: employee.employment_type,
        total_balance: employee.leave_balance || 0,
        total_balance_used: totalBalanceUsed,
        total_added: totalAdded,
        current_leave_balance: (employee.leave_balance || 0) + totalAdded - totalBalanceUsed
      });
    }

    res.json(employeeBalanceData);
  } catch (error) {
    console.error('Error in getLeaveBalanceData:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Calculate and update leave balances for all employees
export const calculateLeaveBalances = async (req: AuthRequest, res: Response) => {
  try {
    // Get all active employees
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        full_name,
        start_date,
        employment_type,
        leave_balance
      `)
       .eq('status', 'Active');

    if (error) {
      console.error('Error fetching employees:', error);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    if (!employees) {
      return res.json({ message: 'No employees found', updatedCount: 0 });
    }

    const updates = [];
    const today = new Date();

    for (const employee of employees) {
      // Skip if employee shouldn't get balance this month
      if (!shouldGetBalanceThisMonth(employee.start_date)) {
        continue;
      }

      const monthsJoined = calculateMonthsJoined(employee.start_date);
      const newBalance = calculateLeaveBalance(employee.employment_type, monthsJoined);
      
      // Only update if balance has changed
      if (newBalance !== employee.leave_balance) {
        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({ 
            leave_balance: newBalance,
            updated_at: today.toISOString()
          })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Error updating employee ${employee.id}:`, updateError);
          continue;
        }

        updates.push({
          employee_id: employee.id,
          employee_name: employee.full_name,
          old_balance: employee.leave_balance,
          new_balance: newBalance,
          months_joined: monthsJoined,
          employment_type: employee.employment_type
        });
      }
    }

    // Get updated active employee data for frontend display
    const { data: updatedEmployees, error: fetchError } = await supabaseAdmin
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        start_date,
        employment_type,
        leave_balance
      `)
       .eq('status', 'Active')
       .order('full_name');

    if (fetchError) {
      console.error('Error fetching updated employees:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch updated employee data' });
    }

    // Calculate current balance data for each employee
    const employeeBalanceData: EmployeeLeaveBalance[] = [];

    if (updatedEmployees) {
      for (const employee of updatedEmployees) {
        // Calculate total approved leave days with leave type information
        const { data: approvedLeaves, error: leaveError } = await supabaseAdmin
          .from('leave_requests')
          .select(`
            days_requested,
            leave_types!inner(
              type,
              value
            )
          `)
          .eq('employee_id', employee.id)
          .eq('status', 'Approved');

        if (leaveError) {
          console.error('Error fetching leave requests:', leaveError);
          continue;
        }

        // Separate additions and subtractions
        let totalBalanceUsed = 0;
        let totalAdded = 0;

        if (approvedLeaves) {
          for (const leave of approvedLeaves) {
            const leaveType = (leave as any).leave_types;
            const days = leave.days_requested || 0;
            
            if (leaveType?.type === 'Addition') {
              totalAdded += days;
            } else {
              // Default to subtraction for backward compatibility
              totalBalanceUsed += days;
            }
          }
        }

        const monthsJoined = calculateMonthsJoined(employee.start_date);
        
        employeeBalanceData.push({
          employee_id: employee.id,
          name: employee.full_name,
          email: employee.email || '',
          join_date: employee.start_date,
          months_joined: monthsJoined,
          employment_type: employee.employment_type,
          total_balance: employee.leave_balance || 0,
          total_balance_used: totalBalanceUsed,
          total_added: totalAdded,
          current_leave_balance: (employee.leave_balance || 0) + totalAdded - totalBalanceUsed
        });
      }
    }

    res.json({ 
      message: 'Leave balances calculated successfully',
      updatedCount: updates.length,
      updates: updates,
      calculationDate: today.toISOString(),
      data: employeeBalanceData
    });
  } catch (error) {
    console.error('Error in calculateLeaveBalances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get leave balance calculation rules
export const getLeaveBalanceRules = async (req: AuthRequest, res: Response) => {
  try {
    const rules = {
      permanent_employee_rate: 1.25,
      contract_employee_rate: 1.0,
      calculation_unit: 'per month',
      cutoff_rule: 'Employees who join after the 16th of the month will not receive leave balance for that month',
      balance_calculation: 'Total balance = (Months joined × Rate) rounded down to nearest whole number'
    };
    
    res.json(rules);
  } catch (error) {
    console.error('Error in getLeaveBalanceRules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};