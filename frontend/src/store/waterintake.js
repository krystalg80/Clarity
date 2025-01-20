import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { csrfFetch } from "./csrf";

// Fetch water intake by user
export const fetchWaterIntakeByUser = createAsyncThunk(
    'waterIntake/fetchWaterIntakeByUser',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/waterintake/user/${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch water intake');
            }
            const data = await response.json();
            return data.waterIntake;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Log water intake
export const logWaterIntake = createAsyncThunk(
    'waterIntake/logWaterIntake',
    async (waterData, { rejectWithValue }) => {
        try {
            const response = await csrfFetch('/api/waterintake/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(waterData),
            });
            if (!response.ok) {
                throw new Error('Failed to log water intake');
            }
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Update water intake
export const updateWaterIntake = createAsyncThunk(
    'waterIntake/updateWaterIntake',
    async (waterData, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/waterintake/update/${waterData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(waterData),
            });
            if (!response.ok) {
                throw new Error('Failed to update water intake');
            }
            const data = await response.json();
            return data.waterIntake;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Delete water intake
export const deleteWaterIntake = createAsyncThunk(
    'waterIntake/deleteWaterIntake',
    async (id, { rejectWithValue }) => {
        try {
            const response = await csrfFetch(`/api/waterintake/delete/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete water intake');
            return id;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const waterIntakeSlice = createSlice({
    name: 'waterIntake',
    initialState: {
        records: [],
        totalOz: 0,
        status: 'idle',
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(logWaterIntake.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(logWaterIntake.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.records.push(action.payload);
                state.totalOz += action.payload.waterConsumedOz;
            })
            .addCase(logWaterIntake.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(fetchWaterIntakeByUser.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchWaterIntakeByUser.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.records = action.payload;
                state.totalOz = action.payload.reduce((total, record) => 
                    total + record.waterConsumedOz, 0);
            })
            .addCase(fetchWaterIntakeByUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(updateWaterIntake.fulfilled, (state, action) => {
                const index = state.records.findIndex(record => record.id === action.payload.id);
                if (index !== -1) {
                    state.totalOz -= state.records[index].waterConsumedOz;
                    state.records[index] = action.payload;
                    state.totalOz += action.payload.waterConsumedOz;
                }
            })
            .addCase(deleteWaterIntake.fulfilled, (state, action) => {
                const index = state.records.findIndex(record => record.id === action.payload);
                if (index !== -1) {
                    state.totalOz -= state.records[index].waterConsumedOz;
                    state.records.splice(index, 1);
                }
            });
    },
});

export default waterIntakeSlice.reducer;