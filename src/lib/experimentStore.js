import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

/**
 * Firestore service for experiment persistence.
 * 
 * Collections:
 * - users/{uid}/experiments - Experiment metadata
 * - users/{uid}/experiments/{experimentId}/results - Individual cell results
 */

/**
 * Create a new experiment document.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Object} experimentData - Experiment metadata
 * @returns {Promise<string>} - Created experiment ID
 */
export async function createExperiment(db, userId, experimentData) {
  const experimentsRef = collection(db, 'users', userId, 'experiments');
  
  const docRef = await addDoc(experimentsRef, {
    ...experimentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'running',
    completedCells: 0,
    totalCells: experimentData.totalCells || 0
  });
  
  return docRef.id;
}

/**
 * Update experiment status and progress.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Experiment ID
 * @param {Object} updates - Fields to update
 */
export async function updateExperiment(db, userId, experimentId, updates) {
  const experimentRef = doc(db, 'users', userId, 'experiments', experimentId);
  
  await updateDoc(experimentRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Save a single experiment result (cell).
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Parent experiment ID
 * @param {Object} result - Result data { config, blueprintResult, error? }
 * @returns {Promise<string>} - Created result ID
 */
export async function saveExperimentResult(db, userId, experimentId, result) {
  const resultsRef = collection(db, 'users', userId, 'experiments', experimentId, 'results');
  
  const docRef = await addDoc(resultsRef, {
    ...result,
    createdAt: serverTimestamp()
  });
  
  return docRef.id;
}

/**
 * Mark experiment as complete.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Experiment ID
 * @param {number} successCount - Number of successful cells
 * @param {number} errorCount - Number of failed cells
 */
export async function completeExperiment(db, userId, experimentId, successCount, errorCount) {
  await updateExperiment(db, userId, experimentId, {
    status: 'complete',
    completedCells: successCount + errorCount,
    successCount,
    errorCount,
    completedAt: serverTimestamp()
  });
}

/**
 * Get a single experiment with its results.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Experiment ID
 * @returns {Promise<Object|null>} - Experiment with results
 */
export async function getExperimentWithResults(db, userId, experimentId) {
  const experimentRef = doc(db, 'users', userId, 'experiments', experimentId);
  const experimentSnap = await getDoc(experimentRef);
  
  if (!experimentSnap.exists()) {
    return null;
  }
  
  const experiment = { id: experimentSnap.id, ...experimentSnap.data() };
  
  // Fetch results subcollection
  const resultsRef = collection(db, 'users', userId, 'experiments', experimentId, 'results');
  const resultsQuery = query(resultsRef, orderBy('createdAt', 'asc'));
  
  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(resultsQuery, (snapshot) => {
      unsubscribe();
      experiment.results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      resolve(experiment);
    });
  });
}

/**
 * Subscribe to experiments list for a user.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Function} callback - Called with experiments array
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToExperiments(db, userId, callback) {
  const experimentsRef = collection(db, 'users', userId, 'experiments');
  const experimentsQuery = query(experimentsRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(experimentsQuery, (snapshot) => {
    const experiments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(experiments);
  });
}

/**
 * Delete an experiment and its results.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Experiment ID
 */
export async function deleteExperiment(db, userId, experimentId) {
  // Note: In production, you'd want to delete subcollection docs first
  // or use a Cloud Function. For now, we just delete the parent.
  const experimentRef = doc(db, 'users', userId, 'experiments', experimentId);
  await deleteDoc(experimentRef);
}

export default {
  createExperiment,
  updateExperiment,
  saveExperimentResult,
  completeExperiment,
  getExperimentWithResults,
  subscribeToExperiments,
  deleteExperiment
};
