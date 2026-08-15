const crypto = require("crypto");

class SocialNetwork {
  constructor() {
    this.friendships = new Map();
    this.messages = [];
    this.comments = [];
    this.userProfiles = new Map();
    this.blockedUsers = new Map();
  }

  createProfile(userId, email, fullName) {
    const profile = {
      userId,
      email,
      fullName,
      bio: "",
      profilePicture: null,
      joinDate: new Date(),
      friends: [],
      followers: 0,
      following: 0,
      totalTrades: 0,
      winRate: 0,
      isPublic: true,
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  addFriend(userId, friendEmail) {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    // Find friend by email
    let friendId = null;
    for (const [id, profile] of this.userProfiles) {
      if (profile.email === friendEmail) {
        friendId = id;
        break;
      }
    }

    if (!friendId) {
      return { success: false, error: "Friend not found" };
    }

    if (friendId === userId) {
      return { success: false, error: "Cannot add yourself as friend" };
    }

    if (userProfile.friends.includes(friendId)) {
      return { success: false, error: "Already friends" };
    }

    // Check if blocked
    if (this.isBlocked(userId, friendId)) {
      return { success: false, error: "Cannot add blocked user" };
    }

    // Create friendship
    const friendshipId = `${userId}-${friendId}`;
    const reverseFriendshipId = `${friendId}-${userId}`;

    const friendship = {
      id: friendshipId,
      user1: userId,
      user2: friendId,
      createdAt: new Date(),
      status: "active",
    };

    this.friendships.set(friendshipId, friendship);
    this.friendships.set(reverseFriendshipId, friendship);

    // Add to friend lists
    userProfile.friends.push(friendId);
    const friendProfile = this.userProfiles.get(friendId);
    if (friendProfile) {
      friendProfile.friends.push(userId);
      friendProfile.followers++;
      userProfile.following++;
    }

    return {
      success: true,
      message: `Added ${friendEmail} as friend!`,
      friendId,
    };
  }

  removeFriend(userId, friendId) {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) {
      return { success: false, error: "User profile not found" };
    }

    const friendshipId = `${userId}-${friendId}`;
    const reverseFriendshipId = `${friendId}-${userId}`;

    this.friendships.delete(friendshipId);
    this.friendships.delete(reverseFriendshipId);

    userProfile.friends = userProfile.friends.filter((id) => id !== friendId);

    const friendProfile = this.userProfiles.get(friendId);
    if (friendProfile) {
      friendProfile.friends = friendProfile.friends.filter((id) => id !== userId);
      friendProfile.followers--;
      userProfile.following--;
    }

    return { success: true, message: "Friend removed" };
  }

  sendMessage(senderId, recipientId, content) {
    // Check if blocked
    if (this.isBlocked(senderId, recipientId)) {
      return { success: false, error: "Cannot message blocked user" };
    }

    const messageId = crypto.randomBytes(16).toString("hex");

    const message = {
      id: messageId,
      senderId,
      senderEmail: this.userProfiles.get(senderId)?.email || "Unknown",
      recipientId,
      recipientEmail: this.userProfiles.get(recipientId)?.email || "Unknown",
      content,
      timestamp: new Date(),
      read: false,
      deleted: false,
    };

    this.messages.push(message);

    return {
      success: true,
      messageId,
      message: "Message sent!",
    };
  }

  getMessages(userId, otherUserId, limit = 50) {
    return this.messages
      .filter(
        (m) =>
          !m.deleted &&
          ((m.senderId === userId && m.recipientId === otherUserId) ||
            (m.senderId === otherUserId && m.recipientId === userId))
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  markMessageAsRead(messageId) {
    const message = this.messages.find((m) => m.id === messageId);
    if (message) {
      message.read = true;
      return { success: true };
    }
    return { success: false, error: "Message not found" };
  }

  deleteMessage(messageId, userId) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.senderId !== userId) {
      return { success: false, error: "Can only delete own messages" };
    }

    message.deleted = true;
    return { success: true, message: "Message deleted" };
  }

  commentOnTrade(userId, tradeId, content) {
    const commentId = crypto.randomBytes(16).toString("hex");

    const comment = {
      id: commentId,
      userId,
      userEmail: this.userProfiles.get(userId)?.email || "Unknown",
      fullName: this.userProfiles.get(userId)?.fullName || "User",
      tradeId,
      content,
      timestamp: new Date(),
      likes: 0,
      replies: [],
      deleted: false,
    };

    this.comments.push(comment);

    return {
      success: true,
      commentId,
      message: "Comment posted!",
    };
  }

  getTradeComments(tradeId, limit = 20) {
    return this.comments
      .filter((c) => c.tradeId === tradeId && !c.deleted)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  likeComment(commentId, userId) {
    const comment = this.comments.find((c) => c.id === commentId);
    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    comment.likes++;
    return { success: true, likes: comment.likes };
  }

  replyToComment(parentCommentId, userId, content) {
    const parentComment = this.comments.find((c) => c.id === parentCommentId);
    if (!parentComment) {
      return { success: false, error: "Parent comment not found" };
    }

    const reply = {
      id: crypto.randomBytes(16).toString("hex"),
      userId,
      userEmail: this.userProfiles.get(userId)?.email || "Unknown",
      fullName: this.userProfiles.get(userId)?.fullName || "User",
      content,
      timestamp: new Date(),
      likes: 0,
    };

    parentComment.replies.push(reply);

    return {
      success: true,
      replyId: reply.id,
      message: "Reply posted!",
    };
  }

  deleteComment(commentId, userId) {
    const comment = this.comments.find((c) => c.id === commentId);
    if (!comment) {
      return { success: false, error: "Comment not found" };
    }

    if (comment.userId !== userId) {
      return { success: false, error: "Can only delete own comments" };
    }

    comment.deleted = true;
    return { success: true, message: "Comment deleted" };
  }

  blockUser(userId, blockedUserId) {
    if (!this.blockedUsers.has(userId)) {
      this.blockedUsers.set(userId, []);
    }

    const blockedList = this.blockedUsers.get(userId);
    if (!blockedList.includes(blockedUserId)) {
      blockedList.push(blockedUserId);
    }

    // Remove friendship if exists
    this.removeFriend(userId, blockedUserId);

    return { success: true, message: "User blocked" };
  }

  unblockUser(userId, blockedUserId) {
    const blockedList = this.blockedUsers.get(userId);
    if (blockedList) {
      const index = blockedList.indexOf(blockedUserId);
      if (index > -1) {
        blockedList.splice(index, 1);
      }
    }
    return { success: true, message: "User unblocked" };
  }

  isBlocked(userId, otherUserId) {
    const blockedList = this.blockedUsers.get(userId);
    return blockedList && blockedList.includes(otherUserId);
  }

  getBlockedUsers(userId) {
    return this.blockedUsers.get(userId) || [];
  }

  getFriendsList(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return [];
    }

    return profile.friends.map((friendId) => {
      const friendProfile = this.userProfiles.get(friendId);
      return {
        userId: friendId,
        email: friendProfile?.email || "Unknown",
        fullName: friendProfile?.fullName || "User",
        joinDate: friendProfile?.joinDate,
        followers: friendProfile?.followers || 0,
      };
    });
  }

  getPublicProfile(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile || !profile.isPublic) {
      return null;
    }

    return {
      userId,
      fullName: profile.fullName,
      joinDate: profile.joinDate,
      bio: profile.bio,
      followers: profile.followers,
      following: profile.following,
      totalTrades: profile.totalTrades,
      winRate: profile.winRate,
    };
  }

