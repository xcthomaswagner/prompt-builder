/**
 * Outcome Feedback Component
 * 
 * Modal for collecting user feedback after using a prompt.
 */

import { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

const OUTCOME_OPTIONS = [
  { value: 'used_as_is', label: 'Used as-is' },
  { value: 'small_edits', label: 'Small edits' },
  { value: 'major_edits', label: 'Major edits' },
  { value: 'abandoned', label: 'Started over' },
];

const EDIT_OPTIONS = [
  'More specific',
  'Different tone',
  'Shorter',
  'Longer',
  'Different structure',
  'Missing context',
  'Too complex',
  'Too simple',
];

/**
 * Rating button component
 */
function RatingButton({ icon, label, selected, onClick, darkMode = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-50'
          : darkMode ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }
      `}
    >
      <span className={selected ? 'text-indigo-600' : darkMode ? 'text-slate-500' : 'text-slate-400'}>
        {icon}
      </span>
      <span className={`text-sm font-medium ${selected ? 'text-indigo-700' : darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        {label}
      </span>
    </button>
  );
}

/**
 * Main Outcome Feedback component
 */
export default function OutcomeFeedback({ 
  promptId,
  spec,
  onSubmit, 
  onDismiss,
  isOpen = true,
  darkMode = false
}) {
  const [rating, setRating] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [edits, setEdits] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleEdit = (edit) => {
    setEdits(prev => 
      prev.includes(edit) 
        ? prev.filter(e => e !== edit)
        : [...prev, edit]
    );
  };

  const handleSubmit = async () => {
    if (!rating) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        promptId,
        specSnapshot: spec,
        rating,
        outcome,
        editsNeeded: edits,
        feedback,
      });
      setSubmitted(true);
      setTimeout(() => {
        onDismiss();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = rating !== null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            How did it go?
          </h3>
          <button
            onClick={onDismiss}
            className={`p-1 rounded ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className={`text-lg font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Thanks for your feedback!</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>This helps us improve.</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Rating */}
            <div className="space-y-3">
              <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Did the prompt work well?
              </label>
              <div className="flex gap-3">
                <RatingButton
                  icon={<ThumbsUp className="w-6 h-6" />}
                  label="Worked well"
                  selected={rating === 'positive'}
                  onClick={() => setRating('positive')}
                  darkMode={darkMode}
                />
                <RatingButton
                  icon={<ThumbsDown className="w-6 h-6" />}
                  label="Needed work"
                  selected={rating === 'negative'}
                  onClick={() => setRating('negative')}
                  darkMode={darkMode}
                />
              </div>
            </div>

            {/* Outcome */}
            {rating && (
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  What happened?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOutcome(opt.value)}
                      className={`
                        px-3 py-2 rounded-lg border text-sm font-medium transition-all
                        ${outcome === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : darkMode ? 'border-slate-600 text-slate-300 hover:border-slate-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Edits Needed (for negative rating) */}
            {rating === 'negative' && (
              <div className="space-y-3">
                <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  What would have helped?
                </label>
                <div className="flex flex-wrap gap-2">
                  {EDIT_OPTIONS.map(edit => (
                    <button
                      key={edit}
                      type="button"
                      onClick={() => toggleEdit(edit)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm transition-all
                        ${edits.includes(edit)
                          ? 'bg-indigo-100 text-indigo-700'
                          : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }
                      `}
                    >
                      {edit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Free-form feedback */}
            {rating && (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Anything else? <span className={`font-normal ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us more..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400' : 'border-slate-300'}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!submitted && (
          <div className={`flex justify-end gap-3 p-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              onClick={onDismiss}
              className={`px-4 py-2 text-sm font-medium ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${canSubmit && !isSubmitting
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
