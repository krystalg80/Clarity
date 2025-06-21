import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const notesService = {
  // Create new note/diary entry
  async createNote(userId, noteData) {
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/notes`), {
        text: noteData.text,
        title: noteData.title || '',
        mood: noteData.mood || '', // New: track mood with diary entry
        tags: noteData.tags || [], // New: add tags for organization
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return { 
        id: docRef.id, 
        success: true,
        note: { ...noteData, id: docRef.id }
      };
    } catch (error) {
      throw new Error('Error creating note: ' + error.message);
    }
  },

  // Fetch all user notes
  async fetchNotesByUser(userId) {
    try {
      const q = query(
        collection(db, `users/${userId}/notes`),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notes = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
      
      return { notes };
    } catch (error) {
      throw new Error('Error fetching notes: ' + error.message);
    }
  },

  // Update existing note
  async updateNote(userId, noteId, updates) {
    try {
      const docRef = doc(db, `users/${userId}/notes`, noteId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return { 
        success: true,
        note: { id: noteId, ...updates }
      };
    } catch (error) {
      throw new Error('Error updating note: ' + error.message);
    }
  },

  // Delete note
  async deleteNote(userId, noteId) {
    try {
      await deleteDoc(doc(db, `users/${userId}/notes`, noteId));
      return { 
        success: true,
        message: 'Note deleted successfully' 
      };
    } catch (error) {
      throw new Error('Error deleting note: ' + error.message);
    }
  },

  // Search notes by text
  async searchNotes(userId, searchTerm) {
    try {
      const response = await this.fetchNotesByUser(userId);
      const filteredNotes = response.notes.filter(note => 
        note.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return { notes: filteredNotes };
    } catch (error) {
      throw new Error('Error searching notes: ' + error.message);
    }
  }
};

export default notesService;