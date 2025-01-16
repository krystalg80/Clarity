import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { csrfFetch } from './csrf';

// Thunk to fetch workout summary
export const fetchWorkoutSummary = createAsyncThunk(
  'summary/fetchWorkoutSummary',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/workouts/user/${userId}/date/${date}/summary`);
      const data = await response.json();
      return data.totalWorkoutMinutes;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Thunk to fetch meditation summary
export const fetchMeditationSummary = createAsyncThunk(
  'summary/fetchMeditationSummary',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/meditations/user/${userId}/date/${date}/summary`);
      const data = await response.json();
      return data.totalMeditationMinutes;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Thunk to fetch water intake summary
export const fetchWaterIntakeSummary = createAsyncThunk(
  'summary/fetchWaterIntakeSummary',
  async ({ userId, date }, { rejectWithValue }) => {
    try {
      const response = await csrfFetch(`/api/waterintake/user/${userId}/date/${date}/summary`);
      const data = await response.json();
      return data.totalOunces;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const summarySlice = createSlice({
  name: 'summary',
  initialState: {
    workout: 0,
    meditation: 0,
    waterIntake: 0,
    exerciseGoalMinutes: 0,
    meditationGoalMinutes: 0,
    waterGoalOz: 0,
    status: 'idle',
    error: null
  },
  reducers: {
    setUserGoals: (state, action) => {
      state.exerciseGoalMinutes = action.payload.exerciseGoalMinutes;
      state.meditationGoalMinutes = action.payload.meditationGoalMinutes;
      state.waterGoalOz = action.payload.waterGoalOz;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkoutSummary.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorkoutSummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.workout = action.payload;
      })
      .addCase(fetchWorkoutSummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMeditationSummary.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeditationSummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.meditation = action.payload;
      })
      .addCase(fetchMeditationSummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchWaterIntakeSummary.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWaterIntakeSummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.waterIntake = action.payload;
      })
      .addCase(fetchWaterIntakeSummary.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setUserGoals } = summarySlice.actions;

export default summarySlice.reducer;