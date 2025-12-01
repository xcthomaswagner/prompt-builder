import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  addDoc,
  serverTimestamp
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
    e.preventDefault();
    e.stopPropagation();
    if (!db || !user) {
      console.warn('Cannot delete: db or user not available', { db: !!db, user: !!user });
      alert('Please sign in to delete history items.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'prompt_history', itemId));
      } catch (error) {
        console.error("Error deleting document:", error);
        alert(`Failed to delete: ${error.message}`);
      }
    }
  };

  // Toggle private status
  const handleTogglePrivate = async (e, item) => {
    e.preventDefault();
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

  // Export/Backup history as JSON file
  const handleExportHistory = () => {
    if (promptHistory.length === 0) {
      alert('No history to export.');
      return;
    }

    // Prepare export data (exclude Firestore-specific fields like id)
    const exportData = promptHistory.map(item => {
      const { id, ...rest } = item;
      // Convert Firestore timestamps to ISO strings for portability
      const exportItem = { ...rest };
      if (exportItem.createdAt?.seconds) {
        exportItem.createdAt = new Date(exportItem.createdAt.seconds * 1000).toISOString();
      }
      return exportItem;
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-history-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import/Restore history from JSON file
  const handleImportHistory = async (file) => {
    if (!db || !user) {
      alert('You must be signed in to import history.');
      return { imported: 0, skipped: 0, errors: 0 };
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!Array.isArray(importData)) {
        alert('Invalid backup file format. Expected an array of history items.');
        return { imported: 0, skipped: 0, errors: 0 };
      }

      // Get existing signatures for deduplication
      const existingSignatures = new Set(
        promptHistory.map(item => item.signature).filter(Boolean)
      );

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      const collectionRef = collection(db, 'users', user.uid, 'prompt_history');

      for (const item of importData) {
        try {
          // Skip if signature already exists (duplicate)
          if (item.signature && existingSignatures.has(item.signature)) {
            skipped++;
            continue;
          }

          // Prepare item for Firestore
          const newItem = {
            originalText: item.originalText || '',
            finalPrompt: item.finalPrompt || '',
            outputType: item.outputType || 'doc',
            tone: item.tone || 'professional',
            format: item.format || 'paragraph',
            length: item.length || 'medium',
            notes: item.notes || '',
            toggles: item.toggles || {},
            typeSpecific: item.typeSpecific || {},
            isReversePrompted: item.isReversePrompted || false,
            isPrivate: item.isPrivate || false,
            signature: item.signature || '',
            version: item.version || 1,
            versions: item.versions || [],
            createdAt: serverTimestamp(), // Use server timestamp for imported items
            importedAt: serverTimestamp(),
            importedFrom: item.createdAt || null // Preserve original creation date
          };

          await addDoc(collectionRef, newItem);
          imported++;

          // Add to existing signatures to prevent duplicates within same import
          if (item.signature) {
            existingSignatures.add(item.signature);
          }
        } catch (itemError) {
          console.error('Error importing item:', itemError);
          errors++;
        }
      }

      return { imported, skipped, errors };
    } catch (error) {
      console.error('Error parsing import file:', error);
      alert('Failed to parse backup file. Please ensure it is a valid JSON file.');
      return { imported: 0, skipped: 0, errors: 0 };
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
    handleClearAllHistory,
    handleExportHistory,
    handleImportHistory
  };
}
