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
  getDoc,
  setDoc,
  getDocs
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
  
  return onSnapshot(
    experimentsQuery,
    (snapshot) => {
      const experiments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(experiments);
    },
    (error) => {
      console.error('Error subscribing to experiments:', error);
      callback([]);
    }
  );
}

/**
 * Delete an experiment and its results.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} experimentId - Experiment ID
 */
export async function deleteExperiment(db, userId, experimentId) {
  // Delete all results in the subcollection first
  const resultsRef = collection(db, 'users', userId, 'experiments', experimentId, 'results');
  const resultsSnapshot = await getDocs(resultsRef);
  
  // Delete each result document
  const deletePromises = resultsSnapshot.docs.map(resultDoc => 
    deleteDoc(resultDoc.ref)
  );
  await Promise.all(deletePromises);
  
  // Then delete the parent experiment
  const experimentRef = doc(db, 'users', userId, 'experiments', experimentId);
  await deleteDoc(experimentRef);
}

/**
 * Get baseline examples for all output types.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Baselines object { [outputType]: [{ score, label, content }] }
 */
export async function getBaselines(db, userId) {
  const baselinesRef = doc(db, 'users', userId, 'experiment_settings', 'baselines');
  const snapshot = await getDoc(baselinesRef);
  if (snapshot.exists()) {
    return snapshot.data().baselines || {};
  }
  return {};
}

/**
 * Save baseline examples for all output types.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Object} baselines - Baselines object { [outputType]: [{ score, label, content }] }
 */
export async function saveBaselines(db, userId, baselines) {
  const baselinesRef = doc(db, 'users', userId, 'experiment_settings', 'baselines');
  await setDoc(baselinesRef, {
    baselines,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Subscribe to baseline changes.
 * 
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {Function} callback - Called with baselines object on change
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToBaselines(db, userId, callback) {
  const baselinesRef = doc(db, 'users', userId, 'experiment_settings', 'baselines');
  return onSnapshot(
    baselinesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data().baselines || {});
      } else {
        callback({});
      }
    },
    (error) => {
      console.error('Error subscribing to baselines:', error);
      callback({});
    }
  );
}

export default {
  createExperiment,
  updateExperiment,
  saveExperimentResult,
  completeExperiment,
  getExperimentWithResults,
  subscribeToExperiments,
  deleteExperiment,
  getBaselines,
  saveBaselines,
  subscribeToBaselines
};
