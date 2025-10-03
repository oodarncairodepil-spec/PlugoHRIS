import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Search, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: { id: string; name: string } | string;
  position: string;
  nik: string;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
}

interface Assignment {
  assigneeId: string;
  reviewerId: string;
  dueDate: string;
}

interface ExistingAssignment {
  id: string;
  survey_id: string;
  assignee_id: string;
  reviewer_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: string;
  assignee_name: string;
  reviewer_name: string;
  due_date?: string;
}

interface SurveyAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: Survey;
  onAssign: (assignments: Assignment[]) => Promise<void>;
  onDeleteAssignment?: (assignmentId: string) => Promise<void>;
}

const SurveyAssignmentModal: React.FC<SurveyAssignmentModalProps> = ({
  isOpen,
  onClose,
  survey,
  onAssign,
  onDeleteAssignment
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<ExistingAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState('');
  const [revieweeSearchTerm, setRevieweeSearchTerm] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [selectedReviewees, setSelectedReviewees] = useState<string[]>([]);
  const [defaultDueDate, setDefaultDueDate] = useState('');
  const [expandedReviewers, setExpandedReviewers] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [showAddRevieweeModal, setShowAddRevieweeModal] = useState(false);
  const [selectedReviewerForAdd, setSelectedReviewerForAdd] = useState<string | null>(null);
  const [availableEmployeesForAdd, setAvailableEmployeesForAdd] = useState<Employee[]>([]);
  const [selectedEmployeesToAdd, setSelectedEmployeesToAdd] = useState<string[]>([]);
  const [addRevieweeSearchTerm, setAddRevieweeSearchTerm] = useState(''); // Start with step 1 expanded

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchExistingAssignments();
      // Set default due date to 2 weeks from now
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      setDefaultDueDate(twoWeeksFromNow.toISOString().split('T')[0]);
    }
  }, [isOpen, survey.id]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees?page=1&limit=1000&status=Active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Employees fetched:', data.employees?.length || 0);
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch employees:', response.status);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/performance-appraisal/surveys/${survey.id}/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExistingAssignments(data.assignments || []);
      } else {
        console.error('Failed to fetch existing assignments:', response.status);
        setExistingAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching existing assignments:', error);
      setExistingAssignments([]);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!onDeleteAssignment) return;
    
    try {
      await onDeleteAssignment(assignmentId);
      // Refresh existing assignments after deletion
      await fetchExistingAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  };

  const getFilteredReviewers = (searchTerm: string) => {
    // Get all assigned reviewer IDs from existing assignments
    const assignedReviewerIds = new Set(existingAssignments.map(assignment => assignment.reviewer_id));
    
    // Filter out employees who are already assigned as reviewers
    let availableEmployees = employees.filter(emp => !assignedReviewerIds.has(emp.id));
    
    // If search term is provided, filter by search criteria
    if (searchTerm.trim().length > 0) {
      const searchLower = searchTerm.toLowerCase();
      availableEmployees = availableEmployees.filter(emp => {
        const departmentName = typeof emp.department === 'object' ? emp.department.name : emp.department;
        
        return emp.full_name.toLowerCase().includes(searchLower) ||
          emp.email.toLowerCase().includes(searchLower) ||
          departmentName.toLowerCase().includes(searchLower) ||
          emp.nik.toLowerCase().includes(searchLower);
      });
    }
    
    console.log(`Reviewer search '${searchTerm}' found ${availableEmployees.length} available employees`);
    return availableEmployees;
  };

  const getFilteredReviewees = (searchTerm: string) => {
    if (searchTerm.length < 3) {
      return [];
    }

    const filtered = employees.filter(emp => {
      const departmentName = typeof emp.department === 'object' ? emp.department.name : emp.department;
      const searchLower = searchTerm.toLowerCase();
      
      return emp.full_name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        departmentName.toLowerCase().includes(searchLower) ||
        emp.nik.toLowerCase().includes(searchLower);
    });
    
    console.log(`Reviewee search '${searchTerm}' found ${filtered.length} employees`);
    return filtered;
  };

  const filteredReviewers = getFilteredReviewers(reviewerSearchTerm);
  const filteredReviewees = getFilteredReviewees(revieweeSearchTerm);

  const handleReviewerSelect = (employeeId: string) => {
    setSelectedReviewer(employeeId);
    // Trigger step completion when reviewer is selected
    setTimeout(() => handleStepCompletion(1), 100);
  };

  const handleRevieweeSelect = (employeeId: string) => {
    setSelectedReviewees(prev => {
      const newSelection = prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId];
      
      // Trigger step completion when reviewees are selected
      if (newSelection.length > 0) {
        setTimeout(() => handleStepCompletion(2), 100);
      }
      
      return newSelection;
    });
  };

  const handleSelectAllReviewees = () => {
    if (selectedReviewees.length === filteredReviewees.length) {
      setSelectedReviewees([]);
    } else {
      setSelectedReviewees(filteredReviewees.map(emp => emp.id));
    }
  };

  const toggleReviewerExpansion = (reviewerId: string) => {
    setExpandedReviewers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewerId)) {
        newSet.delete(reviewerId);
      } else {
        newSet.add(reviewerId);
      }
      return newSet;
    });
  };

  const toggleStepExpansion = (stepNumber: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepNumber)) {
        newSet.delete(stepNumber);
      } else {
        newSet.add(stepNumber);
      }
      return newSet;
    });
  };

  const handleStepCompletion = (completedStep: number) => {
    if (completedStep === 1 && selectedReviewer) {
      // Step 1 completed: collapse step 1, expand step 2
      setExpandedSteps(new Set([2]));
    } else if (completedStep === 2 && selectedReviewees.length > 0) {
      // Step 2 completed: collapse step 2, expand step 3
      setExpandedSteps(new Set([3]));
    }
  };

  const handleAddRevieweeToExisting = (reviewerId: string) => {
    setSelectedReviewerForAdd(reviewerId);
    
    // Get employees who are not already assigned to this reviewer
    const existingAssigneeIds = existingAssignments
      .filter(assignment => assignment.reviewer_id === reviewerId)
      .map(assignment => assignment.assignee_id);
    
    const availableEmployees = employees.filter(emp => 
      emp.id !== reviewerId && !existingAssigneeIds.includes(emp.id)
    );
    
    setAvailableEmployeesForAdd(availableEmployees);
    setSelectedEmployeesToAdd([]);
    setAddRevieweeSearchTerm('');
    setShowAddRevieweeModal(true);
  };

  const handleConfirmAddReviewees = async () => {
    if (!selectedReviewerForAdd || selectedEmployeesToAdd.length === 0) return;
    
    try {
      const newAssignments: Assignment[] = selectedEmployeesToAdd.map(employeeId => ({
        assigneeId: employeeId,
        reviewerId: selectedReviewerForAdd,
        dueDate: defaultDueDate
      }));
      
      await onAssign(newAssignments);
      
      // Refresh existing assignments
      await fetchExistingAssignments();
      
      // Close modal and reset state
      setShowAddRevieweeModal(false);
      setSelectedReviewerForAdd(null);
      setSelectedEmployeesToAdd([]);
      setAvailableEmployeesForAdd([]);
    } catch (error) {
      console.error('Error adding reviewees:', error);
    }
  };

  const handleCancelAddReviewees = () => {
    setShowAddRevieweeModal(false);
    setSelectedReviewerForAdd(null);
    setSelectedEmployeesToAdd([]);
    setAddRevieweeSearchTerm('');
    setAvailableEmployeesForAdd([]);
  };

  const toggleEmployeeForAdd = (employeeId: string) => {
    setSelectedEmployeesToAdd(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  // Filter employees for add reviewee modal
  const getFilteredEmployeesForAdd = () => {
    if (addRevieweeSearchTerm.length < 3) {
      return [];
    }
    
    const searchTerm = addRevieweeSearchTerm.toLowerCase();
    return availableEmployeesForAdd.filter(employee => {
      const departmentName = typeof employee.department === 'object' 
        ? employee.department.name 
        : employee.department || '';
      
      return (
        employee.full_name.toLowerCase().includes(searchTerm) ||
        employee.email.toLowerCase().includes(searchTerm) ||
        departmentName.toLowerCase().includes(searchTerm) ||
        employee.nik.toLowerCase().includes(searchTerm)
      );
    });
  };

  // Check if steps are completed
  const isStep1Completed = selectedReviewer !== '';
  const isStep2Completed = selectedReviewees.length > 0;

  const groupAssignmentsByReviewer = () => {
    const grouped: { [reviewerId: string]: ExistingAssignment[] } = {};
    existingAssignments.forEach(assignment => {
      if (!grouped[assignment.reviewer_id]) {
        grouped[assignment.reviewer_id] = [];
      }
      grouped[assignment.reviewer_id].push(assignment);
    });
    return grouped;
  };

  const generateAssignments = () => {
    if (!selectedReviewer || selectedReviewees.length === 0) {
      alert('Please select a reviewer and at least one reviewee.');
      return;
    }

    const newAssignments: Assignment[] = selectedReviewees.map(assigneeId => ({
      assigneeId,
      reviewerId: selectedReviewer,
      dueDate: defaultDueDate
    }));
    
    setAssignments(newAssignments);
  };

  const handleAssign = async () => {
    if (assignments.length === 0) {
      alert('Please generate assignments first.');
      return;
    }
    
    setSaving(true);
    try {
      await onAssign(assignments);
      onClose();
      // Reset state
      setSelectedReviewer('');
      setSelectedReviewees([]);
      setAssignments([]);
      setReviewerSearchTerm('');
      setRevieweeSearchTerm('');
    } catch (error) {
      console.error('Error assigning survey:', error);
      alert('Failed to assign survey. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-0 border max-w-6xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Assign Survey</h3>
            <p className="text-sm text-gray-500 mt-1">
              Assign "{survey.title}" to employees
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Existing Assignments Section */}
          {existingAssignments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Assignments</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(groupAssignmentsByReviewer()).map(([reviewerId, assignments]) => {
                  const isExpanded = expandedReviewers.has(reviewerId);
                  const reviewerName = assignments[0].reviewer_name;
                  
                  return (
                    <div key={reviewerId} className="border border-gray-200 rounded-lg">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleReviewerExpansion(reviewerId)}
                      >
                        <div className="flex items-center space-x-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">{reviewerName}</span>
                          <span className="text-sm text-gray-500">({assignments.length} reviewee{assignments.length !== 1 ? 's' : ''})</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRevieweeToExisting(reviewerId);
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                          title="Add more reviewees"
                        >
                          + Add Reviewees
                        </button>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{assignment.assignee_name}</div>
                                <div className="text-sm text-gray-500">
                                  Status: {assignment.status} • Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'Not set'}
                                </div>
                              </div>
                              {onDeleteAssignment && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAssignment(assignment.id);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete assignment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="date"
                value={defaultDueDate}
                onChange={(e) => setDefaultDueDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Reviewer Section */}
          <div className="mb-8 bg-blue-50 rounded-lg border border-blue-200">
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-blue-100 rounded-t-lg"
              onClick={() => toggleStepExpansion(1)}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Step 1: Select Reviewer</h3>
                {isStep1Completed && (
                  <span className="ml-3 text-sm text-green-600 font-medium">✓ Completed</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isStep1Completed && selectedReviewer && (
                  <span className="text-sm text-blue-700">
                    {employees.find(emp => emp.id === selectedReviewer)?.full_name}
                  </span>
                )}
                {expandedSteps.has(1) ? (
                  <ChevronDown className="h-5 w-5 text-blue-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-blue-600" />
                )}
              </div>
            </div>
            
            {expandedSteps.has(1) && (
              <div className="px-6 pb-6">
                <p className="text-sm text-blue-700 mb-4">Choose one employee who will conduct the performance review.</p>
            
            <div className="bg-white p-4 rounded-md border">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Available Reviewers (1 required)
                </label>
                {selectedReviewer && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Selected: {employees.find(emp => emp.id === selectedReviewer)?.full_name}
                  </p>
                )}
              </div>
              
              {/* Reviewer Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reviewers..."
                  value={reviewerSearchTerm}
                  onChange={(e) => setReviewerSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Reviewer List */}
              <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading employees...</div>
                ) : filteredReviewers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No available reviewers found</div>
                ) : (
                  filteredReviewers.map(employee => (
                    <label
                      key={employee.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="radio"
                        name="reviewer"
                        checked={selectedReviewer === employee.id}
                        onChange={() => handleReviewerSelect(employee.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {employee.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email} • {typeof employee.department === 'object' ? employee.department.name : employee.department}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Reviewee Section */}
          <div className="mb-8 bg-green-50 rounded-lg border border-green-200">
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-green-100 rounded-t-lg"
              onClick={() => toggleStepExpansion(2)}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-900">Step 2: Select Reviewees</h3>
                {isStep2Completed && (
                  <span className="ml-3 text-sm text-green-600 font-medium">✓ Completed</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isStep2Completed && (
                  <span className="text-sm text-green-700">
                    {selectedReviewees.length} selected
                  </span>
                )}
                {expandedSteps.has(2) ? (
                  <ChevronDown className="h-5 w-5 text-green-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-green-600" />
                )}
              </div>
            </div>
            
            {expandedSteps.has(2) && (
              <div className="px-6 pb-6">
                <p className="text-sm text-green-700 mb-4">Choose employees who will be reviewed by the selected reviewer.</p>
            
            <div className="bg-white p-4 rounded-md border">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Available Employees ({selectedReviewees.length} selected)
                </label>
                <button
                  onClick={handleSelectAllReviewees}
                  disabled={filteredReviewees.length === 0}
                  className="text-sm text-green-600 hover:text-green-800 disabled:text-gray-400 font-medium"
                >
                  {selectedReviewees.length === filteredReviewees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              {/* Reviewee Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Type at least 3 characters..."
                  value={revieweeSearchTerm}
                  onChange={(e) => setRevieweeSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Reviewee List */}
              <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading employees...</div>
                ) : revieweeSearchTerm.length < 3 ? (
                  <div className="p-4 text-center text-gray-500">Type at least 3 characters to search</div>
                ) : filteredReviewees.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No employees found</div>
                ) : (
                  filteredReviewees.map(employee => (
                    <label
                      key={employee.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedReviewees.includes(employee.id)}
                        onChange={() => handleRevieweeSelect(employee.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {employee.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email} • {typeof employee.department === 'object' ? employee.department.name : employee.department}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Assignment Preview Section */}
          <div className="mb-8 bg-gray-50 rounded-lg border border-gray-200">
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-100 rounded-t-lg"
              onClick={() => toggleStepExpansion(3)}
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Step 3: Review Assignments</h3>
                {assignments.length > 0 && (
                  <span className="ml-3 text-sm text-green-600 font-medium">✓ Ready</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {assignments.length > 0 && (
                  <span className="text-sm text-gray-700">
                    {assignments.length} assignments
                  </span>
                )}
                {expandedSteps.has(3) ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
              </div>
            </div>
            
            {expandedSteps.has(3) && (
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-700">Review the assignments before finalizing.</p>
                  <button
                    onClick={generateAssignments}
                    disabled={!selectedReviewer || selectedReviewees.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Generate Preview
                  </button>
                </div>
            
            <div className="bg-white p-4 rounded-md border">
              <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                {assignments.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Select reviewer and reviewees, then click "Generate Preview" to review assignments
                  </div>
                ) : (
                  assignments.map((assignment, index) => {
                    const assignee = employees.find(emp => emp.id === assignment.assigneeId);
                    const reviewer = employees.find(emp => emp.id === assignment.reviewerId);
                    
                    return (
                      <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {assignee?.full_name}
                          </div>
                          <div className="text-gray-500">
                            Reviewed by: {reviewer?.full_name}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || assignments.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Assigning...' : `Assign to ${assignments.length} Employee${assignments.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
      
      {/* Add Reviewee Modal */}
      {showAddRevieweeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-0 border max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Add Reviewees</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add more employees to be reviewed by {selectedReviewerForAdd && employees.find(emp => emp.id === selectedReviewerForAdd)?.full_name}
                </p>
              </div>
              <button
                onClick={handleCancelAddReviewees}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, department, or NIK (min 3 chars)..."
                    value={addRevieweeSearchTerm}
                    onChange={(e) => setAddRevieweeSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {addRevieweeSearchTerm.length > 0 && addRevieweeSearchTerm.length < 3 && (
                  <p className="text-sm text-gray-500 mt-1">Type at least 3 characters to search</p>
                )}
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Available Employees ({addRevieweeSearchTerm.length >= 3 ? getFilteredEmployeesForAdd().length : availableEmployeesForAdd.length})
                </h4>
                
                {addRevieweeSearchTerm.length > 0 && addRevieweeSearchTerm.length < 3 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Type at least 3 characters to search employees</p>
                  </div>
                ) : addRevieweeSearchTerm.length >= 3 && getFilteredEmployeesForAdd().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No employees found matching your search.</p>
                  </div>
                ) : availableEmployeesForAdd.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No additional employees available for this reviewer.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                    {(addRevieweeSearchTerm.length >= 3 ? getFilteredEmployeesForAdd() : availableEmployeesForAdd).map((employee) => (
                      <label key={employee.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedEmployeesToAdd.includes(employee.id)}
                          onChange={() => toggleEmployeeForAdd(employee.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {selectedEmployeesToAdd.includes(employee.id) && '✓ '}{employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.email} • {typeof employee.department === 'object' ? employee.department.name : employee.department}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCancelAddReviewees}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddReviewees}
                disabled={selectedEmployeesToAdd.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedEmployeesToAdd.length} Reviewee{selectedEmployeesToAdd.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyAssignmentModal;