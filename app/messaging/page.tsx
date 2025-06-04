'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, User, Clock, Eye, MessageCircle } from 'lucide-react';
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

interface Contact {
  id: string;
  name: string;
  email: string;
  type: string;
  online: boolean;
}

export default function Messaging() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch contacts (admin users)
  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/messages/contacts');
      if (response.ok) {
        const contactsData = await response.json();
        setContacts(contactsData);
        // Auto-select first contact (support team)
        if (contactsData.length > 0) {
          setSelectedContact(contactsData[0]);
        }
      } else {
        console.error('Failed to fetch contacts:', response.status);
        toast.error('Failed to load contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      } else {
        console.error('Failed to fetch messages:', response.status);
        toast.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchContacts(), fetchMessages()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Filter messages for selected contact
  const filteredMessages = selectedContact 
    ? messages.filter(msg => 
        (msg.sender_id === user?.id && msg.recipient_id === selectedContact.id) ||
        (msg.recipient_id === user?.id && msg.sender_id === selectedContact.id)
      )
    : [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: selectedContact.id,
          content: newMessage.trim()
        }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Messaging</h1>
            <p className="text-gray-700 dark:text-gray-300 mt-2">Direct communication with our team</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Messaging</h1>
          <p className="text-gray-700 dark:text-gray-300 mt-2">Direct communication with our team</p>
        </div>
      </div>

      {/* Enhanced Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)]">
        {/* Enhanced Conversations Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full border-gray-300 dark:border-gray-600 shadow-sm flex flex-col">
            <CardHeader className="pb-4 bg-white/95 dark:bg-gray-800/90 flex-shrink-0">
              <CardTitle className="text-lg flex items-center space-x-2 text-gray-900 dark:text-white">
                <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Contacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="space-y-1 h-full overflow-y-auto pt-4">
                {contacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className={`p-4 mx-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedContact?.id === contact.id 
                        ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800/50 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{contact.name}</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {contact.online ? 'Online now' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-4 text-center text-gray-600 dark:text-gray-400 text-sm">
                    No contacts available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col border-gray-300 dark:border-gray-600 shadow-sm">
            {/* Enhanced Chat Header */}
            <CardHeader className="border-b border-gray-300 dark:border-gray-600 pb-4 bg-white/95 dark:bg-gray-800/90">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800/50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">
                    {selectedContact ? selectedContact.name : 'Select a contact'}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedContact?.online ? 'Online now' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Enhanced Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 pt-6 bg-gray-50/50 dark:bg-gray-900/50">
              {!selectedContact ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                    <MessageCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Select a contact</h3>
                  <p className="text-gray-700 dark:text-gray-300 max-w-md leading-relaxed">
                    Choose someone from your contacts to start a conversation.
                  </p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center pt-8">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                    <Send className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Start a conversation</h3>
                  <p className="text-gray-700 dark:text-gray-300 max-w-md leading-relaxed">
                    Send a message to {selectedContact.name}. They'll be notified and can respond quickly.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="flex items-start space-x-3 max-w-[75%]">
                        {message.sender_id !== user?.id && (
                          <div className="w-8 h-8 bg-blue-200 dark:bg-blue-800/50 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-3 shadow-sm ${
                            message.sender_id === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p
                              className={`text-xs ${
                                message.sender_id === user?.id
                                  ? 'text-blue-100'
                                  : 'text-gray-600 dark:text-gray-400'
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
                              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Enhanced Message Input */}
            <div className="border-t border-gray-300 dark:border-gray-600 p-4 bg-white/95 dark:bg-gray-800/90">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedContact ? `Message ${selectedContact.name}...` : "Select a contact first..."}
                  className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50"
                  disabled={sending || !selectedContact}
                />
                <Button 
                  type="submit" 
                  disabled={sending || !newMessage.trim() || !selectedContact}
                  className="px-6 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Press Enter to send your message
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Enhanced Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-300 dark:border-gray-600 shadow-sm mt-4">
          <CardContent className="pt-6 pb-6 flex items-center min-h-[120px]">
            <div className="flex items-center space-x-4 w-full">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white mt-4">Direct Communication</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                  Chat directly with our support team for quick questions and real-time assistance.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">Real-time responses</Badge>
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">Message history</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-300 dark:border-gray-600 shadow-sm mt-4">
          <CardContent className="pt-6 pb-6 flex items-center min-h-[120px]">
            <div className="flex items-center space-x-4 w-full">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white mt-4">Need Technical Support?</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                  For complex technical issues or formal requests, consider using our Support Tickets system.
                </p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/tickets'} className="border-gray-300 dark:border-gray-600">
                  Create Support Ticket
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}