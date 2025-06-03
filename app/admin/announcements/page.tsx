'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, Upload, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  expires_at: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    expires_at: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/announcements');
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      const data = await response.json();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/announcements/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imageUrl = formData.image_url;

      // Upload new image if one was selected
      if (selectedFile) {
        imageUrl = await handleImageUpload(selectedFile);
        if (!imageUrl) return; // Upload failed
      }

      const url = editingAnnouncement 
        ? '/api/admin/announcements'
        : '/api/admin/announcements';
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const payload = editingAnnouncement
        ? { id: editingAnnouncement.id, ...formData, image_url: imageUrl }
        : { ...formData, image_url: imageUrl };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save announcement');
      }

      await fetchAnnouncements();
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', image_url: '', expires_at: '' });
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (err) {
      console.error('Error saving announcement:', err);
      alert('Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      await fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement');
    }
  };

  const openCreateModal = () => {
    setFormData({ title: '', content: '', image_url: '', expires_at: '' });
    setEditingAnnouncement(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setShowCreateModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      image_url: announcement.image_url || '',
      expires_at: announcement.expires_at || '',
    });
    setEditingAnnouncement(announcement);
    setSelectedFile(null);
    setPreviewUrl('');
    setShowCreateModal(true);
  };

  const removePreview = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Announcements</h1>
            <p className="text-gray-400 mt-2">Manage platform announcements and updates</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-white mb-2">No announcements yet</h3>
            <p className="text-gray-400 mb-4">Create your first announcement to get started.</p>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start gap-4">
                {/* Image */}
                {announcement.image_url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={announcement.image_url} 
                      alt={announcement.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {formatDate(announcement.created_at)}
                    </div>
                    {announcement.expires_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires {formatDate(announcement.expires_at)}
                      </div>
                    )}
                    {announcement.profiles && (
                      <div>
                        by {announcement.profiles.first_name} {announcement.profiles.last_name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(announcement)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image
                </label>
                <div className="space-y-3">
                  {/* Current/Preview Image */}
                  {(previewUrl || (editingAnnouncement?.image_url && !selectedFile)) && (
                    <div className="relative inline-block">
                      <img 
                        src={previewUrl || editingAnnouncement?.image_url} 
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePreview}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {/* File Input */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {selectedFile ? 'Change Image' : 'Upload Image'}
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAnnouncement(null);
                    removePreview();
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {uploadingImage && (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  )}
                  {editingAnnouncement ? 'Save Changes' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 