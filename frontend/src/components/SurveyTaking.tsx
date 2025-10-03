import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Save } from 'lucide-react';

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

interface SurveyTakingProps {
  assignment: Assignment;
  onBack: () => void;
  onComplete: () => void;
}

const SurveyTaking: React.FC<SurveyTakingProps> = ({ assignment, onBack, onComplete }) => {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);

  const { survey } = assignment;
  const currentQuestion = survey.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === survey.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Load existing responses if survey is in progress
  useEffect(() => {
    if (assignment.status === 'in_progress') {
      loadExistingResponses();
    }
  }, [assignment.id]);

  const loadExistingResponses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/performance-appraisal/responses/${assignment.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const existingResponses: Record<string, string> = {};
        data.responses?.forEach((resp: any) => {
          existingResponses[resp.question_id] = resp.answer;
        });
        setResponses(existingResponses);
      }
    } catch (error) {
      console.error('Error loading existing responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setShowValidation(false);
  };

  const validateCurrentQuestion = () => {
    if (currentQuestion.required && !responses[currentQuestion.id]) {
      setShowValidation(true);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentQuestion()) return;
    
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowValidation(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowValidation(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await saveResponses(false);
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all required questions
    const unansweredRequired = survey.questions.filter(q => 
      q.required && !responses[q.id]
    );
    
    if (unansweredRequired.length > 0) {
      alert(`Please answer all required questions. Missing: ${unansweredRequired.length} question(s)`);
      // Navigate to first unanswered required question
      const firstUnansweredIndex = survey.questions.findIndex(q => 
        q.required && !responses[q.id]
      );
      if (firstUnansweredIndex !== -1) {
        setCurrentQuestionIndex(firstUnansweredIndex);
        setShowValidation(true);
      }
      return;
    }

    if (window.confirm('Are you sure you want to submit this survey? You won\'t be able to make changes after submission.')) {
      setSaving(true);
      try {
        await saveResponses(true);
        onComplete();
      } catch (error) {
        console.error('Error submitting survey:', error);
        alert('Failed to submit survey. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const saveResponses = async (isSubmission: boolean) => {
    const responsesToSave = Object.entries(responses).map(([questionId, answer]) => ({
      question_id: questionId,
      answer
    }));

    const response = await fetch('/api/performance-appraisal/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        assignment_id: assignment.id,
        responses: responsesToSave,
        is_submission: isSubmission
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save responses');
    }
  };

  const renderQuestion = (question: Question) => {
    const value = responses[question.id] || '';
    const hasError = showValidation && question.required && !value;

    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your response..."
          />
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'yes_no':
        return (
          <div className="space-y-3">
            {['Yes', 'No'].map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <label key={rating} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={rating.toString()}
                  checked={value === rating.toString()}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              </label>
            ))}
          </div>
        );

      case 'scale':
        const min = question.scaleMin || 1;
        const max = question.scaleMax || 10;
        const scaleOptions = [];
        for (let i = min; i <= max; i++) {
          scaleOptions.push(i);
        }
        
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{question.scaleMinLabel || `${min} (Lowest)`}</span>
              <span>{question.scaleMaxLabel || `${max} (Highest)`}</span>
            </div>
            <div className="flex justify-between space-x-2">
              {scaleOptions.map((num) => (
                <label key={num} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={num.toString()}
                    checked={value === num.toString()}
                    onChange={(e) => handleResponseChange(question.id, e.target.value)}
                    className="w-4 h-4 text-blue-600 mb-1"
                  />
                  <span className="text-sm text-gray-700">{num}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    const answeredQuestions = survey.questions.filter(q => responses[q.id]).length;
    return (answeredQuestions / survey.questions.length) * 100;
  };

  const getDaysRemaining = () => {
    if (!assignment.due_date) return null;
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Assignments
            </button>
            
            {daysRemaining !== null && (
              <div className={`flex items-center text-sm ${
                daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-600'
              }`}>
                <Clock className="h-4 w-4 mr-1" />
                {daysRemaining < 0 
                  ? `Overdue by ${Math.abs(daysRemaining)} day(s)`
                  : daysRemaining === 0 
                  ? 'Due today'
                  : `${daysRemaining} day(s) remaining`
                }
              </div>
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 mb-4">{survey.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Reviewer: {assignment.reviewer_name}
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestionIndex + 1} of {survey.questions.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex-1">
                {currentQuestion.text}
                {currentQuestion.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h2>
            </div>
            
            {showValidation && currentQuestion.required && !responses[currentQuestion.id] && (
              <div className="flex items-center text-red-600 text-sm mb-4">
                <AlertCircle className="h-4 w-4 mr-1" />
                This question is required
              </div>
            )}
            
            {renderQuestion(currentQuestion)}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <button
                onClick={handlePrevious}
                disabled={isFirstQuestion}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>
            
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLastQuestion ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Survey
                </>
              ) : (
                'Next Question'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyTaking;