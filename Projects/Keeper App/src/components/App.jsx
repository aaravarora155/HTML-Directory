import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import Note from "./Note";
import CreateArea from "./CreateArea";
import initialNotes from "../notes"; // Renamed to avoid confusion

function App() {
  // 1. Initialize state with your imported notes
  const [notes, setNotes] = useState(initialNotes);

  function addNote(newNote) {
    setNotes((prevNotes) => {
      // Use the spread operator to add the new note to the existing array
      return [...prevNotes, newNote];
    });
  }

  function deleteNote(id) {
    setNotes((prevNotes) => {
      return prevNotes.filter((noteItem, index) => {
        return index !== id;
      });
    });
  }

  return (
    <div>
      <Header />
      {/* 3. Pass the function as a prop to the child */}
      <CreateArea onAdd={addNote} />
      
      {/* 4. Map over the 'notes' state, not the imported file */}
      {notes.map((noteItem, index) => {
        return (
          <Note
            key={index}
            id={index}
            title={noteItem.title}
            content={noteItem.content}
            onDelete={deleteNote}
          />
        );
      })}
      <Footer />
    </div>
  );
}

export default App;