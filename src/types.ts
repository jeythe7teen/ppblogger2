
export enum UserRole {
  READER = 'READER',
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN'
}

// The User object for the application state
export interface User {
  id: string; // This will be the Firebase UID
  username: string; // Can be email's prefix or from mock data
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  username: string;
  userRole: UserRole; // Added to identify author/admin comments
  content: string;
  createdAt: number;
  parentId?: string | null; // For replies
  likes: string[]; // user IDs
  dislikes: string[]; // user IDs
}

export interface Episode {
  id: string;
  storyId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt?: number; // For last edited timestamp
  likes: string[]; // Array of user IDs who liked
  comments: Comment[];
  status: 'published' | 'draft';
  views: number;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: number;
  episodes: Episode[];
  status: 'published' | 'draft';
  classification: 'ongoing' | 'completed';
  views: number;
}

export interface Announcement {
  id: string;
  message: string;
  postedAt: number;
}

export interface AnnouncementSettings {
  rotationInterval: number; // in seconds
}

export interface SocialLinks {
  youtube?: string;
  facebook?: string;
  instagram?: string;
}

// Helper types for state management
export interface AppState {
  currentUser: User | null;
  stories: Story[];
}
