/**
 * Shared form components for type-specific forms
 */

/**
 * Form field wrapper with label
 */
export function FormField({ label, hint, error, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
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
export function ButtonGroup({ options, value, onChange, size = 'md', className = '' }) {
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
              rounded-md font-medium transition-colors capitalize
              ${isSelected
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
 * Checkbox with label
 */
export function Checkbox({ label, checked, onChange, disabled = false, className = '' }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

/**
 * Number input with optional min/max
 */
export function NumberInput({ value, onChange, min, max, placeholder, className = '' }) {
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
        w-full px-3 py-2 rounded-lg border border-slate-300
        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        text-sm ${className}
      `}
    />
  );
}

/**
 * Select dropdown
 */
export function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`
        w-full px-3 py-2 rounded-lg border border-slate-300
        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        text-sm ${className}
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
export function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2 rounded-lg border border-slate-300
        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        text-sm ${className}
      `}
    />
  );
}

/**
 * Multi-select with checkboxes
 */
export function MultiSelect({ options, value = [], onChange, className = '' }) {
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
          />
        );
      })}
    </div>
  );
}
