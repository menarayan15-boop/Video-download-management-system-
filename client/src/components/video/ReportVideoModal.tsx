import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface ReportVideoModalProps {
  videoId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Spam or misleading metadata',
  'Broken playback or missing media',
  'Copyright or rights infringement',
  'Incorrect categorization',
  'Other violation',
];

export const ReportVideoModal: React.FC<ReportVideoModalProps> = ({
  videoId,
  videoTitle,
  isOpen,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.submitReport({
        targetType: 'VIDEO',
        targetId: videoId,
        reason: selectedReason,
        details: details.trim() || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl p-5 sm:p-6 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-red-400">
            <Flag className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">Report Video</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close report modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Report Submitted</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Thank you for keeping Vyntra safe. Our moderation team will review this content.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Reporting:</p>
              <p className="text-xs font-semibold text-white truncate bg-white/5 p-2 rounded-lg border border-white/10">
                {videoTitle}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Reason for reporting
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-red-950/40 border-red-500/50 text-white'
                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe timestamps or specific issues..."
                className="glass-input w-full p-2.5 rounded-xl text-xs resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
