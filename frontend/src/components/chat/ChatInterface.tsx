import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState } from '../../store';
import { sendMessage, fetchSession, fetchSessionById, messageReceived, clearSession } from '../../store/messageSlice';
import { joinSession, leaveSession } from '../../utils/socket';

// Message Bubble Component
const MessageBubble = ({ message, userId }) => {
  const isUser = message.senderId === userId && !message.isAi;
  const messageContent = message.content || message.encryptedContent || 'No content available';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[75%] px-4 py-3 rounded-lg ${
          isUser 
            ? 'bg-teal-100 text-teal-800 rounded-br-none' 
            : message.isAi 
              ? 'bg-blue-100 text-blue-800 rounded-bl-none' 
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {!isUser && (
          <div className={`text-xs mb-1 ${message.isAi ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {message.isAi ? 'Coco' : message.sender?.pseudonym}
          </div>
        )}
        <div className="whitespace-pre-wrap">{messageContent}</div>
        <div className="text-xs text-right mt-1 text-gray-500">
          {new Date(message.sentAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Typing Indicator Component
const TypingIndicator = () => (
  <div className="flex items-center mb-4">
    <div className="bg-gray-200 px-4 py-3 rounded-lg rounded-bl-none">
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
);

const ChatInterface: React.FC = () => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const dispatch = useDispatch();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { id: sessionIdParam } = useParams<{ id: string }>();

  const { user } = useSelector((state: RootState) => state.auth);
  const { currentSession, loading } = useSelector((state: RootState) => state.messages);

  useEffect(() => {
    // /sessions/:id loads that session; /chat loads (or creates) the individual session
    dispatch(clearSession());
    if (sessionIdParam) {
      // @ts-ignore
      dispatch(fetchSessionById(sessionIdParam));
    } else {
      // @ts-ignore
      dispatch(fetchSession());
    }
  }, [dispatch, sessionIdParam]);

  useEffect(() => {
    // Live updates: join the session room and append incoming messages
    if (!currentSession?.id) return;
    const socket = joinSession(currentSession.id);
    const onMessage = (message: any) => {
      // Skip our own messages — they're added by the sendMessage thunk
      if (!message.isAi && message.senderId === user?.id) return;
      dispatch(messageReceived(message));
    };
    socket.on('message:new', onMessage);
    return () => {
      socket.off('message:new', onMessage);
      leaveSession(currentSession.id);
    };
  }, [currentSession?.id, dispatch, user?.id]);
  
  useEffect(() => {
    // Scroll to bottom on new messages
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    if (!currentSession || !currentSession.id) {
      console.error('No active session available');
      return;
    }
    
    // Show typing indicator
    setIsTyping(true);
    
    // @ts-ignore
    dispatch(sendMessage({
      content: messageInput,
      sessionId: currentSession.id,
      senderId: user?.id
    })).then(() => {
      // Hide typing indicator after response is received
      setIsTyping(false);
    }).catch((error) => {
      console.error('Error sending message:', error);
      setIsTyping(false);
    });
    
    // Clear input
    setMessageInput('');
  };
  
  if (loading && !currentSession) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-5rem)]">
        <div className="text-center">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600">Setting up your session...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-t-lg p-4">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {!currentSession 
                ? 'Loading Session...' 
                : currentSession.type === 'individual' 
                  ? 'Individual Session with Coco'
                  : `Session with ${currentSession.participants
                      .filter(p => p.user.id !== user?.id)
                      .map(p => p.user.pseudonym)
                      .join(', ')}`}
            </h2>
            <p className="text-sm text-white/80">
              {new Date(currentSession?.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="bg-white border-l border-r border-gray-200 h-[calc(100vh-5rem)] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {currentSession?.messages && currentSession.messages.length > 0 ? (
              currentSession.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  userId={user?.id}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <div className="h-16 w-16 mx-auto mb-4 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Start a conversation with Coco</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Coco is here to help you with relationship questions, communication skills, and conflict resolution. What would you like to talk about today?
                </p>
              </div>
            )}
            
            {isTyping && <TypingIndicator />}
            <div ref={messageEndRef}></div>
          </div>
        </div>
        
        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex">
            <textarea
              className="flex-1 border border-gray-300 rounded-l-md p-3 resize-none focus:outline-none focus:border-teal-500 max-h-40"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              rows={1}
            ></textarea>
            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 text-white px-4 rounded-r-md"
              disabled={!messageInput.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;