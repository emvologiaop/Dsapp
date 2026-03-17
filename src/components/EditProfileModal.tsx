import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Loader2, BadgeCheck, Clock, XCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { FriendlyCard } from './FriendlyCard';

interface EditProfileModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: any) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    website: user?.website || '',
    location: user?.location || '',
    department: user?.department || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [verifRealName, setVerifRealName] = useState('');
  const [verifPhotoUrl, setVerifPhotoUrl] = useState('');
  const [verifNote, setVerifNote] = useState('');
  const [verifError, setVerifError] = useState('');
  const [verifMessage, setVerifMessage] = useState('');
  const [verifLoading, setVerifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        website: user.website || '',
        location: user.location || '',
        department: user.department || '',
      });
      setAvatarPreview(null);
      setAvatarFile(null);
      setUploadedAvatarUrl(null);
    }
  }, [user]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async (): Promise<string | null> => {
    if (!avatarFile || !user?.id) return null;
    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', avatarFile);
      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'PUT',
        body: formDataUpload,
      });
      if (response.ok) {
        const data = await response.json();
        setAvatarFile(null);
        setUploadedAvatarUrl(data.avatarUrl);
        return data.avatarUrl;
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload photo');
        return null;
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Failed to upload photo');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Upload avatar first if changed
      let newAvatarUrl: string | null = null;
      if (avatarFile) {
        newAvatarUrl = await handleAvatarUpload();
      }

      const response = await fetch(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          username: formData.username.toLowerCase(),
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Merge avatar URL if it was uploaded
        if (newAvatarUrl) {
          updatedUser.avatarUrl = newAvatarUrl;
        }
        onSave(updatedUser);
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'username' ? value.toLowerCase() : value }));
  };

  const handleVerificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifError('');
    setVerifMessage('');
    if (!verifRealName.trim()) { setVerifError('Please enter your real name.'); return; }
    if (!verifPhotoUrl.trim()) { setVerifError('Please provide a photo URL.'); return; }
    setVerifLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/verification-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, realName: verifRealName, photoUrl: verifPhotoUrl, note: verifNote }),
      });
      const data = await response.json();
      if (response.ok) {
        setVerifMessage(data.message || 'Verification request submitted!');
        setVerifRealName('');
        setVerifPhotoUrl('');
        setVerifNote('');
      } else {
        setVerifError(data.error || 'Failed to submit request');
      }
    } catch {
      setVerifError('Something went wrong. Please try again.');
    } finally {
      setVerifLoading(false);
    }
  };

  const verificationStatus = user?.verificationStatus;
  const badgeType = user?.badgeType;

  const renderVerificationStatus = () => {
    if (badgeType === 'gold') {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
          <BadgeCheck className="w-5 h-5 text-yellow-500" fill="currentColor" />
          <div>
            <p className="text-sm font-semibold text-yellow-600">Gold Badge — Verified</p>
            <p className="text-xs text-muted-foreground">Your account has a gold verification badge.</p>
          </div>
        </div>
      );
    }
    if (badgeType === 'blue' || user?.isVerified) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <BadgeCheck className="w-5 h-5 text-blue-500" fill="currentColor" />
          <div>
            <p className="text-sm font-semibold text-blue-600">Blue Badge — Verified</p>
            <p className="text-xs text-muted-foreground">Your account has a blue verification badge.</p>
          </div>
        </div>
      );
    }
    if (verificationStatus === 'pending') {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <Clock className="w-5 h-5 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-600">Under Review</p>
            <p className="text-xs text-muted-foreground">Your verification request is being reviewed by an admin.</p>
          </div>
        </div>
      );
    }
    if (verificationStatus === 'rejected') {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <XCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-600">Request Rejected</p>
            <p className="text-xs text-muted-foreground">Your previous request was not approved. You may submit a new request.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          <FriendlyCard className="p-0 border border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form id="edit-profile-form" onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="px-6 py-6 space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0 border-[3px] border-primary/20 shadow-md">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary">{user?.name?.[0] || 'U'}</span>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      Change Photo
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP, max 5MB</p>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="username"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your unique DDU Social handle
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Your full name"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your display name
                  </p>
                </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Website</label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="yourwebsite.com"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="City, Country"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="Computer Science, Engineering, etc."
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg transition-all"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-profile-form"
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>

            {/* Verification Section */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="px-6 py-6 space-y-5">
                  <div>
                    <h3 className="text-base font-bold mb-1">Request Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Submit your real identity for admin review. Verified accounts receive a blue or gold badge displayed on your profile.
                    </p>
                  </div>

                  {/* Current status */}
                  {renderVerificationStatus()}

                  {/* Only show form if not already approved */}
                  {badgeType !== 'blue' && badgeType !== 'gold' && !user?.isVerified && verificationStatus !== 'pending' && (
                    <form onSubmit={handleVerificationRequest} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Real Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={verifRealName}
                          onChange={e => setVerifRealName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          placeholder="Enter your real full name"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">Provide your legal name as it appears on your ID.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Photo URL <span className="text-red-500">*</span></label>
                        <input
                          type="url"
                          value={verifPhotoUrl}
                          onChange={e => setVerifPhotoUrl(e.target.value)}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          placeholder="https://example.com/your-photo.jpg"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">Link to a clear photo of yourself for identity verification.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">Additional Note</label>
                        <textarea
                          value={verifNote}
                          onChange={e => setVerifNote(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                          placeholder="E.g. I am a professor at XYZ university, or any additional context..."
                        />
                      </div>

                      {verifError && (
                        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-400">{verifError}</p>
                        </div>
                      )}
                      {verifMessage && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          <p className="text-sm text-green-600">{verifMessage}</p>
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">How it works:</p>
                        <p>🔵 <strong>Blue badge</strong> — Awarded to verified personal accounts.</p>
                        <p>🟡 <strong>Gold badge</strong> — Awarded to academics, organizations, or notable accounts.</p>
                        <p>Your request will be reviewed by an admin. Providing false information may result in rejection or account action.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={verifLoading}
                        className={cn(
                          "w-full px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm",
                          verifLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {verifLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><BadgeCheck className="w-4 h-4" /> Submit Verification Request</>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
          </FriendlyCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
