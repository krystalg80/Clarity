import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const notesService = {
  async createNote(userId: string, noteData: any) {
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/notes`), {
        text: noteData.text,
        title: noteData.title || '',
        mood: noteData.mood || '',
        tags: noteData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id: docRef.id, success: true, note: { ...noteData, id: docRef.id } };
    } catch (error: any) {
      throw new Error('Error creating note: ' + error.message);
    }
  },

  async fetchNotesByUser(userId: string) {
    try {
      const q = query(collection(db, `users/${userId}/notes`), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const notes = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      }));
      return { notes };
    } catch (error: any) {
      throw new Error('Error fetching notes: ' + error.message);
    }
  },

  async updateNote(userId: string, noteId: string, updates: any) {
    try {
      const docRef = doc(db, `users/${userId}/notes`, noteId);
      await updateDoc(docRef, { ...updates, updatedAt: new Date() });
      return { success: true, note: { id: noteId, ...updates } };
    } catch (error: any) {
      throw new Error('Error updating note: ' + error.message);
    }
  },

  async deleteNote(userId: string, noteId: string) {
    try {
      await deleteDoc(doc(db, `users/${userId}/notes`, noteId));
      return { success: true };
    } catch (error: any) {
      throw new Error('Error deleting note: ' + error.message);
    }
  },
};

export default notesService;
