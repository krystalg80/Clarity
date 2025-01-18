import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { csrfFetch } from "./csrf";

// Fetch workouts by user
export const fetchWorkoutsByUser = createAsyncThunk(
    'workout/fetchWorkoutsByUser',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/workouts/user/${userId}`);
            if (!response.ok){
                throw new Error('Failed to fetch workouts');
            }
            const data = await response.json();
            return data.workouts;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Log a new workout session 
export const logWorkout = createAsyncThunk(
    'workout/logWorkout',
    async (workoutData, { rejectWithValue }) => {
        try {
            const response = await csrfFetch('/api/workouts/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutData),
            });
            if (!response.ok){
                throw new Error('Failed to log workout session');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

//Update a workout session
export const updateWorkout = createAsyncThunk(
    'workout/updateWorkout',
    async (workoutData, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/workouts/update/${workoutData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutData),
            });
            if (!response.ok){
                throw new Error('Failed to update workout session');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

//Delete a workout session
export const deleteWorkout = createAsyncThunk(
    'workout/deleteWorkout',
    async (id, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/workouts/delete/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete workout');
            return id;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState: {
    sessions: [],
    totalDuration: 0,
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logWorkout.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logWorkout.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions.push(action.payload);
        state.totalDuration += action.payload.durationMinutes;
      })
      .addCase(logWorkout.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchWorkoutsByUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorkoutsByUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.sessions = action.payload;
        state.totalDuration = action.payload.reduce((total, session) => total + session.durationMinutes, 0);
      })
      .addCase(fetchWorkoutsByUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateWorkout.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(session => session.id === action.payload.id);
        if (index !== -1) {
          state.totalDuration -= state.sessions[index].durationMinutes;
          state.sessions[index] = action.payload;
          state.totalDuration += action.payload.durationMinutes;
        }
      })
      .addCase(deleteWorkout.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(session => session.id === action.payload);
        if (index !== -1) {
          state.totalDuration -= state.sessions[index].durationMinutes;
          state.sessions.splice(index, 1);
        }
      });
  },
});

export default workoutSlice.reducer;