import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// Types
export interface Connection {
  relationshipType: string;
  createdAt: string;
  updatedAt: string;
  id: string;
  status: 'pending' | 'active' | 'declined';
  creatorId: string;
  recipientId: string;
  creator: {
    id: string;
    pseudonym: string;
  };
  recipient: {
    id: string;
    pseudonym: string;
  };
}

interface ConnectionState {
  connections: Connection[];
  loading: boolean;
  error: string | null;
}

const initialState: ConnectionState = {
  connections: [],
  loading: false,
  error: null,
};

// Fetch all connections
export const fetchConnections = createAsyncThunk(
  'connections/fetchConnections',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/connections');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to fetch connections');
    }
  }
);

// Create a new connection request
export const createConnection = createAsyncThunk(
  'connections/createConnection',
  async (recipientId: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/connections', { recipientId });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to create connection');
    }
  }
);

// Accept a connection request
export const acceptConnection = createAsyncThunk(
  'connections/acceptConnection',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/connections/${connectionId}/accept`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to accept connection');
    }
  }
);

// Decline a connection request
export const declineConnection = createAsyncThunk(
  'connections/declineConnection',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/connections/${connectionId}/decline`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to decline connection');
    }
  }
);

// Remove a connection
export const removeConnection = createAsyncThunk(
  'connections/removeConnection',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/connections/${connectionId}`);
      return connectionId; // Return the ID to remove from state
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to remove connection');
    }
  }
);

// Search for users by pseudonym
export const searchUsers = createAsyncThunk(
  'connections/searchUsers',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to search users');
    }
  }
);

// Invite a connection by pseudonym
export const inviteConnection = createAsyncThunk(
  'connections/inviteConnection',
  async (data: { recipientPseudonym: string; relationshipType: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/connections/invite', data);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to invite connection');
    }
  }
);

// Connection Slice
const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Connections
      .addCase(fetchConnections.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connections = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Connection
      .addCase(createConnection.pending, (state) => {
        state.loading = true;
      })
      .addCase(createConnection.fulfilled, (state, action) => {
        state.connections.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Accept Connection
      .addCase(acceptConnection.pending, (state) => {
        state.loading = true;
      })
      .addCase(acceptConnection.fulfilled, (state, action) => {
        state.connections = state.connections.map(conn => 
          conn.id === action.payload.id ? action.payload : conn
        );
        state.loading = false;
        state.error = null;
      })
      .addCase(acceptConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Decline Connection
      .addCase(declineConnection.pending, (state) => {
        state.loading = true;
      })
      .addCase(declineConnection.fulfilled, (state, action) => {
        state.connections = state.connections.map(conn => 
          conn.id === action.payload.id ? action.payload : conn
        );
        state.loading = false;
        state.error = null;
      })
      .addCase(declineConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Remove Connection
      .addCase(removeConnection.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeConnection.fulfilled, (state, action) => {
        state.connections = state.connections.filter(conn => conn.id !== action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(removeConnection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default connectionSlice.reducer;