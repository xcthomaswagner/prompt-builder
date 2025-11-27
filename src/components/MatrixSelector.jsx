import MultiSelectChips from './MultiSelectChips';

// Default options – can be overridden via props
const DEFAULT_TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'creative', label: 'Creative' },
  { id: 'academic', label: 'Academic' },
  { id: 'casual', label: 'Casual' },
  { id: 'instructive', label: 'Instructive' }
];

const DEFAULT_LENGTHS = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' }
];

const DEFAULT_FORMATS = [
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'bullets', label: 'Bullet Points' },
  { id: 'numbered', label: 'Numbered List' },
  { id: 'steps', label: 'Step-by-Step' },
  { id: 'sections', label: 'Structured Sections' },
  { id: 'email', label: 'Email' },
  { id: 'table', label: 'Table' },
  { id: 'qa', label: 'Q&A' }
];

/**
 * MatrixSelector – allows multi-selection of Tones, Lengths, and Formats.
 *
 * @param {Object} props
 * @param {{ tones: string[], lengths: string[], formats: string[] }} props.value - Current selection.
 * @param {(config: { tones: string[], lengths: string[], formats: string[] }) => void} props.onChange
 * @param {{ tones?: Array, lengths?: Array, formats?: Array }} [props.options] - Override default options.
 */
export default function MatrixSelector({ value, onChange, options = {} }) {
  const toneOptions = options.tones || DEFAULT_TONES;
  const lengthOptions = options.lengths || DEFAULT_LENGTHS;
  const formatOptions = options.formats || DEFAULT_FORMATS;

  const handleTonesChange = (tones) => {
    onChange({ ...value, tones });
  };

  const handleLengthsChange = (lengths) => {
    onChange({ ...value, lengths });
  };

  const handleFormatsChange = (formats) => {
    onChange({ ...value, formats });
  };

  const totalCombos = (value.tones?.length || 0) * (value.lengths?.length || 0) * (value.formats?.length || 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Matrix Configuration</h3>
        <span className="text-sm text-slate-500">
          {totalCombos} combination{totalCombos !== 1 ? 's' : ''}
        </span>
      </div>

      <MultiSelectChips
        label="Tones"
        options={toneOptions}
        selected={value.tones || []}
        onChange={handleTonesChange}
      />

      <MultiSelectChips
        label="Lengths"
        options={lengthOptions}
        selected={value.lengths || []}
        onChange={handleLengthsChange}
      />

      <MultiSelectChips
        label="Formats"
        options={formatOptions}
        selected={value.formats || []}
        onChange={handleFormatsChange}
      />

      {totalCombos > 20 && (
        <div className="text-xs text-amber-600 flex items-center gap-1">
          <span>⚠️</span>
          <span>Large matrix – this will make {totalCombos} API calls.</span>
        </div>
      )}
    </div>
  );
}
