// get user details and update user details profile thunks

import { csrfFetch } from './csrf';
import { createAsyncThunk, createSlice, isRejectedWithValue } from '@reduxjs/toolkit';


//Thunk to fetch user profile details
export const fetchUserProfile = createAsyncThunk(
    'profile/fetchUserProfile',
    async (userId, { rejectWithValue }) => {
      try {
        const response = await csrfFetch(`/api/users/${userId}`);
        const data = await response.json();
        return data.user;
      } catch (err) {
        return rejectWithValue(err.message);
      }
    }
  );

//Thunk to update user profile details
export const updateUserProfile = createAsyncThunk(
    'profile/updateUserProfile',
    async ({ userId, profileData }, { rejectWithValue }) => {
      try {
        const response = await csrfFetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profileData)
        });
        const data = await response.json();
        return data.user;
      } catch (err) {
        return rejectWithValue(err.message);
      }
    }
  );

  const profileSlice = createSlice({
    name: 'profile',
    initialState: {
      user: null,
      status: 'idle',
      error: null
    },
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addCase(fetchUserProfile.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(fetchUserProfile.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.user = action.payload;
        })
        .addCase(fetchUserProfile.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload;
        })
        .addCase(updateUserProfile.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(updateUserProfile.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.user = action.payload;
        })
        .addCase(updateUserProfile.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload;
        });
    }
  });
  
  export default profileSlice.reducer;