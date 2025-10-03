import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowLeft, GripVertical } from 'lucide-react';

interface Question {
  id: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  text: string;
  options?: string[];
  required: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

interface SurveyCreatorProps {
  onBack: () => void;
  onSave: (survey: any) => void;
  editingSurvey?: any;
}

const SurveyCreator: React.FC<SurveyCreatorProps> = ({ onBack, onSave, editingSurvey }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingSurvey) {
      loadSurveyData();
    }
  }, [editingSurvey]);

  const loadSurveyData = async () => {
    if (!editingSurvey?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/performance-appraisal/surveys/${editingSurvey.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTitle(data.survey.title || '');
        setDescription(data.survey.description || '');
        setQuestions(data.survey.questions || []);
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      type: 'text',
      text: '',
      required: true
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(questions.find(q => q.id === questionId)?.options || []), '']
    });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.options) {
      const newOptions = question.options.filter((_, index) => index !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Validate questions
    for (const question of questions) {
      if (!question.text.trim()) {
        alert('Please fill in all question texts');
        return;
      }
      if ((question.type === 'multiple_choice') && (!question.options || question.options.length < 2)) {
        alert('Multiple choice questions must have at least 2 options');
        return;
      }
    }

    setSaving(true);
    try {
      const surveyData = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map((q, index) => ({
          ...q,
          order_index: index
        }))
      };
      
      await onSave(surveyData);
    } catch (error) {
      console.error('Error saving survey:', error);
      // Error handling is done in parent component
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionEditor = (question: Question, index: number) => {
    return (
      <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
            <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
          </div>
          <button
            onClick={() => deleteQuestion(question.id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              value={question.text}
              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter your question..."
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={question.type}
                onChange={(e) => updateQuestion(question.id, { 
                  type: e.target.value as Question['type'],
                  options: e.target.value === 'multiple_choice' ? ['', ''] : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text Response</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="rating">Rating Scale (1-5)</option>
                <option value="yes_no">Yes/No</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            </div>
          </div>

          {question.type === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {question.options?.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    {(question.options?.length || 0) > 2 && (
                      <button
                        onClick={() => removeOption(question.id, optionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addOption(question.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}

          {question.type === 'rating' && (
            <div className="text-sm text-gray-600">
              This will display a 1-5 rating scale for respondents.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading survey data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Surveys</span>
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">
          {editingSurvey ? 'Edit Survey' : 'Create New Survey'}
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Survey Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter survey title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter survey description..."
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <button
            onClick={addQuestion}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Question</span>
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No questions added yet. Click "Add Question" to get started.</p>
          </div>
        ) : (
          <div>
            {questions.map((question, index) => renderQuestionEditor(question, index))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Survey'}</span>
        </button>
      </div>
    </div>
  );
};

export default SurveyCreator;