import { createSlice } from '@reduxjs/toolkit';

const actionsSlice = createSlice({
    name: 'actions',
    initialState: {
        activeModal: null, // 'promote' | 'rollback' | 'freeze' | 'register' | null
        loading: false,
        result: null,
        error: null,
    },
    reducers: {
        openModal: (state, action) => { state.activeModal = action.payload; state.result = null; state.error = null; },
        closeModal: (state) => { state.activeModal = null; state.result = null; state.error = null; },
        actionStart: (state) => { state.loading = true; state.error = null; },
        actionSuccess: (state, action) => { state.loading = false; state.result = action.payload; },
        actionError: (state, action) => { state.loading = false; state.error = action.payload; },
        clearResult: (state) => { state.result = null; state.error = null; },
    },
});

export const { openModal, closeModal, actionStart, actionSuccess, actionError, clearResult } = actionsSlice.actions;
export default actionsSlice.reducer;
