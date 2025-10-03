import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Calendar, FileText, Eye } from 'lucide-react';
import SurveyCreator from './SurveyCreator';
import SurveyAssignmentModal from './SurveyAssignmentModal';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  created_by: string;
  total_questions: number;
  total_assignments: number;
}

interface SurveyAssignment {
  id: string;
  survey_id: string;
  assignee_id: string;
  reviewer_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: string;
  completed_at?: string;
  assignee_name: string;
  reviewer_name: string;
}

const PerformanceAppraisal: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [assignments, setAssignments] = useState<SurveyAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<'surveys' | 'assignments'>('surveys');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [showSurveyCreator, setShowSurveyCreator] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [surveyToAssign, setSurveyToAssign] = useState<Survey | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ isVisible: false, message: '', type: 'info' });

  useEffect(() => {
    fetchSurveys();
    fetchAssignments();
  }, []);

  const fetchSurveys = async () => {
    try {
      const response = await fetch('/api/performance-appraisal/surveys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/performance-appraisal/assignments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ isVisible: true, message, type });
  };

  const showConfirmDialog = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  };

  const closeToast = () => {
    setToast({ isVisible: false, message: '', type: 'info' });
  };

  const handleCreateSurvey = () => {
    setEditingSurvey(null);
    setShowSurveyCreator(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setShowSurveyCreator(true);
  };

  const handleSaveSurvey = async (surveyData: any) => {
    try {
      const url = editingSurvey 
        ? `/api/performance-appraisal/surveys/${editingSurvey.id}`
        : '/api/performance-appraisal/surveys';
      
      const method = editingSurvey ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(surveyData)
      });
      
      if (response.ok) {
        setShowSurveyCreator(false);
        setEditingSurvey(null);
        fetchSurveys();
        showToast(
          editingSurvey ? 'Survey updated successfully' : 'Survey created successfully',
          'success'
        );
      } else {
        throw new Error('Failed to save survey');
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      showToast('Failed to save survey. Please try again.', 'error');
      throw error;
    }
  };

  const handleBackFromCreator = () => {
    setShowSurveyCreator(false);
    setEditingSurvey(null);
  };

  const handleAssignSurvey = (survey: Survey) => {
    setSurveyToAssign(survey);
  };

  const handleSurveyAssignment = async (assignments: { assigneeId: string; reviewerId: string; dueDate: string }[]) => {
    try {
      const response = await fetch('/api/performance-appraisal/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          survey_id: surveyToAssign?.id,
          assignments
        })
      });
      
      if (response.ok) {
        setSurveyToAssign(null);
        fetchAssignments();
        fetchSurveys(); // Refresh to update assignment counts
        showToast('Survey assigned successfully', 'success');
      } else {
        throw new Error('Failed to assign survey');
      }
    } catch (error) {
      console.error('Error assigning survey:', error);
      throw error;
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/performance-appraisal/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchAssignments();
        fetchSurveys(); // Refresh to update assignment counts
        showToast('Assignment deleted successfully', 'success');
      } else {
        throw new Error('Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showToast('Failed to delete assignment. Please try again.', 'error');
      throw error;
    }
  };

  const handleDeleteSurvey = (surveyId: string) => {
    showConfirmDialog(
      'Delete Survey',
      'Are you sure you want to delete this survey? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/performance-appraisal/surveys/${surveyId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            showToast('Survey deleted successfully', 'success');
            fetchSurveys();
          } else {
            throw new Error('Failed to delete survey');
          }
        } catch (error) {
          console.error('Error deleting survey:', error);
          showToast('Failed to delete survey. Please try again.', 'error');
        }
      },
      'danger'
    );
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800'
    };
    
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          UNKNOWN
        </span>
      );
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (showSurveyCreator) {
    return (
      <SurveyCreator
        onBack={handleBackFromCreator}
        onSave={handleSaveSurvey}
        editingSurvey={editingSurvey}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Performance Appraisal</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage performance surveys and employee evaluations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateSurvey}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Create Survey
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('surveys')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'surveys'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline-block w-4 h-4 mr-2" />
            Surveys ({surveys.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline-block w-4 h-4 mr-2" />
            Assignments ({assignments.length})
          </button>
        </nav>
      </div>

      {/* Surveys Tab */}
      {activeTab === 'surveys' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {surveys.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new survey.</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateSurvey}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  Create Survey
                </button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {surveys.map((survey) => (
                <li key={survey.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{survey.title}</p>
                          <div className="ml-2">
                            {getStatusBadge(survey.status)}
                          </div>
                        </div>
                        {survey.description && (
                          <p className="text-sm text-gray-500">{survey.description}</p>
                        )}
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          Created {new Date(survey.created_at).toLocaleDateString()}
                          <span className="mx-2">•</span>
                          {survey.total_questions} questions
                          <span className="mx-2">•</span>
                          {survey.total_assignments} assignments
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAssignSurvey(survey)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Users className="-ml-0.5 mr-1 h-4 w-4" />
                        Assign
                      </button>
                      <button
                        onClick={() => handleEditSurvey(survey)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Edit className="-ml-0.5 mr-1 h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => window.location.href = `/performance-appraisal/survey/${survey.id}/responses`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Eye className="-ml-0.5 mr-1 h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteSurvey(survey.id)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="-ml-0.5 mr-1 h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
              <p className="mt-1 text-sm text-gray-500">Assignments will appear here once surveys are assigned to employees.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.reviewer_name} → {assignment.assignee_name}
                          </p>
                          <div className="ml-2">
                            {getStatusBadge(assignment.status)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                          {assignment.completed_at && (
                            <>
                              <span className="mx-2">•</span>
                              Completed {new Date(assignment.completed_at).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.location.href = `/performance-appraisal/assignment/${assignment.id}/responses`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Eye className="-ml-0.5 mr-1 h-4 w-4" />
                        View Responses
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modals would be implemented here */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Survey</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Survey creation interface will be implemented here.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {surveyToAssign && (
        <SurveyAssignmentModal
          isOpen={!!surveyToAssign}
          onClose={() => setSurveyToAssign(null)}
          survey={surveyToAssign}
          onAssign={handleSurveyAssignment}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  );
};

export default PerformanceAppraisal;