import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// Types
interface Message {
  id: string;
  content?: string;
  encryptedContent: string;
  senderId: string;
  isAi: boolean;
  sentAt: string;
  encryptionMetadata?: any;
  sender?: {
    id: string;
    pseudonym: string;
  };
}

interface Session {
  id: string;
  type: 'individual' | 'joint';
  createdAt: string;
  messages: Message[];
  participants: Array<{
    user: {
      id: string;
      pseudonym: string;
    };
  }>;
}

interface MessageState {
  currentSession: Session | null;
  loading: boolean;
  error: string | null;
}

const initialState: MessageState = {
  currentSession: null,
  loading: false,
  error: null,
};

// Fetch or create the user's individual session
export const fetchSession = createAsyncThunk(
  'messages/fetchSession',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/sessions/current');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to fetch session');
    }
  }
);

// Fetch a specific session (individual or joint) by id
export const fetchSessionById = createAsyncThunk(
  'messages/fetchSessionById',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch session');
    }
  }
);

// Send a message
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ content, sessionId }: { content: string; sessionId: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/messages`, { content, sessionId });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to send message');
    }
  }
);

// Message Slice
const messageSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // A message arrived over the socket (possibly from the other partner or Coco)
    messageReceived: (state, action) => {
      if (!state.currentSession) return;
      if (action.payload.sessionId !== state.currentSession.id) return;
      const exists = state.currentSession.messages.some(m => m.id === action.payload.id);
      if (!exists) {
        state.currentSession.messages.push(action.payload);
      }
    },
    clearSession: (state) => {
      state.currentSession = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Session
      .addCase(fetchSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Session by id
      .addCase(fetchSessionById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSessionById.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchSessionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.currentSession) {
          const push = (msg: any) => {
            if (msg && !state.currentSession!.messages.some(m => m.id === msg.id)) {
              state.currentSession!.messages.push(msg);
            }
          };
          push(action.payload.userMessage);
          push(action.payload.aiMessage);
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { messageReceived, clearSession } = messageSlice.actions;

export default messageSlice.reducer;