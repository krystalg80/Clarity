import { useState, useEffect } from 'react';
import './Notes.css';

//so lets make a new feature for greenlit BUT i dont want to do any migrations or seeders
//so lets do a localstorage feature! easier i hope lets see....
const NotesPage = () => {
  const [currentNote, setCurrentNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState([]);

  // use a use effect to load notes from local storage
  useEffect(() => {
    setNotes(JSON.parse(localStorage.getItem('notes')) || []);
  }, []);

  // a save note function that will save the note to local storage
  function saveNote() {
    if (!noteText.trim()) return; // don't save empty notes
    //noteText is the text that the user has typed in the text area
    //if empty do not save
    try {
      if (currentNote) { //if we are editing a note
        updateNote(currentNote, noteText); //update the note/text!
      } else {
        createNote(noteText); //if we arent editing a current note then lets create one
      }
      //reset form after save
      setNoteText(''); //clear the text area
      setCurrentNote(null); //clear the current note
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }

  function createNote(text) { //create a new note
    const newNote = { //create a new note object
      id: Date.now(), 
      text,
      createdAt: new Date().toISOString() 
    };
    const updatedNotes = [...notes, newNote]; //add the new note to the notes array
    localStorage.setItem('notes', JSON.stringify(updatedNotes)); //save the notes to local storage
    setNotes(updatedNotes); //update the notes state
  }

  function updateNote(note, newText) { //update a note
    const updatedNotes = notes.map((n) => //map over the notes
      n.id === note.id ? { ...n, text: newText, updatedAt: new Date().toISOString() } : n //if the note id matches the current note id then update the text and updated at time
    );
    localStorage.setItem('notes', JSON.stringify(updatedNotes)); //add back to local storage
    setNotes(updatedNotes); // update the notes state
  }

  function deleteNote(note) { //delete a note
    const updatedNotes = notes.filter((n) => n.id !== note.id); //filter out the note that we want to delete
    localStorage.setItem('notes', JSON.stringify(updatedNotes)); //save the updated notes to local storage
    setNotes(updatedNotes); //update the notes state
    if (currentNote?.id === note.id) { //if the note we are deleting is the current note then clear the text area
      setCurrentNote(null); //clear the current note
      setNoteText(''); //clear the text area
    }
  }

  return (
  <div className="notes-page">
    <div className="notes-card">
        <h1 className="notes-title">Your Personal Notes Diary!</h1>
        <p className="notes-subtitle">Write down your thoughts, ideas, and reminders here.</p>
      <div className="text-form">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write your note here..."
          className="notes-textarea"
        />
        <div className="notes-buttons">
          <button onClick={saveNote} className="save-button">
            {currentNote ? 'Update Note' : 'Save Note'}
          </button>
          {currentNote && (
            <button onClick={() => deleteNote(currentNote)} className="delete-button">
              Delete Note
            </button>
          )}
        </div>
      </div>
      <div className="notes-list">
        {notes.map((note) => (
          <div key={note.id} className="note-item">
            <p>{note.text}</p>
            <div className="note-actions">
              <button onClick={() => {
                setCurrentNote(note);
                setNoteText(note.text);
              }}>Edit</button>
              <button onClick={() => deleteNote(note)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

export default NotesPage;