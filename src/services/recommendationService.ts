import { Reel } from '../models/Reel.js';
import { VideoView } from '../models/VideoView.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Calculate engagement score for a reel
 * Higher score = more engaging content
 */
export function calculateEngagementScore(reel: any, currentTime: Date): number {
  const likesCount = reel.likedBy?.length || 0;
  const commentsCount = reel.commentsCount || 0;
  const sharesCount = reel.sharesCount || 0;
  const viewsCount = reel.viewsCount || 0;

  // Base engagement: weighted sum of interactions
  const engagementScore =
    (likesCount * 3) +      // Likes worth 3 points
    (commentsCount * 5) +   // Comments worth 5 points (higher engagement)
    (sharesCount * 10) +    // Shares worth 10 points (highest engagement)
    (viewsCount * 0.1);     // Views worth 0.1 points (passive engagement)

  // Time decay factor (newer content gets boosted)
  const ageInHours = (currentTime.getTime() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
  const timeFactor = Math.exp(-ageInHours / 48); // Decay over 48 hours

  // Completion rate (if available)
  const completionRate = reel.completionRate || 0.5; // Default 50%

  return engagementScore * timeFactor * (0.5 + completionRate);
}

/**
 * Get user's interaction history with reels
 */
export async function getUserInteractionHistory(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get reels the user has liked
  const likedReels = await Reel.find({ likedBy: userObjectId })
    .select('_id userId')
    .limit(100)
    .lean();

  // Get reels the user has viewed
  const viewedReels = await VideoView.find({ userId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('reelId', 'userId')
    .lean();

  // Get creators the user engages with most
  const creatorInteractions = new Map<string, number>();

  likedReels.forEach(reel => {
    const creatorId = reel.userId.toString();
    creatorInteractions.set(creatorId, (creatorInteractions.get(creatorId) || 0) + 3);
  });

  viewedReels.forEach(view => {
    if (view.reelId && (view.reelId as any).userId) {
      const creatorId = (view.reelId as any).userId.toString();
      creatorInteractions.set(creatorId, (creatorInteractions.get(creatorId) || 0) + 1);
    }
  });

  return {
    likedReelIds: likedReels.map(r => r._id.toString()),
    viewedReelIds: viewedReels.map(v => v.reelId._id.toString()),
    topCreators: Array.from(creatorInteractions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([creatorId]) => creatorId),
  };
}

/**
 * Find similar users based on interaction patterns (collaborative filtering)
 */
export async function findSimilarUsers(userId: string, limit: number = 50): Promise<string[]> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get reels the current user has liked
  const userLikes = await Reel.find({ likedBy: userObjectId })
    .select('_id')
    .limit(100)
    .lean();

  const likedReelIds = userLikes.map(r => r._id);

  if (likedReelIds.length === 0) {
    return [];
  }

  // Find other users who liked the same reels
  const similarUsers = await Reel.aggregate([
    { $match: { _id: { $in: likedReelIds } } },
    { $unwind: '$likedBy' },
    { $match: { likedBy: { $ne: userObjectId } } },
    { $group: { _id: '$likedBy', commonLikes: { $sum: 1 } } },
    { $sort: { commonLikes: -1 } },
    { $limit: limit },
  ]);

  return similarUsers.map(u => u._id.toString());
}

/**
 * Get personalized reel recommendations for a user (Instagram-like algorithm)
 */
export async function getPersonalizedReels(
  userId: string,
  limit: number = 30,
  offset: number = 0
): Promise<any[]> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Get user's interaction history
  const history = await getUserInteractionHistory(userId);

  // Get user's following list
  const user = await User.findById(userObjectId).select('followingIds').lean();
  const followingIds = user?.followingIds || [];

  // Find similar users for collaborative filtering
  const similarUserIds = await findSimilarUsers(userId, 30);

  // Get reels liked by similar users (collaborative filtering)
  const collaborativeReels = similarUserIds.length > 0
    ? await Reel.find({
        likedBy: { $in: similarUserIds.map(id => new mongoose.Types.ObjectId(id)) },
        _id: { $nin: history.viewedReelIds.map(id => new mongoose.Types.ObjectId(id)) },
      })
        .select('_id')
        .limit(50)
        .lean()
    : [];

  const currentTime = new Date();

  // Build recommendation query with multiple signals
  const reels = await Reel.aggregate([
    {
      $match: {
        _id: { $nin: history.viewedReelIds.map(id => new mongoose.Types.ObjectId(id)) },
        isDeleted: { $ne: true }, // Filter out deleted reels
      },
    },
    {
      $lookup: {
        from: 'videoviews',
        localField: '_id',
        foreignField: 'reelId',
        as: 'views',
      },
    },
    {
      $addFields: {
        viewsCount: { $size: '$views' },
        likesCount: { $size: '$likedBy' },

        // Scoring factors
        isFromFollowing: {
          $cond: [{ $in: ['$userId', followingIds] }, 1, 0],
        },
        isFromTopCreator: {
          $cond: [
            { $in: ['$userId', history.topCreators.map(id => new mongoose.Types.ObjectId(id))] },
            1,
            0,
          ],
        },
        isCollaborative: {
          $cond: [
            { $in: ['$_id', collaborativeReels.map(r => r._id)] },
            1,
            0,
          ],
        },

        // Time decay
        ageInHours: {
          $divide: [
            { $subtract: [currentTime, '$createdAt'] },
            3600000, // milliseconds to hours
          ],
        },
        timeFactor: {
          $exp: {
            $divide: [
              {
                $multiply: [
                  -1,
                  { $divide: [{ $subtract: [currentTime, '$createdAt'] }, 3600000] },
                ],
              },
              48, // 48-hour decay
            ],
          },
        },

        // Engagement rate
        engagementRate: {
          $cond: [
            { $eq: ['$viewsCount', 0] },
            0,
            {
              $divide: [
                {
                  $add: [
                    { $multiply: ['$likesCount', 3] },
                    { $multiply: ['$commentsCount', 5] },
                    { $multiply: ['$sharesCount', 10] },
                  ],
                },
                { $add: ['$viewsCount', 1] },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        // Final recommendation score
        recommendationScore: {
          $add: [
            // Base engagement
            { $multiply: ['$likesCount', 3] },
            { $multiply: ['$commentsCount', 5] },
            { $multiply: ['$sharesCount', 10] },
            { $multiply: ['$viewsCount', 0.1] },

            // Multipliers
            { $multiply: ['$timeFactor', 100] }, // Recency boost
            { $multiply: ['$isFromFollowing', 500] }, // Following boost (highest priority)
            { $multiply: ['$isFromTopCreator', 200] }, // Favorite creator boost
            { $multiply: ['$isCollaborative', 150] }, // Similar users boost
            { $multiply: ['$engagementRate', 50] }, // Engagement rate boost
          ],
        },
      },
    },
    { $sort: { recommendationScore: -1, createdAt: -1 } },
    { $skip: offset },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        videoUrl: 1,
        videoQualities: 1,
        thumbnailUrl: 1,
        duration: 1,
        caption: 1,
        isAnonymous: 1,
        likedBy: 1,
        commentsCount: 1,
        sharesCount: 1,
        createdAt: 1,
        viewsCount: 1,
        recommendationScore: 1,
        'user.name': 1,
        'user.username': 1,
        'user.avatarUrl': 1,
      },
    },
  ]);

  return reels;
}

/**
 * Get trending reels (for new users or when personalization fails)
 */
export async function getTrendingReels(limit: number = 30, offset: number = 0): Promise<any[]> {
  const currentTime = new Date();
  const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

  const reels = await Reel.aggregate([
    {
      $match: {
        createdAt: { $gte: oneDayAgo }, // Only recent content
        isDeleted: { $ne: true }, // Filter out deleted reels
      },
    },
    {
      $lookup: {
        from: 'videoviews',
        localField: '_id',
        foreignField: 'reelId',
        as: 'views',
      },
    },
    {
      $addFields: {
        viewsCount: { $size: '$views' },
        likesCount: { $size: '$likedBy' },

        // Trending score based on velocity
        trendingScore: {
          $add: [
            { $multiply: [{ $size: '$likedBy' }, 5] },
            { $multiply: ['$commentsCount', 10] },
            { $multiply: ['$sharesCount', 20] },
            { $multiply: [{ $size: '$views' }, 1] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1, createdAt: -1 } },
    { $skip: offset },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        videoUrl: 1,
        videoQualities: 1,
        thumbnailUrl: 1,
        duration: 1,
        caption: 1,
        isAnonymous: 1,
        likedBy: 1,
        commentsCount: 1,
        sharesCount: 1,
        createdAt: 1,
        viewsCount: 1,
        trendingScore: 1,
        'user.name': 1,
        'user.username': 1,
        'user.avatarUrl': 1,
      },
    },
  ]);

  return reels;
}
