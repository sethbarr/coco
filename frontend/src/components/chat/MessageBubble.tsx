import React from 'react';

interface Message {
  id: string;
  encryptedContent: string;
  content?: string;
  sentAt: string;
  isAi: boolean;
  sender?: {
    id: string;
    pseudonym: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  // Format the message timestamp
  const formattedTime = new Date(message.sentAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Function to convert URLs to clickable links
  const createMarkup = (text: string) => {
    // Simple URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const formattedText = text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${url}</a>`
    );
    
    // Replace line breaks with <br> tags
    return formattedText.replace(/\n/g, '<br>');
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
          isUser
            ? 'bg-teal-500 text-white rounded-br-none'
            : message.isAi
            ? 'bg-blue-100 text-gray-800 rounded-bl-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {!isUser && (
          <div className="font-medium text-xs mb-1">
            {message.sender?.pseudonym || (message.isAi ? 'Coco' : 'Unknown')}
          </div>
        )}
        
        <div
          dangerouslySetInnerHTML={{
            __html: createMarkup(message.content || message.encryptedContent),
          }}
          className="text-sm whitespace-pre-wrap"
        />
        
        <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;