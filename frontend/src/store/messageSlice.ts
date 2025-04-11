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

// Fetch or create a session
export const fetchSession = createAsyncThunk(
  'messages/fetchSession',
  async (_, { rejectWithValue }) => {
    try {
      // For demonstration, this will fetch or create an individual session
      const response = await api.get('/sessions/current');
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.response.data.msg || 'Failed to fetch session');
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
  reducers: {},
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
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.currentSession) {
          // Optimistic update
          state.currentSession.messages.push(action.payload.userMessage);
          
          // Add AI response if it exists
          if (action.payload.aiMessage) {
            const aiMessageWithContent = {
              ...action.payload.aiMessage,
              content: action.payload.aiMessage.content || action.payload.aiResponse
            };
            state.currentSession.messages.push(aiMessageWithContent);
          }
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

export default messageSlice.reducer;