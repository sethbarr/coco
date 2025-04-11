import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import messageReducer from './messageSlice';
import sessionReducer from './sessionSlice';
import connectionReducer from './connectionSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    messages: messageReducer,
    sessions: sessionReducer,
    connections: connectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;