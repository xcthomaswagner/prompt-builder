import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Storage service for baseline file uploads.
 * Supports PDF, images, and other file types for multimodal judging.
 */

/**
 * Content type definitions for baselines
 */
export const CONTENT_TYPES = {
  text: { label: 'Text', accept: null, isFile: false },
  markdown: { label: 'Markdown', accept: '.md', isFile: false },
  csv: { label: 'CSV Data', accept: '.csv', isFile: false },
  html: { label: 'HTML', accept: '.html', isFile: false },
  pdf: { label: 'PDF Document', accept: '.pdf', isFile: true },
  image: { label: 'Image', accept: 'image/*', isFile: true }
};

/**
 * Get recommended content types for each output type
 */
export const OUTPUT_TYPE_CONTENT_TYPES = {
  doc: ['text', 'markdown', 'pdf'],
  deck: ['pdf', 'image'],
  code: ['text', 'markdown', 'pdf'],
  copy: ['text', 'markdown'],
  comms: ['text', 'markdown'],
  data: ['csv', 'html', 'text']
};

/**
 * Upload a file to Firebase Storage for baseline examples.
 * 
 * @param {Object} app - Firebase app instance
 * @param {string} userId - User ID
 * @param {string} outputType - Output type (doc, deck, etc.)
 * @param {File} file - File to upload
 * @returns {Promise<{ url: string, path: string, fileName: string, contentType: string }>}
 */
export async function uploadBaselineFile(app, userId, outputType, file) {
  const storage = getStorage(app);
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `baselines/${userId}/${outputType}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  // Determine content type
  let contentType = 'text';
  if (file.type === 'application/pdf') {
    contentType = 'pdf';
  } else if (file.type.startsWith('image/')) {
    contentType = 'image';
  } else if (file.name.endsWith('.csv')) {
    contentType = 'csv';
  } else if (file.name.endsWith('.html')) {
    contentType = 'html';
  } else if (file.name.endsWith('.md')) {
    contentType = 'markdown';
  }

  // Upload file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  // Get download URL
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    path,
    fileName: file.name,
    contentType,
    fileSize: file.size,
    mimeType: file.type
  };
}

/**
 * Delete a file from Firebase Storage.
 * 
 * @param {Object} app - Firebase app instance
 * @param {string} path - Storage path to delete
 */
export async function deleteBaselineFile(app, path) {
  if (!path) return;
  const storage = getStorage(app);
  const storageRef = ref(storage, path);
  try {
    await deleteObject(storageRef);
  } catch (err) {
    // File may not exist, ignore
    console.warn('Failed to delete file:', err.message);
  }
}

/**
 * Read file content as text (for text-based files).
 * 
 * @param {File} file - File to read
 * @returns {Promise<string>} - File content as text
 */
export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Read file content as base64 (for binary files).
 * 
 * @param {File} file - File to read
 * @returns {Promise<string>} - Base64 encoded content
 */
export async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if a content type requires vision capabilities.
 * 
 * @param {string} contentType - Content type
 * @returns {boolean}
 */
export function requiresVision(contentType) {
  return contentType === 'pdf' || contentType === 'image';
}

/**
 * Check if a model supports vision.
 * Uses prefix matching to handle versioned model IDs.
 * 
 * @param {string} modelId - Model ID
 * @returns {boolean}
 */
export function modelSupportsVision(modelId) {
  // Vision-capable model prefixes
  const visionPrefixes = [
    'gemini-2',      // All Gemini 2.x models
    'gemini-1.5',    // All Gemini 1.5 models
    'gpt-5',         // All GPT-5 models
    'gpt-4o',        // GPT-4o and GPT-4o-mini
    'gpt-4-turbo',   // GPT-4 Turbo
    'claude-3',      // All Claude 3.x models (opus, sonnet, haiku)
    'o1',            // OpenAI o1 models
    'o3',            // OpenAI o3 models
    'o4'             // OpenAI o4 models
  ];
  return visionPrefixes.some(prefix => modelId.startsWith(prefix));
}

export default {
  CONTENT_TYPES,
  OUTPUT_TYPE_CONTENT_TYPES,
  uploadBaselineFile,
  deleteBaselineFile,
  readFileAsText,
  readFileAsBase64,
  requiresVision,
  modelSupportsVision
};
