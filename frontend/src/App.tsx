import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LeaveRequest from './components/LeaveRequest';
import MyRequests from './components/MyRequests';
import ApproveRequests from './components/ApproveRequests';
import EmployeeManagement from './components/EmployeeManagement';
import DepartmentManagement from './components/DepartmentManagement';
import LeaveBalanceChecker from './components/LeaveBalanceChecker';
import Services from './components/Services';
import LeaveTypes from './components/LeaveTypes';
import EmployeeProfile from './components/EmployeeProfile';
import PerformanceAppraisal from './components/PerformanceAppraisal';
import EmployeeSurveys from './components/EmployeeSurveys';
import AdminRoute from './components/AdminRoute';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, hasRole } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  return hasRole('Admin') ? <Navigate to="/" /> : <Navigate to="/my-requests" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
                    <Route path="/dashboard" element={<Navigate to="/" />} />
                    <Route path="/leave-request" element={<LeaveRequest />} />
                    <Route path="/my-requests" element={<MyRequests />} />
                    <Route path="/submit-request" element={<div className="text-center py-8"><h2 className="text-xl font-semibold text-gray-900">Submit Request - Coming Soon</h2></div>} />
                    <Route path="/approve-requests" element={<ApproveRequests />} />
                    <Route path="/employees" element={<AdminRoute><EmployeeManagement /></AdminRoute>} />
                    <Route path="/departments" element={<AdminRoute><DepartmentManagement /></AdminRoute>} />
                    <Route path="/leave-balance-checker" element={<AdminRoute><LeaveBalanceChecker /></AdminRoute>} />
                    <Route path="/services" element={<AdminRoute><Services /></AdminRoute>} />
                    <Route path="/leave-types" element={<AdminRoute><LeaveTypes /></AdminRoute>} />
                    <Route path="/performance-appraisal" element={<AdminRoute><PerformanceAppraisal /></AdminRoute>} />
                    <Route path="/employee-surveys" element={<EmployeeSurveys />} />
                    <Route path="/profile" element={<EmployeeProfile />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;