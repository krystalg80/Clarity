import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {csrfFetch} from './csrf';

// Fetch meditations by user
export const fetchMeditationsByUser = createAsyncThunk(
  'meditation/fetchMeditationsByUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meditations');
      }
      const data = await response.json();
      return data.meditations;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Log a new meditation session
export const logMeditation = createAsyncThunk(
  'meditation/logMeditation',
  async (meditationData, { rejectWithValue }) => {
    try {
      const response = await csrfFetch('/api/meditations/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meditationData),
      });
      if (!response.ok) {
        throw new Error('Failed to log meditation session');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a meditation session
export const updateMeditation = createAsyncThunk(
  'meditation/updateMeditation',
  async (meditationData, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/update/${meditationData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meditationData),
      });
      if (!response.ok) {
        throw new Error('Failed to update meditation session');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a meditation session
export const deleteMeditation = createAsyncThunk(
  'meditation/deleteMeditation',
  async (id, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/delete/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete meditation session');
      }
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const meditationSlice = createSlice({
  name: 'meditation',
  initialState: {
    sessions: [],
    totalDuration: 0,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logMeditation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logMeditation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions.push(action.payload);
        state.totalDuration += action.payload.durationMinutes;
      })
      .addCase(logMeditation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMeditationsByUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeditationsByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = action.payload;
        state.totalDuration = action.payload.reduce((total, session) => total + session.durationMinutes, 0);
      })
      .addCase(fetchMeditationsByUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateMeditation.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(session => session.id === action.payload.id);
        if (index !== -1) {
          state.totalDuration -= state.sessions[index].durationMinutes;
          state.sessions[index] = action.payload;
          state.totalDuration += action.payload.durationMinutes;
        }
      })
      .addCase(deleteMeditation.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(session => session.id === action.payload);
        if (index !== -1) {
          state.totalDuration -= state.sessions[index].durationMinutes;
          state.sessions.splice(index, 1);
        }
      });
  },
});

export default meditationSlice.reducer;