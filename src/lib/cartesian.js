/**
 * Computes the cartesian product of multiple arrays.
 * @param {Array<Array>} arrays - An array of arrays to combine.
 * @returns {Array<Array>} - All combinations as arrays of elements.
 *
 * @example
 * cartesianProduct([['a', 'b'], [1, 2]])
 * // => [['a', 1], ['a', 2], ['b', 1], ['b', 2]]
 */
export function cartesianProduct(arrays) {
  if (!arrays || arrays.length === 0) return [];
  if (arrays.some(arr => !Array.isArray(arr) || arr.length === 0)) return [];

  return arrays.reduce(
    (acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])),
    [[]]
  );
}

/**
 * Builds all matrix combinations from a matrixConfig object.
 * @param {{ tones: string[], lengths: string[], formats: string[] }} config
 * @returns {Array<{ tone: string, length: string, format: string }>}
 */
export function buildMatrixCombos(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Config object is required');
  }
  
  const { tones = [], lengths = [], formats = [] } = config;
  
  // Validate that all arrays are actually arrays
  if (!Array.isArray(tones) || !Array.isArray(lengths) || !Array.isArray(formats)) {
    throw new Error('All config properties (tones, lengths, formats) must be arrays');
  }
  
  if (!tones.length || !lengths.length || !formats.length) return [];

  const combos = cartesianProduct([tones, lengths, formats]);
  return combos.map(([tone, length, format]) => ({ tone, length, format }));
}

export default cartesianProduct;
