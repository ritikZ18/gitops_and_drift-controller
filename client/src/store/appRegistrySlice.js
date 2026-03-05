import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchApps } from '../api/appsApi';

export const loadApps = createAsyncThunk('appRegistry/loadApps', async (env) => {
    return await fetchApps(env);
});

const initialState = {
    apps: [],
    filteredApps: [],
    selectedAppId: null,
    selectedEnv: '',
    searchQuery: '',
    healthFilter: '',
    driftFilter: '',
    syncFilter: '',
    frozenFilter: false,
    pinnedOnlyFilter: false,
    pinnedAppIds: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pinnedApps') || '[]') : [],
    loading: false,
    error: null,
    lastUpdated: null,
};

const appRegistrySlice = createSlice({
    name: 'appRegistry',
    initialState,
    reducers: {
        setSelectedApp: (state, action) => { state.selectedAppId = action.payload; },
        setSelectedEnv: (state, action) => { state.selectedEnv = action.payload; },
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
            state.filteredApps = filterApps(state);
        },
        togglePin: (state, action) => {
            const id = action.payload;
            if (state.pinnedAppIds.includes(id)) {
                state.pinnedAppIds = state.pinnedAppIds.filter(pid => pid !== id);
            } else {
                state.pinnedAppIds.push(id);
            }
            localStorage.setItem('pinnedApps', JSON.stringify(state.pinnedAppIds));
            state.filteredApps = filterApps(state);
        },
        setHealthFilter: (state, action) => {
            state.healthFilter = state.healthFilter === action.payload ? '' : action.payload;
            state.filteredApps = filterApps(state);
        },
        setDriftFilter: (state, action) => {
            state.driftFilter = state.driftFilter === action.payload ? '' : action.payload;
            state.filteredApps = filterApps(state);
        },
        setSyncFilter: (state, action) => {
            state.syncFilter = state.syncFilter === action.payload ? '' : action.payload;
            state.filteredApps = filterApps(state);
        },
        setFrozenFilter: (state, action) => {
            state.frozenFilter = !state.frozenFilter;
            state.filteredApps = filterApps(state);
        },
        setPinnedOnlyFilter: (state) => {
            state.pinnedOnlyFilter = !state.pinnedOnlyFilter;
            state.filteredApps = filterApps(state);
        },
        clearFilters: (state) => {
            state.searchQuery = '';
            state.healthFilter = '';
            state.driftFilter = '';
            state.syncFilter = '';
            state.frozenFilter = false;
            state.pinnedOnlyFilter = false;
            state.filteredApps = state.apps;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadApps.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loadApps.fulfilled, (state, action) => {
                state.loading = false;
                state.apps = action.payload || [];
                state.filteredApps = filterApps({ ...state, apps: action.payload || [] });
                state.lastUpdated = new Date().toISOString();
                if (!state.selectedAppId && action.payload?.length > 0) {
                    state.selectedAppId = action.payload[0].id;
                }
            })
            .addCase(loadApps.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

function filterApps(state) {
    let result = state.apps;
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(a => a.name.toLowerCase().includes(q) || a.environment.toLowerCase().includes(q));
    }
    if (state.healthFilter) {
        result = result.filter(a => a.healthStatus === state.healthFilter);
    }
    if (state.driftFilter) {
        result = result.filter(a => a.driftSeverity === state.driftFilter);
    }
    if (state.syncFilter) {
        result = result.filter(a => a.syncStatus === state.syncFilter);
    }
    if (state.frozenFilter) {
        result = result.filter(a => a.frozen);
    }
    if (state.pinnedOnlyFilter) {
        result = result.filter(a => state.pinnedAppIds.includes(a.id));
    }

    // Sort pinned apps to the top, then by name
    return [...result].sort((a, b) => {
        const aPinned = state.pinnedAppIds.includes(a.id);
        const bPinned = state.pinnedAppIds.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return a.name.localeCompare(b.name);
    });
}

export const {
    setSelectedApp, setSelectedEnv, setSearchQuery, togglePin,
    setHealthFilter, setDriftFilter, setSyncFilter,
    setFrozenFilter, setPinnedOnlyFilter, clearFilters
} = appRegistrySlice.actions;

export default appRegistrySlice.reducer;
