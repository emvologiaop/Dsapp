import { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import {
  Plus, Edit2, Trash2, Power, PowerOff,
  TrendingUp, MousePointerClick, Eye, X,
  Calendar, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react';

interface Ad {
  _id: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  targetAudience: 'all' | 'verified' | 'admins';
  impressions: number;
  clicks: number;
  createdBy: { name: string; username: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface AdStats {
  totalAds: number;
  activeAds: number;
  inactiveAds: number;
  totalImpressions: number;
  totalClicks: number;
  clickThroughRate: string;
}

interface Props {
  userId: string;
}

export function AdManagement({ userId }: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    startDate: '',
    endDate: '',
    targetAudience: 'all' as 'all' | 'verified' | 'admins',
  });

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, [page, filterActive]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const filterParam = filterActive !== undefined ? `&isActive=${filterActive}` : '';
      const response = await fetch(`/api/admin/ads?userId=${userId}&page=${page}${filterParam}`);
      if (response.ok) {
        const data = await response.json();
        setAds(data.ads);
        setTotalPages(data.totalPages);
      } else {
        alert('Failed to fetch ads');
      }
    } catch (error) {
      console.error('Failed to fetch ads:', error);
      alert('Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/admin/ads/stats/summary?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch ad stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      alert('Title and content are required');
      return;
    }

    try {
      const url = editingAd
        ? `/api/admin/ads/${editingAd._id}`
        : `/api/admin/ads?userId=${userId}`;

      const method = editingAd ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingAd(null);
        resetForm();
        fetchAds();
        fetchStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save ad');
      }
    } catch (error) {
      console.error('Failed to save ad:', error);
      alert('Failed to save ad');
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      content: ad.content,
      imageUrl: ad.imageUrl || '',
      linkUrl: ad.linkUrl || '',
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.split('T')[0] : '',
      endDate: ad.endDate ? ad.endDate.split('T')[0] : '',
      targetAudience: ad.targetAudience,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ads/${adId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        fetchAds();
        fetchStats();
      } else {
        alert('Failed to delete ad');
      }
    } catch (error) {
      console.error('Failed to delete ad:', error);
      alert('Failed to delete ad');
    }
  };

  const toggleActive = async (ad: Ad) => {
    try {
      const response = await fetch(`/api/admin/ads/${ad._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });

      if (response.ok) {
        fetchAds();
        fetchStats();
      } else {
        alert('Failed to update ad status');
      }
    } catch (error) {
      console.error('Failed to update ad status:', error);
      alert('Failed to update ad status');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
      startDate: '',
      endDate: '',
      targetAudience: 'all',
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingAd(null);
    resetForm();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FriendlyCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="text-primary" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ads</p>
                <p className="text-2xl font-bold">{stats.totalAds}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.activeAds} active, {stats.inactiveAds} inactive
                </p>
              </div>
            </div>
          </FriendlyCard>

          <FriendlyCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Impressions</p>
                <p className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Views across all ads</p>
              </div>
            </div>
          </FriendlyCard>

          <FriendlyCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MousePointerClick className="text-green-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clicks & CTR</p>
                <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.clickThroughRate}% click-through rate
                </p>
              </div>
            </div>
          </FriendlyCard>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Advertisement Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage Telegram bot ads</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Create Ad
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterActive(undefined)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filterActive === undefined
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Ads
        </button>
        <button
          onClick={() => setFilterActive(true)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filterActive === true
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilterActive(false)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filterActive === false
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <FriendlyCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
            </h3>
            <button onClick={handleCancel} className="p-2 hover:bg-muted rounded-lg">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ad title (max 100 characters)"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ad content (max 500 characters)"
                rows={4}
                maxLength={500}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.content.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon size={16} />
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <LinkIcon size={16} />
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Start Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Users</option>
                  <option value="verified">Verified Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Activate ad immediately
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {editingAd ? 'Update Ad' : 'Create Ad'}
              </button>
            </div>
          </form>
        </FriendlyCard>
      )}

      {/* Ads List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading ads...</p>
        </div>
      ) : ads.length === 0 ? (
        <FriendlyCard className="p-12 text-center">
          <p className="text-muted-foreground">No ads found. Create your first ad to get started.</p>
        </FriendlyCard>
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <FriendlyCard key={ad._id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{ad.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        ad.isActive
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-muted-foreground mb-3">{ad.content}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {ad.imageUrl && (
                      <div className="flex items-center gap-1">
                        <ImageIcon size={14} />
                        <span>Has image</span>
                      </div>
                    )}
                    {ad.linkUrl && (
                      <div className="flex items-center gap-1">
                        <LinkIcon size={14} />
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Link
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span>{ad.impressions} impressions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointerClick size={14} />
                      <span>{ad.clicks} clicks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp size={14} />
                      <span>
                        {ad.impressions > 0
                          ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                          : 0}% CTR
                      </span>
                    </div>
                  </div>

                  {(ad.startDate || ad.endDate) && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {ad.startDate && (
                        <span>From: {new Date(ad.startDate).toLocaleDateString()}</span>
                      )}
                      {ad.endDate && (
                        <span>To: {new Date(ad.endDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Created by {ad.createdBy.name} • {new Date(ad.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(ad)}
                    className={`p-2 rounded-lg transition-colors ${
                      ad.isActive
                        ? 'hover:bg-red-500/10 text-red-500'
                        : 'hover:bg-green-500/10 text-green-500'
                    }`}
                    title={ad.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {ad.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(ad)}
                    className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(ad._id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </FriendlyCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-muted rounded-lg disabled:opacity-50 hover:bg-muted/80 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
