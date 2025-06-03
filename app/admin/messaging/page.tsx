'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, User, Clock, Eye, MessageCircle, Users, Reply } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachments_urls: string[];
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  recipient?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Conversation {
  user_id: string;
  user_name: string;
  user_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
}

export default function AdminMessaging() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          if (!data.isAdmin) {
            toast.error('Access denied. Admin privileges required.');
            window.location.href = '/dashboard';
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Failed to verify admin access');
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // Fetch and organize messages into conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/admin/messages');
      if (response.ok) {
        const messages: Message[] = await response.json();
        
        // Group messages by user (non-admin participants)
        const conversationMap = new Map<string, Message[]>();
        
        messages.forEach(message => {
          // Determine the user (non-admin participant)
          const isUserSender = message.sender?.first_name && !message.sender?.email?.includes('admin');
          const isUserRecipient = message.recipient?.first_name && !message.recipient?.email?.includes('admin');
          
          let userId: string;
          let userName: string;
          let userEmail: string;
          
          if (isUserSender) {
            userId = message.sender_id;
            userName = `${message.sender!.first_name} ${message.sender!.last_name}`;
            userEmail = message.sender!.email;
          } else if (isUserRecipient) {
            userId = message.recipient_id;
            userName = `${message.recipient!.first_name} ${message.recipient!.last_name}`;
            userEmail = message.recipient!.email;
          } else {
            // If we can't determine, use sender as fallback
            userId = message.sender_id === user?.id ? message.recipient_id : message.sender_id;
            userName = 'Unknown User';
            userEmail = '';
          }
          
          if (!conversationMap.has(userId)) {
            conversationMap.set(userId, []);
          }
          conversationMap.get(userId)!.push(message);
        });

        // Convert to conversation objects
        const conversationList: Conversation[] = Array.from(conversationMap.entries()).map(([userId, messages]) => {
          // Sort messages by date
          const sortedMessages = messages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const lastMessage = sortedMessages[sortedMessages.length - 1];
          const unreadCount = sortedMessages.filter(msg => 
            !msg.is_read && msg.recipient_id === user?.id
          ).length;

          // Get user info from the first message that has sender/recipient info
          let userName = 'Unknown User';
          let userEmail = '';
          
          for (const msg of sortedMessages) {
            if (msg.sender_id === userId && msg.sender) {
              userName = `${msg.sender.first_name} ${msg.sender.last_name}`;
              userEmail = msg.sender.email;
              break;
            } else if (msg.recipient_id === userId && msg.recipient) {
              userName = `${msg.recipient.first_name} ${msg.recipient.last_name}`;
              userEmail = msg.recipient.email;
              break;
            }
          }

          return {
            user_id: userId,
            user_name: userName,
            user_email: userEmail,
            last_message: lastMessage.content,
            last_message_time: lastMessage.created_at,
            unread_count: unreadCount,
            messages: sortedMessages
          };
        });

        // Sort conversations by last message time
        conversationList.sort((a, b) => 
          new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        );

        setConversations(conversationList);
      } else {
        console.error('Failed to fetch messages:', response.status);
        toast.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    }
  }, [isAdmin]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.user_id,
          content: newMessage.trim()
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        
        // Update the selected conversation with the new message
        setSelectedConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMsg],
          last_message: newMsg.content,
          last_message_time: newMsg.created_at
        } : null);

        // Update conversations list
        setConversations(prev => prev.map(conv => 
          conv.user_id === selectedConversation.user_id 
            ? {
                ...conv,
                messages: [...conv.messages, newMsg],
                last_message: newMsg.content,
                last_message_time: newMsg.created_at
              }
            : conv
        ));

        setNewMessage('');
        toast.success('Message sent successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // Mark messages as read
    const unreadMessages = conversation.messages.filter(msg => 
      !msg.is_read && msg.recipient_id === user?.id
    );
    
    unreadMessages.forEach(async (message) => {
      try {
        await fetch('/api/messages', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId: message.id
          }),
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Messages</h1>
            <p className="text-gray-600">Manage user conversations and support requests</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Messages</h1>
          <p className="text-gray-600">Manage user conversations and support requests</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {conversations.length} conversations
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {conversations.reduce((sum, conv) => sum + conv.unread_count, 0)} unread
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
        {/* Conversations Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>User Conversations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[calc(100vh-20rem)] overflow-y-auto">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.user_id}
                    className={`p-4 mx-4 mb-2 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.user_id === conversation.user_id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {getInitials(conversation.user_name)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{conversation.user_name}</p>
                          {conversation.unread_count > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-1">{conversation.user_email}</p>
                        <p className="text-xs text-gray-600 truncate">{conversation.last_message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(conversation.last_message_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No conversations yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            {/* Chat Header */}
            <CardHeader className="border-b pb-4">
              <div className="flex items-center space-x-3">
                {selectedConversation ? (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {getInitials(selectedConversation.user_name)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.user_name}</CardTitle>
                      <p className="text-sm text-gray-600">{selectedConversation.user_email}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <CardTitle className="text-lg">Select a conversation</CardTitle>
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4">
              {!selectedConversation ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <MessageCircle className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Select a conversation</h3>
                  <p className="text-gray-600 max-w-md leading-relaxed">
                    Choose a user conversation from the sidebar to view messages and respond.
                  </p>
                </div>
              ) : selectedConversation.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Reply className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">No messages yet</h3>
                  <p className="text-gray-600 max-w-md leading-relaxed">
                    Start the conversation with {selectedConversation.user_name}.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="flex items-start space-x-3 max-w-[75%]">
                        {message.sender_id !== user?.id && (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {getInitials(selectedConversation.user_name)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.sender_id === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p
                              className={`text-xs ${
                                message.sender_id === user?.id
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {formatDate(message.created_at)}
                            </p>
                            {message.sender_id === user?.id && (
                              <div className="flex items-center space-x-1 ml-2">
                                {message.is_read ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {message.sender_id === user?.id && (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'A'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Message Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedConversation ? `Reply to ${selectedConversation.user_name}...` : "Select a conversation first..."}
                  className="flex-1"
                  disabled={sending || !selectedConversation}
                />
                <Button 
                  type="submit" 
                  disabled={sending || !newMessage.trim() || !selectedConversation}
                  className="px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send your response
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 