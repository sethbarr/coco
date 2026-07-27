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
  kind?: 'standard' | 'checkin' | 'reflection';
  createdAt: string;
  topicId?: string | null;
  topic?: { id: string; title: string } | null;
  recap?: { id: string } | null;
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
  async ({ content, sessionId }: { content: string; sessionId: string; senderId?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/messages`, { content, sessionId });
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to send message');
    }
  }
);

const byTime = (a: Message, b: Message) =>
  new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();

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
        state.currentSession.messages.sort(byTime);
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
      .addCase(sendMessage.pending, (state, action) => {
        state.loading = true;
        // Optimistic bubble: show the user's message immediately so it always
        // appears before Coco's reply (which can arrive first via the socket)
        if (state.currentSession) {
          state.currentSession.messages.push({
            id: `temp-${action.meta.requestId}`,
            content: action.meta.arg.content,
            encryptedContent: action.meta.arg.content,
            senderId: action.meta.arg.senderId || '',
            isAi: false,
            sentAt: new Date().toISOString(),
          });
        }
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.currentSession) {
          // Replace the optimistic bubble with the server-confirmed messages
          state.currentSession.messages = state.currentSession.messages.filter(
            m => m.id !== `temp-${action.meta.requestId}`
          );
          const push = (msg: any) => {
            if (msg && !state.currentSession!.messages.some(m => m.id === msg.id)) {
              state.currentSession!.messages.push(msg);
            }
          };
          push(action.payload.userMessage);
          push(action.payload.aiMessage);
          state.currentSession.messages.sort(byTime);
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        if (state.currentSession) {
          state.currentSession.messages = state.currentSession.messages.filter(
            m => m.id !== `temp-${action.meta.requestId}`
          );
        }
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { messageReceived, clearSession } = messageSlice.actions;

export default messageSlice.reducer;