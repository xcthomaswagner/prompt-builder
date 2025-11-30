import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

/**
 * usePromptHistory - Custom hook for managing prompt history.
 * 
 * Handles Firestore subscription, CRUD operations, and filtering
 * for the prompt history sidebar.
 * 
 * @param {Object} db - Firestore database instance
 * @param {Object} user - Current authenticated user
 * @returns {Object} History state and handlers
 */
export default function usePromptHistory(db, user) {
  const [promptHistory, setPromptHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Subscribe to history updates
  useEffect(() => {
    if (!user || !db) {
      setIsHistoryLoading(false);
      return;
    }
    setIsHistoryLoading(true);

    // Query without orderBy to avoid index issues - sort client-side
    const q = query(
      collection(db, 'users', user.uid, 'prompt_history')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sort (Newest first)
      items.sort((a, b) => {
        const getMillis = (item) => {
          if (!item.createdAt) return Date.now(); // Pending write = now
          if (item.createdAt.toMillis) return item.createdAt.toMillis();
          if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
          return new Date(item.createdAt).getTime();
        };
        return getMillis(b) - getMillis(a);
      });

      setPromptHistory(items);
      setIsHistoryLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setIsHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  // Filtered history based on search query
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return promptHistory;
    
    const query = historySearchQuery.toLowerCase();
    return promptHistory.filter(item => 
      item.inputText?.toLowerCase().includes(query) ||
      item.outputType?.toLowerCase().includes(query) ||
      item.tone?.toLowerCase().includes(query)
    );
  }, [promptHistory, historySearchQuery]);

  // Delete a history item
  const handleDeleteHistory = async (e, itemId) => {
    e.stopPropagation();
    if (!db || !user) return;
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'prompt_history', itemId));
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };

  // Toggle private status
  const handleTogglePrivate = async (e, item) => {
    e.stopPropagation();
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'prompt_history', item.id), {
        isPrivate: !item.isPrivate
      });
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  // Clear all history (with confirmation)
  const handleClearAllHistory = async () => {
    if (!db || !user) return;
    if (!window.confirm('Are you sure you want to delete ALL history? This cannot be undone.')) {
      return;
    }
    
    try {
      const deletePromises = promptHistory.map(item => 
        deleteDoc(doc(db, 'users', user.uid, 'prompt_history', item.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  return {
    promptHistory,
    filteredHistory,
    isHistoryLoading,
    historySearchQuery,
    setHistorySearchQuery,
    handleDeleteHistory,
    handleTogglePrivate,
    handleClearAllHistory
  };
}
