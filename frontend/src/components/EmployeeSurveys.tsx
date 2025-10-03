import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, FileText, Calendar, User } from 'lucide-react';
import SurveyTaking from './SurveyTaking';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no' | 'scale';
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

interface Assignment {
  id: string;
  survey_id: string;
  assignee_id: string;
  reviewer_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_at: string;
  due_date?: string;
  completed_at?: string;
  survey: Survey;
  reviewer_name: string;
}

const EmployeeSurveys: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/performance-appraisal/user-assignments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        console.error('Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSurvey = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleBackToList = () => {
    setSelectedAssignment(null);
    fetchAssignments(); // Refresh the list
  };

  const handleSurveyComplete = () => {
    setSelectedAssignment(null);
    fetchAssignments(); // Refresh the list
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending':
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
      default:
        return 'Not Started';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (daysRemaining: number | null) => {
    if (daysRemaining === null) return 'text-gray-500';
    if (daysRemaining < 0) return 'text-red-600';
    if (daysRemaining <= 3) return 'text-orange-600';
    return 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  const getFilterCounts = () => {
    return {
      all: assignments.length,
      pending: assignments.filter(a => a.status === 'pending').length,
      in_progress: assignments.filter(a => a.status === 'in_progress').length,
      completed: assignments.filter(a => a.status === 'completed').length
    };
  };

  if (selectedAssignment) {
    return (
      <SurveyTaking
        assignment={selectedAssignment}
        onBack={handleBackToList}
        onComplete={handleSurveyComplete}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your surveys...</p>
        </div>
      </div>
    );
  }

  const counts = getFilterCounts();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Performance Surveys</h1>
          <p className="text-gray-600">
            Complete your assigned performance appraisal surveys below.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Surveys', count: counts.all },
                { key: 'pending', label: 'Not Started', count: counts.pending },
                { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
                { key: 'completed', label: 'Completed', count: counts.completed }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      filter === tab.key
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Surveys List */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No surveys assigned' : `No ${filter.replace('_', ' ')} surveys`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'You don\'t have any performance surveys assigned yet.'
                : `You don\'t have any ${filter.replace('_', ' ')} surveys at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const daysRemaining = getDaysRemaining(assignment.due_date);
              
              return (
                <div key={assignment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(assignment.status)}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.survey.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(assignment.status)
                          }`}>
                            {getStatusText(assignment.status)}
                          </span>
                        </div>
                        
                        {assignment.survey.description && (
                          <p className="text-gray-600 mb-3">{assignment.survey.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>Reviewer: {assignment.reviewer_name}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Assigned: {formatDate(assignment.assigned_at)}</span>
                          </div>
                          
                          {assignment.due_date && (
                            <div className={`flex items-center ${getDueDateColor(daysRemaining)}`}>
                              <Clock className="h-4 w-4 mr-1" />
                              <span>
                                {daysRemaining !== null && (
                                  daysRemaining < 0 
                                    ? `Overdue by ${Math.abs(daysRemaining)} day(s)`
                                    : daysRemaining === 0 
                                    ? 'Due today'
                                    : `Due in ${daysRemaining} day(s)`
                                )}
                              </span>
                            </div>
                          )}
                          
                          {assignment.completed_at && (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>Completed: {formatDate(assignment.completed_at)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 text-sm text-gray-500">
                          {assignment.survey.questions.length} question{assignment.survey.questions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="ml-6">
                        {assignment.status === 'completed' ? (
                          <div className="flex items-center text-green-600 font-medium">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Survey Completed
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartSurvey(assignment)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            {assignment.status === 'in_progress' ? 'Continue Survey' : 'Start Survey'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Urgency indicator */}
                    {daysRemaining !== null && daysRemaining <= 3 && assignment.status !== 'completed' && (
                      <div className={`mt-4 p-3 rounded-md flex items-center ${
                        daysRemaining < 0 
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-orange-50 border border-orange-200'
                      }`}>
                        <AlertCircle className={`h-5 w-5 mr-2 ${
                          daysRemaining < 0 ? 'text-red-600' : 'text-orange-600'
                        }`} />
                        <span className={`text-sm font-medium ${
                          daysRemaining < 0 ? 'text-red-800' : 'text-orange-800'
                        }`}>
                          {daysRemaining < 0 
                            ? 'This survey is overdue. Please complete it as soon as possible.'
                            : daysRemaining === 0
                            ? 'This survey is due today. Please complete it before the end of the day.'
                            : `This survey is due soon. Please complete it within ${daysRemaining} day(s).`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSurveys;