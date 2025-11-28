/**
 * Type-Specific Form Router
 * 
 * Routes to the appropriate form based on output type.
 */

import DeckForm from './DeckForm.jsx';
import CodeForm from './CodeForm.jsx';
import DocForm from './DocForm.jsx';
import DataForm from './DataForm.jsx';
import CopyForm from './CopyForm.jsx';
import CommsForm from './CommsForm.jsx';

const forms = {
  deck: DeckForm,
  code: CodeForm,
  doc: DocForm,
  data: DataForm,
  copy: CopyForm,
  comms: CommsForm,
};

/**
 * Renders the appropriate type-specific form based on output type
 * @param {Object} props
 * @param {string} props.outputType - The output type (deck, code, doc, etc.)
 * @param {Object} props.spec - The current prompt spec
 * @param {Function} props.onChange - Callback when spec changes: (field, value) => void
 * @param {boolean} props.darkMode - Dark mode enabled
 */
export default function TypeSpecificForm({ outputType, spec, onChange, darkMode = false }) {
  const FormComponent = forms[outputType];
  
  if (!FormComponent) {
    return null;
  }
  
  // Forms handle their own styling (accordion wrapper)
  return <FormComponent spec={spec} onChange={onChange} darkMode={darkMode} />;
}

/**
 * Check if a type-specific form exists for the given output type
 * @param {string} outputType
 * @returns {boolean}
 */
export function hasTypeSpecificForm(outputType) {
  return outputType in forms;
}

/**
 * Get list of output types with forms
 * @returns {string[]}
 */
export function getFormOutputTypes() {
  return Object.keys(forms);
}
