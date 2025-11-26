import React from 'react';

/**
 * A reusable multi-select chip component.
 *
 * @param {Object} props
 * @param {string} props.label - Label displayed above the chips.
 * @param {Array<{ id: string, label: string }>} props.options - Available options.
 * @param {string[]} props.selected - Array of selected option IDs.
 * @param {(selected: string[]) => void} props.onChange - Callback when selection changes.
 */
export default function MultiSelectChips({ label, options, selected, onChange }) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map(o => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="text-cyan-600 hover:text-cyan-500 transition-colors"
          >
            All
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isSelected
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-400">
        {selected.length} of {options.length} selected
      </div>
    </div>
  );
}