  updateProfile(userId, updates) {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    if (updates.bio) profile.bio = updates.bio;
    if (updates.profilePicture) profile.profilePicture = updates.profilePicture;
    if (typeof updates.isPublic === "boolean") profile.isPublic = updates.isPublic;

    return { success: true, profile };
  }

  searchFriends(userId, query) {
    const results = [];

    for (const [id, profile] of this.userProfiles) {
      if (
        id !== userId &&
        !this.isBlocked(userId, id) &&
        (profile.email.includes(query) || profile.fullName.includes(query))
      ) {
        results.push({
          userId: id,
          email: profile.email,
          fullName: profile.fullName,
          followers: profile.followers,
        });
      }
    }

    return results.slice(0, 10);
  }

  getUnreadMessageCount(userId) {
    return this.messages.filter(
      (m) => m.recipientId === userId && !m.read && !m.deleted
    ).length;
  }

  // Returns one entry per unique conversation partner, sorted by most recent
  getConversations(userId) {
    const seen  = new Map(); // otherUserId → {latest, unread}
    for (const m of this.messages) {
      if (m.deleted) continue;
      const otherId = m.senderId === userId ? m.recipientId : m.recipientId === userId ? m.senderId : null;
      if (!otherId || otherId === userId) continue;
      const existing = seen.get(otherId);
      const ts = new Date(m.timestamp).getTime();
      if (!existing || ts > existing.ts) {
        seen.set(otherId, {
          ts,
          latest: m.content,
          latestTime: m.timestamp,
        });
      }
    }
    // Attach unread counts and profile info
    const convos = [];
    for (const [otherId, meta] of seen) {
      const profile = this.userProfiles.get(otherId);
      const unread  = this.messages.filter(
        m => m.senderId === otherId && m.recipientId === userId && !m.read && !m.deleted
      ).length;
      convos.push({
        userId: otherId,
        fullName: profile ? profile.fullName : 'Unknown',
        email:    profile ? profile.email    : '',
        latest:  meta.latest,
        latestTime: meta.latestTime,
        unread,
      });
    }
    return convos.sort((a, b) => new Date(b.latestTime) - new Date(a.latestTime));
  }

  getActivityFeed(userId, limit = 20) {
    // Get comments on trades from friends
    const friends = this.userProfiles.get(userId)?.friends || [];
    const feed = [];

    for (const comment of this.comments) {
      if (!comment.deleted && friends.includes(comment.userId)) {
        feed.push({
          type: "comment",
          actor: comment.fullName,
          action: "commented on a trade",
          timestamp: comment.timestamp,
          content: comment.content.substring(0, 100),
        });
      }
    }

    return feed.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }
}

module.exports = SocialNetwork;
