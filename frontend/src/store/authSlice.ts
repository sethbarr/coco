import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

interface User {
  id: string;
  pseudonym: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  error: string | null;
}

// For demonstration purposes, we're using localStorage
// In a production app, you'd want to use a more secure method
const initialState: AuthState = {
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  // Only start in a loading state if there's a stored token to verify;
  // otherwise nothing will ever clear it and auth-gated UI hangs forever
  loading: !!localStorage.getItem('token'),
  user: null,
  error: null,
};

// Register User
export const register = createAsyncThunk(
  'auth/register',
  async (formData: { pseudonym: string; password: string; publicKey: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', formData);
      localStorage.setItem('token', response.data.token);
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 429) {
        return rejectWithValue(err.response?.data?.message || 'Too many attempts — please wait about 15 minutes and try again.');
      }
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

// Login User
export const login = createAsyncThunk(
  'auth/login',
  async (formData: { pseudonym: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 429) {
        return rejectWithValue(err.response?.data?.message || 'Too many attempts — please wait about 15 minutes and try again.');
      }
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

// Load User
// In authSlice.ts, modify the loadUser action to handle initialization better
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue, getState }) => {
    const { auth } = getState() as { auth: AuthState };
    
    // Don't try to load if we don't have a token
    if (!auth.token) {
      // Return a non-error response to avoid flickering during login
      return { id: null, pseudonym: null };
    }
    
    try {
      const response = await api.get('/auth/user');
      return response.data;
    } catch (err: any) {
      console.error('Load user error:', err);
      // Don't immediately remove token - let the logout action handle this
      return rejectWithValue(err.response?.data?.message || 'Failed to load user');
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('csrfToken');
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.user = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(register.rejected, (state, action) => {
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        // loadUser resolves with {id: null} when there was no token to verify
        state.isAuthenticated = !!action.payload?.id;
        state.loading = false;
        state.user = action.payload?.id ? action.payload : null;
      })
      .addCase(loadUser.rejected, (state) => {
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.user = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;