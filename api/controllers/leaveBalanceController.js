"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaveBalanceRules = exports.calculateLeaveBalances = exports.getLeaveBalanceData = void 0;
const supabase_1 = require("../utils/supabase");
// Calculate months joined from start date to current date
const calculateMonthsJoined = (joinDate) => {
    const join = new Date(joinDate);
    const now = new Date();
    return Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
};
// Calculate leave balance based on employment type and months joined
const calculateLeaveBalance = (employmentType, monthsJoined) => {
    const rate = employmentType === 'Permanent' ? 1.25 : 1.0;
    return monthsJoined * rate;
};
// Check if employee should get balance this month (16th day rule)
const shouldGetBalanceThisMonth = (joinDate) => {
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
const getLeaveBalanceData = async (req, res) => {
    try {
        // Get all active employees with their leave data
        const { data: employees, error: employeeError } = await supabase_1.supabaseAdmin
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
        const employeeBalanceData = [];
        for (const employee of employees) {
            // Calculate total approved leave days
            const { data: approvedLeaves, error: leaveError } = await supabase_1.supabaseAdmin
                .from('leave_requests')
                .select('days_requested')
                .eq('employee_id', employee.id)
                .eq('status', 'Approved');
            if (leaveError) {
                console.error('Error fetching leave requests:', leaveError);
                continue;
            }
            const totalBalanceUsed = approvedLeaves?.reduce((sum, leave) => sum + (leave.days_requested || 0), 0) || 0;
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
                current_leave_balance: (employee.leave_balance || 0) - totalBalanceUsed
            });
        }
        res.json(employeeBalanceData);
    }
    catch (error) {
        console.error('Error in getLeaveBalanceData:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeaveBalanceData = getLeaveBalanceData;
// Calculate and update leave balances for all employees
const calculateLeaveBalances = async (req, res) => {
    try {
        // Get all active employees
        const { data: employees, error } = await supabase_1.supabaseAdmin
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
                const { error: updateError } = await supabase_1.supabaseAdmin
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
        const { data: updatedEmployees, error: fetchError } = await supabase_1.supabaseAdmin
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
        const employeeBalanceData = [];
        if (updatedEmployees) {
            for (const employee of updatedEmployees) {
                // Calculate total approved leave days
                const { data: approvedLeaves, error: leaveError } = await supabase_1.supabaseAdmin
                    .from('leave_requests')
                    .select('days_requested')
                    .eq('employee_id', employee.id)
                    .eq('status', 'Approved');
                if (leaveError) {
                    console.error('Error fetching leave requests:', leaveError);
                    continue;
                }
                const totalBalanceUsed = approvedLeaves?.reduce((sum, leave) => sum + (leave.days_requested || 0), 0) || 0;
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
                    current_leave_balance: (employee.leave_balance || 0) - totalBalanceUsed
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
    }
    catch (error) {
        console.error('Error in calculateLeaveBalances:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.calculateLeaveBalances = calculateLeaveBalances;
// Get leave balance calculation rules
const getLeaveBalanceRules = async (req, res) => {
    try {
        const rules = {
            permanent_employee_rate: 1.25,
            contract_employee_rate: 1.0,
            calculation_unit: 'per month',
            cutoff_rule: 'Employees who join after the 16th of the month will not receive leave balance for that month',
            balance_calculation: 'Total balance = (Months joined × Rate) rounded down to nearest whole number'
        };
        res.json(rules);
    }
    catch (error) {
        console.error('Error in getLeaveBalanceRules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeaveBalanceRules = getLeaveBalanceRules;
//# sourceMappingURL=leaveBalanceController.js.map