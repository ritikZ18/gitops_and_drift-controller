import { configureStore } from '@reduxjs/toolkit';
import appRegistryReducer from './appRegistrySlice';
import appDetailReducer from './appDetailSlice';
import actionsReducer from './actionsSlice';

export const store = configureStore({
    reducer: {
        appRegistry: appRegistryReducer,
        appDetail: appDetailReducer,
        actions: actionsReducer,
    },
});
