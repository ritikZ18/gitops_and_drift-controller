import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAppDetail, fetchDrift } from '../api/appsApi';

export const loadAppDetail = createAsyncThunk('appDetail/loadDetail', async (id) => {
    return await fetchAppDetail(id);
});

export const loadDrift = createAsyncThunk('appDetail/loadDrift', async ({ id, env }) => {
    return await fetchDrift(id, env);
});

const appDetailSlice = createSlice({
    name: 'appDetail',
    initialState: {
        app: null,
        releases: [],
        audit: [],
        events: [],
        drift: null,
        activeTab: 'events', // events | drift | history | audit
        loading: false,
        driftLoading: false,
        error: null,
    },
    reducers: {
        setActiveTab: (state, action) => { state.activeTab = action.payload; },
        clearDetail: (state) => {
            state.app = null; state.releases = []; state.audit = [];
            state.events = []; state.drift = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadAppDetail.pending, (state) => { state.loading = true; })
            .addCase(loadAppDetail.fulfilled, (state, action) => {
                state.loading = false;
                state.app = action.payload.app;
                state.releases = action.payload.releases || [];
                state.audit = action.payload.audit || [];
                state.events = action.payload.events || [];
            })
            .addCase(loadAppDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(loadDrift.pending, (state) => { state.driftLoading = true; })
            .addCase(loadDrift.fulfilled, (state, action) => {
                state.driftLoading = false;
                state.drift = action.payload;
            })
            .addCase(loadDrift.rejected, (state, action) => {
                state.driftLoading = false;
            });
    },
});

export const { setActiveTab, clearDetail } = appDetailSlice.actions;
export default appDetailSlice.reducer;
