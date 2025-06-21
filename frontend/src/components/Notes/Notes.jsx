import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { notesService } from '../../services/notesService';
import './Notes.css';

const NotesPage = () => {
  const { user: firebaseUser } = useAuth();
  const [currentNote, setCurrentNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteMood, setNoteMood] = useState('');
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notes on component mount
  useEffect(() => {
    const fetchNotes = async () => {
      if (!firebaseUser?.uid) {
        // Fallback to localStorage for non-authenticated users
        setNotes(JSON.parse(localStorage.getItem('notes')) || []);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await notesService.fetchNotesByUser(firebaseUser.uid);
        setNotes(response.notes || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load notes');
        // Fallback to localStorage
        setNotes(JSON.parse(localStorage.getItem('notes')) || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [firebaseUser]);

  // Save note function - Firebase or localStorage
  const saveNote = async () => {
    if (!noteText.trim()) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      if (firebaseUser?.uid) {
        // Save to Firebase
        if (currentNote) {
          await notesService.updateNote(firebaseUser.uid, currentNote.id, {
            text: noteText,
            title: noteTitle,
            mood: noteMood
          });
          
          // Update local state
          setNotes(prev => prev.map(note => 
            note.id === currentNote.id 
              ? { ...note, text: noteText, title: noteTitle, mood: noteMood, updatedAt: new Date() }
              : note
          ));
        } else {
          const response = await notesService.createNote(firebaseUser.uid, {
            text: noteText,
            title: noteTitle,
            mood: noteMood
          });
          
          // Add to local state
          setNotes(prev => [response.note, ...prev]);
        }
      } else {
        // Fallback to localStorage
        if (currentNote) {
          updateNoteLocalStorage(currentNote, noteText);
        } else {
          createNoteLocalStorage(noteText);
        }
      }
      
      // Reset form
      setNoteText('');
      setNoteTitle('');
      setNoteMood('');
      setCurrentNote(null);
      
    } catch (error) {
      console.error('Error saving note:', error);
      setError('Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Local storage functions (fallback)
  const createNoteLocalStorage = (text) => {
    const newNote = {
      id: Date.now(),
      text,
      title: noteTitle,
      mood: noteMood,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...notes, newNote];
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const updateNoteLocalStorage = (note, newText) => {
    const updatedNotes = notes.map((n) =>
      n.id === note.id 
        ? { ...n, text: newText, title: noteTitle, mood: noteMood, updatedAt: new Date().toISOString() } 
        : n
    );
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  // Delete note function
  const deleteNote = async (note) => {
    if (!window.confirm('Are you sure you want to delete this diary entry?')) return;
    
    try {
      if (firebaseUser?.uid) {
        await notesService.deleteNote(firebaseUser.uid, note.id);
      } else {
        // Local storage fallback
        const updatedNotes = notes.filter((n) => n.id !== note.id);
        localStorage.setItem('notes', JSON.stringify(updatedNotes));
      }
      
      setNotes(prev => prev.filter(n => n.id !== note.id));
      
      if (currentNote?.id === note.id) {
        setCurrentNote(null);
        setNoteText('');
        setNoteTitle('');
        setNoteMood('');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  // Edit note function
  const editNote = (note) => {
    setCurrentNote(note);
    setNoteText(note.text);
    setNoteTitle(note.title || '');
    setNoteMood(note.mood || '');
  };

  // Filter notes by search term
  const filteredNotes = notes.filter(note => 
    note.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="notes-loading">Loading your diary...</div>;
  }

  return (
    <div className="notes-page">
      <div className="notes-card">
        <div className="notes-header">
          <h1 className="notes-title">📝 Personal Diary</h1>
          <p className="notes-subtitle">
            {firebaseUser 
              ? "Your thoughts sync across all devices" 
              : "Your thoughts are saved locally"
            }
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search your diary entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Note Form */}
        <div className="note-form">
          <input
            type="text"
            placeholder="Entry title (optional)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="note-title-input"
          />
          
          <div className="mood-selector">
            <label>How are you feeling today?</label>
            <select 
              value={noteMood} 
              onChange={(e) => setNoteMood(e.target.value)}
              className="mood-select"
            >
              <option value="">Select mood...</option>
              <option value="😊">😊 Happy</option>
              <option value="😔">😔 Sad</option>
              <option value="😴">😴 Tired</option>
              <option value="😤">😤 Frustrated</option>
              <option value="😌">😌 Peaceful</option>
              <option value="🤔">🤔 Thoughtful</option>
              <option value="🎉">🎉 Excited</option>
              <option value="😰">😰 Anxious</option>
            </select>
          </div>
          
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="What's on your mind today? Write about your wellness journey, thoughts, or anything else..."
            className="notes-textarea"
            rows="6"
          />
          
          <div className="notes-buttons">
            <button 
              onClick={saveNote} 
              className="save-button"
              disabled={isSubmitting || !noteText.trim()}
            >
              {isSubmitting 
                ? 'Saving...' 
                : (currentNote ? 'Update Entry' : 'Save Entry')
              }
            </button>
            
            {currentNote && (
              <button 
                onClick={() => {
                  setCurrentNote(null);
                  setNoteText('');
                  setNoteTitle('');
                  setNoteMood('');
                }} 
                className="cancel-button"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="notes-list">
          <h2 className="list-title">
            Your Diary Entries ({filteredNotes.length})
          </h2>
          
          {filteredNotes.length === 0 ? (
            <p className="no-notes">
              {searchTerm 
                ? 'No entries match your search.' 
                : 'Start writing your first diary entry!'
              }
            </p>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-header">
                  {note.title && <h3 className="note-title-display">{note.title}</h3>}
                  <div className="note-meta">
                    {note.mood && <span className="note-mood">{note.mood}</span>}
                    <span className="note-date">
                      {note.createdAt 
                        ? new Date(note.createdAt).toLocaleDateString()
                        : new Date(note.createdAt).toLocaleDateString()
                      }
                    </span>
                  </div>
                </div>
                
                <p className="note-text">{note.text}</p>
                
                <div className="note-actions">
                  <button onClick={() => editNote(note)} className="edit-button">
                    Edit
                  </button>
                  <button onClick={() => deleteNote(note)} className="delete-button">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;