'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Upload, Plus, Clock, CheckCircle, User, Calendar, MessageSquare, X, Image, HeadphonesIcon } from 'lucide-react';
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
}

interface CreateTicketForm {
  title: string;
  description: string;
  attachments: File[];
}

export default function SupportTickets() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateTicketForm>({
    title: '',
    description: '',
    attachments: []
  });

  const pendingTickets = tickets.filter(ticket => ticket.status === 'pending');
  const resolvedTickets = tickets.filter(ticket => ticket.status === 'resolved');

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setForm(prev => ({ ...prev, attachments: files }));
  };

  const removeAttachment = (index: number) => {
    setForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('attachments', file));

      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachments');
      }

      const data = await response.json();
      return data.uploadedUrls || [];
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast.error('Failed to upload some attachments');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      // Upload attachments first
      const uploadedUrls = await uploadAttachments(form.attachments);

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          attachments_urls: uploadedUrls
        }),
      });

      if (response.ok) {
        toast.success('Support ticket created successfully');
        setForm({ title: '', description: '', attachments: [] });
        setIsCreateDialogOpen(false);
        fetchTickets();
      } else {
        throw new Error('Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create support ticket');
    } finally {
      setCreating(false);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
            <p className="text-gray-600">Get help with your projects and account</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Support Tickets</h1>
            <p className="text-gray-600 dark:text-gray-400">Get help with your projects and account</p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Custom Modal */}
        {isCreateDialogOpen && (
          <>
            {/* Full viewport backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"></div>
            {/* Modal container */}
            <Card 
              className="fixed inset-0 flex items-center justify-center z-50 p-4 glass-card card-3d has-video bg-transparent border-0"
              videoSrc="/card.mp4"
              videoOpacity="opacity-30" 
              videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
            >
              <div className="bg-white/90 dark:bg-gray-900/90 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Create Support Ticket
                  </h2>
                  <button
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description of your issue"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description *
                      </label>
                      <textarea
                        id="description"
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Please provide detailed information about your issue..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Screenshots (Optional)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload screenshots or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
                        </label>
                        
                        {form.attachments.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {form.attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={creating || uploading}
                      >
                        {creating || uploading ? 'Creating...' : 'Create Ticket'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending ({pendingTickets.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedTickets.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            {pendingTickets.length === 0 ? (
              <Card 
                className="glass-card card-3d"
                videoSrc="/card.mp4"
                videoOpacity="opacity-50" 
                videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                bgColor="bg-white dark:bg-gray-900/80"
                borderColor="border-gray-200 dark:border-gray-700/50"
                hybridMode={true}
              >
                <CardContent className="text-center py-12">
                  <HeadphonesIcon className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No pending tickets</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">You don't have any open support tickets.</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingTickets.map((ticket) => (
                  <Card 
                    key={ticket.id}
                    className="glass-card card-3d hover:shadow-xl transition-all duration-300"
                    videoSrc="/card.mp4"
                    videoOpacity="opacity-50" 
                    videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                    bgColor="bg-white dark:bg-gray-900/80"
                    borderColor="border-gray-200 dark:border-gray-700/50"
                    hybridMode={true}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-black dark:text-white">{ticket.title}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                      
                      {/* Attachments */}
                      {ticket.attachments_urls && ticket.attachments_urls.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-black dark:text-white">Screenshots:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {ticket.attachments_urls.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="resolved" className="space-y-4">
            {resolvedTickets.length === 0 ? (
              <Card 
                className="glass-card card-3d"
                videoSrc="/card.mp4"
                videoOpacity="opacity-50" 
                videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                bgColor="bg-white dark:bg-gray-900/80"
                borderColor="border-gray-200 dark:border-gray-700/50"
                hybridMode={true}
              >
                <CardContent className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No resolved tickets yet</h3>
                  <p className="text-gray-600 dark:text-gray-300">Your resolved support tickets will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {resolvedTickets.map((ticket) => (
                  <Card 
                    key={ticket.id}
                    className="glass-card card-3d hover:shadow-xl transition-all duration-300"
                    videoSrc="/card.mp4"
                    videoOpacity="opacity-50" 
                    videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                    bgColor="bg-white dark:bg-green-50/80"
                    borderColor="border-green-200 dark:border-green-700/50"
                    hybridMode={true}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-black dark:text-white">{ticket.title}</CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                            {ticket.response_at && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="w-4 h-4" />
                                <span>Resolved {formatDate(ticket.response_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2 text-black dark:text-white">Your Issue:</h4>
                        <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                      </div>

                      {/* Attachments */}
                      {ticket.attachments_urls && ticket.attachments_urls.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 text-black dark:text-white">Screenshots:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {ticket.attachments_urls.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {ticket.response && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-medium mb-2 flex items-center space-x-2 text-black dark:text-white">
                            <User className="w-4 h-4" />
                            <span>Admin Response:</span>
                          </h4>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-400 backdrop-blur-sm">
                            <p className="text-gray-700 dark:text-blue-100 whitespace-pre-wrap">{ticket.response}</p>
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