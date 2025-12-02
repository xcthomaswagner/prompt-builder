/**
 * Shared form components for type-specific forms
 */

/**
 * Form field wrapper with label and error handling
 * 
 * @param {Object} props
 * @param {string} [props.label] - Field label text
 * @param {string} [props.hint] - Helper hint text
 * @param {string} [props.error] - Error message to display
 * @param {React.ReactNode} props.children - Field input component
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.darkMode] - Whether to use dark mode styling
 */
export function FormField({ label, hint, error, children, className = '', darkMode = false }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

/**
 * Button group for single-select options
 */
export function ButtonGroup({ options, value, onChange, size = 'md', className = '', darkMode = false }) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const isSelected = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`
              ${sizeClasses[size]}
              rounded-md font-medium transition-all capitalize border
              ${isSelected
                ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                : darkMode ? 'bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500 hover:border-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
              }
            `}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Checkbox with label - styled to match Output Type buttons
 */
export function Checkbox({ label, checked, onChange, disabled = false, className = '', darkMode = false }) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={handleClick}
    >
      <div
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
          ${checked
            ? 'bg-cyan-50 border-cyan-500'
            : darkMode ? 'bg-slate-600 border-slate-500 hover:border-slate-400' : 'bg-white border-slate-300 hover:border-slate-400'
          }
        `}
      >
        {checked && (
          <svg className="w-3 h-3 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm select-none ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
    </div>
  );
}

/**
 * Number input with optional min/max
 */
export function NumberInput({ value, onChange, min, max, placeholder, className = '', darkMode = false }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
        onChange(val);
      }}
      min={min}
      max={max}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 rounded-lg border
        focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
        text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200 placeholder:text-slate-400' : 'bg-white border-slate-300'} ${className}
      `}
    />
  );
}

/**
 * Select dropdown
 */
export function Select({ value, onChange, options, placeholder, className = '', darkMode = false }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`
        w-full px-3 py-2 rounded-lg border
        focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
        text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200' : 'bg-white border-slate-300 text-slate-700'} ${className}
      `}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  );
}

/**
 * Text input
 */
export function TextInput({ value, onChange, placeholder, className = '', darkMode = false }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 rounded-lg border
        focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
        text-sm ${darkMode ? 'bg-slate-600 border-slate-500 text-slate-200 placeholder:text-slate-400' : 'bg-white border-slate-300'} ${className}
      `}
    />
  );
}

/**
 * Multi-select with checkboxes
 */
export function MultiSelect({ options, value = [], onChange, className = '', darkMode = false }) {
  const toggleOption = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <Checkbox
            key={optionValue}
            label={optionLabel}
            checked={value.includes(optionValue)}
            onChange={() => toggleOption(optionValue)}
            darkMode={darkMode}
          />
        );
      })}
    </div>
  );
}
