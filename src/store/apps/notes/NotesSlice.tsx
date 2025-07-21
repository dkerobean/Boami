import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from '../../store';
import type { PayloadAction } from '@reduxjs/toolkit';

const API_URL = '/api/productivity/notes';

interface StateType {
  notes: any[];
  notesContent: number;
  noteSearch: string;
  loading: boolean;
  error: string | null;
}

const initialState = {
  notes: [],
  notesContent: 0,
  noteSearch: '',
  loading: false,
  error: null,
};

export const NotesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    getNotes: (state, action) => {
      state.notes = action.payload;
      state.loading = false;
      state.error = null;
    },
    SearchNotes: (state, action) => {
      state.noteSearch = action.payload;
    },
    SelectNote: (state, action) => {
      state.notesContent = action.payload;
    },
    addNoteSuccess: (state, action) => {
      state.notes.unshift(action.payload); // Add to beginning
      state.loading = false;
      state.error = null;
    },
    updateNoteSuccess: (state, action) => {
      const index = state.notes.findIndex((note) => note._id === action.payload._id);
      if (index !== -1) {
        state.notes[index] = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    deleteNoteSuccess: (state, action) => {
      state.notes = state.notes.filter((note) => note._id !== action.payload);
      state.loading = false;
      state.error = null;
      // Adjust selected note if needed
      if (state.notesContent >= state.notes.length && state.notes.length > 0) {
        state.notesContent = state.notes.length - 1;
      } else if (state.notes.length === 0) {
        state.notesContent = 0;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  SearchNotes,
  getNotes,
  SelectNote,
  addNoteSuccess,
  updateNoteSuccess,
  deleteNoteSuccess
} = NotesSlice.actions;

// Async thunks for API calls
export const fetchNotes = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${API_URL}`);

    if (response.data.success) {
      dispatch(getNotes(response.data.data.notes));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to fetch notes'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to fetch notes'));
  }
};

export const addNote = (title: string, color: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.post(`${API_URL}`, {
      title,
      content: title, // Use title as content for now
      color
    });

    if (response.data.success) {
      dispatch(addNoteSuccess(response.data.data.note));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to create note'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to create note'));
  }
};

export const updateNote = (id: string, field: string, value: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const updateData: any = {};

    if (field === 'title') {
      updateData.title = value;
      updateData.content = value; // Keep content in sync with title
    } else {
      updateData[field] = value;
    }

    const response = await axios.put(`${API_URL}/${id}`, updateData);

    if (response.data.success) {
      dispatch(updateNoteSuccess(response.data.data.note));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to update note'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to update note'));
  }
};

export const deleteNote = (id: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.delete(`${API_URL}/${id}`);

    if (response.data.success) {
      dispatch(deleteNoteSuccess(id));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to delete note'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to delete note'));
  }
};

// Legacy exports for backward compatibility
export const DeleteNote = deleteNote;
export const UpdateNote = updateNote;

export default NotesSlice.reducer;