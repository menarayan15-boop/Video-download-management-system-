import React, { useEffect, useState } from 'react';
import { X, Check, Sparkles, Sliders } from 'lucide-react';
import { api } from '../../services/api';
import { Category } from '../../types';
import { CategoryIcon } from '../layout/CategoryIcon';

interface CategoryPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const CategoryPreferenceModal: React.FC<CategoryPreferenceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([api.getCategories(), api.getCategoryPreferences()])
        .then(([cats, prefs]) => {
          setCategories(cats || []);
          const activeIds = new Set<string>((prefs || []).map((p: any) => p.categoryId));
          setSelectedIds(activeIds);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.setCategoryPreferences(Array.from(selectedIds));
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to update category preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl relative flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Your Interest Topics</h2>
              <p className="text-xs text-gray-400">
                Select your favorite topics to customize your "Recommended for You" feed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close preferences modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Grid */}
        <div className="my-5 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 flex-1">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-xs text-gray-400">
              Loading topics...
            </div>
          ) : (
            categories.map((cat) => {
              const selected = selectedIds.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    selected
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 ${
                      selected
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <CategoryIcon name={cat.icon || cat.slug} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{cat.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {selected ? '✓ Selected' : 'Tap to add'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-white">{selectedIds.size}</span> topics selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs btn-primary font-bold disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
