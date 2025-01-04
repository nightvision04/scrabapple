import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquareText, X } from 'lucide-react';
import { useAudioPlayers, playAudio } from "../../audioUtils";

const ChatComponent = ({ socket, gameId, playerId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Use the existing tap sound from audioUtils
    const { messageRecieveAudio } = useAudioPlayers();

    // Scroll to bottom of messages when messages change or chat opens
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            // Reset unread count when chat is opened
            setUnreadCount(0);
            // Focus on input when chat opens
            inputRef.current?.focus();
        }
        scrollToBottom();
    }, [isOpen, messages]);

    // Listen for incoming chat messages
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (messageData) => {
            // Only add the message if it's not from the current sender
            if (messageData.senderId !== playerId) {
                // Increment unread count if chat is not open
                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                    // Play message notification sound only when chat is closed
                    playAudio(messageRecieveAudio);
                }
                setMessages(prevMessages => [...prevMessages, messageData]);
            }
        };

        socket.on('chatMessage', handleChatMessage);

        return () => {
            socket.off('chatMessage', handleChatMessage);
        };
    }, [socket, isOpen, playerId, messageRecieveAudio]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        
        if (!newMessage.trim() || !socket) return;

        const messageData = {
            gameId,
            senderId: playerId,
            message: newMessage.trim(),
            timestamp: new Date().toISOString(),
            read: false
        };

        // Emit message to server
        socket.emit('sendChatMessage', messageData);

        // Add message to local state
        setMessages(prevMessages => [...prevMessages, messageData]);
        setNewMessage('');
    };

    return (
        <div className="border-2 border-[#b795e1] px-2 py-2 bg-[#d9bcfc] text-black rounded-lg transition-colors active:bg-[#FDC5E4] hover:bg-[#e1c8ff]">
            {/* Chat Icon with Unread Count */}
            <div 
                className="relative cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <MessageSquareText 
                    className={`w-6 h-6 ${isOpen ? 'text-black-600' : 'text-black-600 hover:text-black-600'}`} 
                />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                        {unreadCount}
                    </span>
                )}
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-16 right-4 w-80 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 font-semibold text-gray-800 flex justify-between items-center">
                        <span>Game Chat</span>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Messages Container */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-2 max-h-64">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`p-2 rounded-lg max-w-[80%] ${
                                    msg.senderId === playerId 
                                        ? 'bg-purple-100 self-end ml-auto' 
                                        : 'bg-gray-100'
                                }`}
                            >
                                <p className="text-sm">{msg.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Message Input */}
                    <form 
                        onSubmit={handleSendMessage} 
                        className="p-4 border-t border-gray-200 flex items-center"
                    >
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..." 
                            className="flex-grow mr-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <button 
                            type="submit" 
                            className="bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatComponent;