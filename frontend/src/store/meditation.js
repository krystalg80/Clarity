import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { csrfFetch } from './csrf'; // Assuming csrfFetch is defined in csrf.js

// Thunk action for logging a meditation session
export const logMeditation = createAsyncThunk(
  'meditation/logMeditation',
  async ({ userId, date, durationMinutes }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/new`, {
        method: 'POST',
        body: JSON.stringify({ userId, date, durationMinutes }),
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

// Thunk action for fetching meditation session details by ID
export const fetchMeditationById = createAsyncThunk(
  'meditation/fetchMeditationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meditation session details');
      }
      const data = await response.json();
      return data.meditation;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk action for fetching all meditations for a user
export const fetchMeditationsByUser = createAsyncThunk(
  'meditation/fetchMeditationsByUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meditations for user');
      }
      const data = await response.json();
      return data.meditations;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk action for updating a meditation session
export const updateMeditation = createAsyncThunk(
  'meditation/updateMeditation',
  async ({ id, date, durationMinutes }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/update/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ date, durationMinutes }),
      });
      if (!response.ok) {
        throw new Error('Failed to update meditation session');
      }
      const data = await response.json();
      return data.meditation;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Thunk action for deleting a meditation session
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

// Thunk action for getting total meditation duration for a user on a specific date
export const fetchTotalMeditationDuration = createAsyncThunk(
  'meditation/fetchTotalMeditationDuration',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/user/${userId}/date/${date}/summary`);
      if (!response.ok) {
        throw new Error('Failed to fetch total meditation duration');
      }
      const data = await response.json();
      return data.totalMeditationMinutes;
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
      })
      .addCase(logMeditation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMeditationById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeditationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = state.sessions.map((session) =>
          session.id === action.payload.id ? action.payload : session
        );
      })
      .addCase(fetchMeditationById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMeditationsByUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeditationsByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = action.payload;
      })
      .addCase(fetchMeditationsByUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateMeditation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateMeditation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = state.sessions.map((session) =>
          session.id === action.payload.id ? action.payload : session
        );
      })
      .addCase(updateMeditation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteMeditation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteMeditation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = state.sessions.filter((session) => session.id !== action.payload);
      })
      .addCase(deleteMeditation.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchTotalMeditationDuration.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTotalMeditationDuration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.totalDuration = action.payload;
      })
      .addCase(fetchTotalMeditationDuration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default meditationSlice.reducer;