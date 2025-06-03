'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, User, Calendar, MessageSquare, Send, X, Image } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'resolved';
  response?: string;
  response_at?: string;
  attachments_urls: string[];
  created_at: string;
  admin_id?: string;
  user_id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    organization?: string;
  };
}

export default function AdminTickets() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const pendingTickets = tickets.filter(ticket => ticket.status === 'pending');
  const resolvedTickets = tickets.filter(ticket => ticket.status === 'resolved');

  const fetchTickets = async () => {
    try {
      console.log('🔍 Admin fetching tickets...');
      const response = await fetch('/api/admin/tickets');
      console.log('📡 Admin tickets response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Admin tickets data:', data);
        setTickets(data);
      } else if (response.status === 403) {
        console.log('❌ Access denied for admin tickets');
        toast.error('Access denied. Admin privileges required.');
      } else {
        console.log('⚠️ Failed to fetch admin tickets:', response.status);
        throw new Error('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('💥 Error fetching admin tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleRespondToTicket = async (ticketId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setResponding(ticketId);
    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          response: responseText.trim()
        }),
      });

      if (response.ok) {
        toast.success('Response sent successfully');
        setResponseText('');
        setResponding(null);
        fetchTickets(); // Refresh the list
      } else {
        throw new Error('Failed to send response');
      }
    } catch (error) {
      console.error('Error responding to ticket:', error);
      toast.error('Failed to send response');
    } finally {
      setResponding(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (profile: Ticket['profiles']) => {
    return `${profile.first_name} ${profile.last_name}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ticket Management</h1>
            <p className="text-gray-600">Manage and respond to user support tickets</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ticket Management</h1>
            <p className="text-gray-600">Manage and respond to user support tickets</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {pendingTickets.length} pending
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {resolvedTickets.length} resolved
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pending ({pendingTickets.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedTickets.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            {pendingTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending tickets</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    All support tickets have been resolved. Great job!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingTickets.map((ticket) => (
                  <Card key={ticket.id} className="border-l-4 border-l-yellow-400">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{getUserDisplayName(ticket.profiles)}</span>
                              <span className="text-gray-400">({ticket.profiles.email})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                          {ticket.profiles.organization && (
                            <div className="text-sm text-gray-500">
                              Organization: {ticket.profiles.organization}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Issue Description:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {ticket.description}
                        </p>
                      </div>

                      {/* Screenshots */}
                      {ticket.attachments_urls && ticket.attachments_urls.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            Screenshots:
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {ticket.attachments_urls.map((url, index) => (
                              <div
                                key={index}
                                className="relative group cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              >
                                <img
                                  src={url}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white bg-opacity-90 rounded-full p-2">
                                      <Image className="w-4 h-4 text-gray-700" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Response Section */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Admin Response:</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`response-${ticket.id}`}>Your Response</Label>
                            <Textarea
                              id={`response-${ticket.id}`}
                              value={responding === ticket.id ? responseText : ''}
                              onChange={(e) => {
                                if (responding === ticket.id) {
                                  setResponseText(e.target.value);
                                } else {
                                  setResponding(ticket.id);
                                  setResponseText(e.target.value);
                                }
                              }}
                              placeholder="Type your response to the user..."
                              rows={4}
                              className="resize-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            {responding === ticket.id && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setResponding(null);
                                  setResponseText('');
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            )}
                            <Button
                              onClick={() => handleRespondToTicket(ticket.id)}
                              disabled={responding === ticket.id && !responseText.trim()}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send Response
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="mt-6">
            {resolvedTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No resolved tickets</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    No tickets have been resolved yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {resolvedTickets.map((ticket) => (
                  <Card key={ticket.id} className="border-l-4 border-l-green-400">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-lg">{ticket.title}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{getUserDisplayName(ticket.profiles)}</span>
                              <span className="text-gray-400">({ticket.profiles.email})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                          </div>
                          {ticket.profiles.organization && (
                            <div className="text-sm text-gray-500">
                              Organization: {ticket.profiles.organization}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                          {ticket.response_at && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <MessageSquare className="w-3 h-3" />
                              <span>Resolved {formatDate(ticket.response_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">User's Issue:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {ticket.description}
                        </p>
                      </div>

                      {/* Screenshots */}
                      {ticket.attachments_urls && ticket.attachments_urls.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            Screenshots:
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {ticket.attachments_urls.map((url, index) => (
                              <div
                                key={index}
                                className="relative group cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              >
                                <img
                                  src={url}
                                  alt={`Screenshot ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white bg-opacity-90 rounded-full p-2">
                                      <Image className="w-4 h-4 text-gray-700" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {ticket.response && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center space-x-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>Admin Response:</span>
                          </h4>
                          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                            <p className="text-gray-800 whitespace-pre-wrap">{ticket.response}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 