import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// Types
interface Session {
  id: string;
  type: 'individual' | 'joint';
  createdAt: string;
  endedAt?: string;
  participants: Array<{
    user: {
      id: string;
      pseudonym: string;
    };
  }>;
}

interface SessionState {
  sessions: Session[];
  loading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  sessions: [],
  loading: false,
  error: null,
};

// Fetch all sessions
export const fetchSessions = createAsyncThunk(
  'sessions/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/sessions');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to fetch sessions');
    }
  }
);

// Create a new session
export const createSession = createAsyncThunk(
  'sessions/createSession',
  async ({ type, participantIds }: { type: 'individual' | 'joint'; participantIds?: string[] }, { rejectWithValue }) => {
    try {
      const response = await api.post('/sessions', { type, participantIds });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to create session');
    }
  }
);

// Session Slice
const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Sessions
      .addCase(fetchSessions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Session
      .addCase(createSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default sessionSlice.reducer;