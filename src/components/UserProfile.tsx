import React, { useState, useEffect } from 'react';
import { FriendlyCard } from './FriendlyCard';
import { FollowButton } from './FollowButton';
import { Ghost, MapPin, Calendar, Link as LinkIcon, Users } from 'lucide-react';

interface UserProfileProps {
  userId: string;
  currentUserId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, currentUserId }) => {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId, currentUserId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/users/${userId}/profile?currentUserId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FriendlyCard className="relative overflow-hidden p-0">
        {/* Cover Photo Area */}
        <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20 w-full"></div>
        
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center text-4xl font-bold overflow-hidden shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.[0] || 'U'
              )}
            </div>
            
            {userId !== currentUserId && (
              <FollowButton 
                userId={currentUserId} 
                targetId={userId} 
                initialIsFollowing={profile.isFollowing} 
                className="mb-2"
              />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.department && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{profile.department}</span>
            </div>
          )}

          <div className="mt-6 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="font-bold text-xl">{profile.followingCount || 0}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Following</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl">{profile.followersCount || 0}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Followers</span>
            </div>
          </div>
        </div>
      </FriendlyCard>
    </div>
  );
};
