
import { Story, User, UserRole, Episode, Comment, Announcement, AnnouncementSettings, SocialLinks } from '../types';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';


// --- STORAGE SERVICE (Now a Firestore Service) ---
export const StorageService = {
  // --- AUTH (Now tightly integrated with Firestore User profiles) ---

  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // When auth state changes, get the user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDocSnap;
        try {
          userDocSnap = await getDoc(userDocRef);
        } catch (e) {
          console.error("Firebase fetch error:", e);
          callback(null);
          return;
        }

        if (userDocSnap.exists()) {
          // User profile exists, create our app user from it
          const userData = userDocSnap.data() as Omit<User, 'id'>;
          const appUser: User = {
            id: firebaseUser.uid,
            ...userData
          };
          callback(appUser);
        } else {
          // This is a brand new user who just registered. Create their profile.
          const newAppUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            role: UserRole.READER, // All new signups are Readers
            username: firebaseUser.email!.split('@')[0],
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${firebaseUser.email!}`,
            isVerified: true, // Firebase handles email verification, but for our app logic, they are active.
          };
          // Save the new user profile to Firestore
          await setDoc(userDocRef, newAppUser);
          callback(newAppUser);
        }
      } else {
        // User is signed out.
        callback(null);
      }
    });
  },

  // Auth Actions
  login: async (email: string, password?: string) => {
     if (!password) throw new Error("Password is required.");
     const userCredential = await signInWithEmailAndPassword(auth, email, password);
     return userCredential.user;
  },

  registerUser: async (email: string, password?: string) => {
    if (!password) throw new Error("Password is required.");
    // Firebase Auth will create the user. The onAuthChange listener will then create their Firestore profile.
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },
  
  logout: async () => {
    await signOut(auth);
  },

  sendPasswordResetEmail: async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  },

  // --- SETTINGS (Announcements, Social Links are stored in a 'settings' collection) ---
  getSocialLinks: async (): Promise<SocialLinks> => {
    const docRef = doc(db, 'settings', 'socialLinks');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as SocialLinks : {};
  },

  saveSocialLinks: async (links: SocialLinks) => {
    const docRef = doc(db, 'settings', 'socialLinks');
    await setDoc(docRef, links, { merge: true });
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    const docRef = doc(db, 'settings', 'announcements');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().list) {
        return docSnap.data().list as Announcement[];
    }
    return [];
  },
  
  addAnnouncement: async (message: string) => {
    const newAnnouncement: Announcement = {
      id: doc(collection(db, 'settings')).id,
      message,
      postedAt: Date.now(),
    };
    const docRef = doc(db, 'settings', 'announcements');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        await updateDoc(docRef, { list: arrayUnion(newAnnouncement) });
    } else {
        await setDoc(docRef, { list: [newAnnouncement] });
    }
  },

  deleteAnnouncement: async (announcementId: string) => {
    const docRef = doc(db, 'settings', 'announcements');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const announcements = (data.list || []).filter((ann: Announcement) => ann.id !== announcementId);
      await updateDoc(docRef, { list: announcements });
    }
  },

  getAnnouncementSettings: async (): Promise<AnnouncementSettings> => {
    const docRef = doc(db, 'settings', 'announcements');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().settings) {
      return docSnap.data().settings as AnnouncementSettings;
    }
    return { rotationInterval: 15 }; // Default
  },

  saveAnnouncementSettings: async (settings: AnnouncementSettings) => {
    const docRef = doc(db, 'settings', 'announcements');
    await setDoc(docRef, { settings }, { merge: true });
  },

  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(d => d.data() as User);
  },
  
  getUserById: async (userId: string): Promise<User | null> => {
    if (!userId) return null;
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() as User : null;
  },

  updateUser: async (userId: string, updates: Partial<Pick<User, 'username'>>) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, updates);
  },

  promoteUserToAuthor: async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { role: UserRole.AUTHOR });
  },

  deleteUserAndContent: async (userId: string) => {
    // Note: This is a complex operation. For production, this should ideally be
    // a backend cloud function for atomicity. For this app, we'll do it client-side.
    
    // 1. Find all stories by the user
    const storiesCol = collection(db, 'stories');
    const q = query(storiesCol, where('authorId', '==', userId));
    const userStoriesSnapshot = await getDocs(q);
    
    // 2. Delete all those stories
    const deletePromises = userStoriesSnapshot.docs.map(storyDoc => deleteDoc(storyDoc.ref));
    await Promise.all(deletePromises);
    
    // 3. Delete the user document
    await deleteDoc(doc(db, 'users', userId));

    // NOTE: This does NOT delete the user from Firebase Authentication.
    // That requires the Admin SDK and must be done on a server.
  },
  
  getActiveAuthors: async (): Promise<User[]> => {
    // This function is public-safe. It derives authors from public stories.
    const publishedStories = await StorageService.getPublishedStories();
    const authorIds = [...new Set(publishedStories.map(story => story.authorId))];
    
    const authorPromises = authorIds.map(id => StorageService.getUserById(id));
    const authors = await Promise.all(authorPromises);

    return authors.filter((author): author is User => author !== null);
  },

  // --- STORIES & EPISODES ---
  
  getStories: async (): Promise<Story[]> => {
    const storiesCol = collection(db, 'stories');
    const storySnapshot = await getDocs(storiesCol);
    const stories = storySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Story));
    return stories.sort((a, b) => b.createdAt - a.createdAt);
  },

  getStoryById: async (storyId: string): Promise<Story | null> => {
    const storyDocRef = doc(db, 'stories', storyId);
    const docSnap = await getDoc(storyDocRef);
    if (!docSnap.exists()) return null;
    
    const storyData = docSnap.data() as Omit<Story, 'id'>;
    // Ensure episodes are sorted by creation time
    if (storyData.episodes) {
      storyData.episodes.sort((a, b) => a.createdAt - b.createdAt);
    }
    return { id: docSnap.id, ...storyData } as Story;
  },

  getStoriesByAuthor: async (authorId: string): Promise<Story[]> => {
    const q = query(collection(db, "stories"), where("authorId", "==", authorId));
    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
    return stories.sort((a, b) => b.createdAt - a.createdAt);
  },
  
  getPublishedStories: async (): Promise<Story[]> => {
      const q = query(collection(db, "stories"), where("status", "==", "published"));
      const querySnapshot = await getDocs(q);
      const stories = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      // Sort on the client side to avoid needing a composite index
      return stories.sort((a, b) => b.createdAt - a.createdAt);
  },
  
  createStory: async (storyData: Omit<Story, 'id' | 'createdAt' | 'episodes' | 'status' | 'views'>): Promise<Story> => {
    const newStoryData: Omit<Story, 'id'> = {
      ...storyData,
      createdAt: Date.now(),
      episodes: [],
      status: 'draft',
      views: 0
    };
    const docRef = await addDoc(collection(db, "stories"), newStoryData);
    return { id: docRef.id, ...newStoryData };
  },

  adminUpdateStory: async (storyId: string, updates: Partial<Story>) => {
    const storyDocRef = doc(db, 'stories', storyId);
    await updateDoc(storyDocRef, updates);
  },
  
  deleteStory: async (storyId: string) => {
    await deleteDoc(doc(db, "stories", storyId));
  },
  
  updateStory: async (storyId: string, updates: Partial<Pick<Story, 'title' | 'description' | 'coverImage'>>) => {
    const storyDocRef = doc(db, 'stories', storyId);
    await updateDoc(storyDocRef, updates);
  },

  toggleStoryStatus: async (storyId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const currentStatus = storyDoc.data().status;
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await updateDoc(storyDocRef, { status: newStatus });
    }
  },

  incrementStoryView: async (storyId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    await updateDoc(storyDocRef, { views: increment(1) });
  },

  createEpisode: async (storyId: string, episodeData: Omit<Episode, 'id' | 'createdAt' | 'likes' | 'comments' | 'status' | 'views'>) => {
    const newEpisode: Episode = {
      ...episodeData,
      id: doc(collection(db, 'stories')).id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: [],
      comments: [],
      status: 'draft',
      views: 0,
    };
    const storyDocRef = doc(db, 'stories', storyId);
    await updateDoc(storyDocRef, { episodes: arrayUnion(newEpisode) });
  },
  
  updateEpisode: async (storyId: string, episodeId: string, updates: Partial<Pick<Episode, 'title' | 'content'>>) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          return { ...ep, ...updates, updatedAt: Date.now() };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },

  deleteEpisode: async (storyId: string, episodeId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.filter(ep => ep.id !== episodeId);
      await updateDoc(storyDocRef, { episodes });
    }
  },
  
  toggleEpisodeStatus: async (storyId: string, episodeId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          return { ...ep, status: ep.status === 'published' ? 'draft' : 'published' };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },
  
  incrementEpisodeView: async (storyId: string, episodeId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          return { ...ep, views: (ep.views || 0) + 1 };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },

  toggleLike: async (storyId: string, episodeId: string, userId: string) => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          const likes = ep.likes.includes(userId)
            ? ep.likes.filter(id => id !== userId)
            : [...ep.likes, userId];
          return { ...ep, likes };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },

  addComment: async (storyId: string, episodeId: string, commentData: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'dislikes'>) => {
    const newComment: Comment = {
      ...commentData,
      id: doc(collection(db, 'stories')).id,
      createdAt: Date.now(),
      likes: [],
      dislikes: [],
    };

    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          const comments = [...ep.comments, newComment];
          return { ...ep, comments };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },

  toggleCommentVote: async (storyId: string, episodeId: string, commentId: string, userId: string, voteType: 'like' | 'dislike') => {
    const storyDocRef = doc(db, 'stories', storyId);
    const storyDoc = await getDoc(storyDocRef);
    if (storyDoc.exists()) {
      const story = storyDoc.data() as Story;
      const episodes = story.episodes.map(ep => {
        if (ep.id === episodeId) {
          const comments = ep.comments.map(comment => {
            if (comment.id === commentId) {
              let likes = [...comment.likes];
              let dislikes = [...comment.dislikes];
              if (voteType === 'like') {
                if (likes.includes(userId)) {
                  likes = likes.filter(id => id !== userId);
                } else {
                  likes.push(userId);
                  dislikes = dislikes.filter(id => id !== userId); // Remove from dislikes if liking
                }
              } else {
                if (dislikes.includes(userId)) {
                  dislikes = dislikes.filter(id => id !== userId);
                } else {
                  dislikes.push(userId);
                  likes = likes.filter(id => id !== userId); // Remove from likes if disliking
                }
              }
              return { ...comment, likes, dislikes };
            }
            return comment;
          });
          return { ...ep, comments };
        }
        return ep;
      });
      await updateDoc(storyDocRef, { episodes });
    }
  },
  
  getLatestEpisodes: async (): Promise<(Episode & { authorName: string; coverImage: string; storyTitle: string; })[]> => {
    const q = query(collection(db, "stories"), where("status", "==", "published"), orderBy("createdAt", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    const stories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
    
    const allEpisodes = stories.flatMap(story => 
      story.episodes
        .filter(ep => ep.status === 'published')
        .map(ep => ({ ...ep, authorName: story.authorName, coverImage: story.coverImage, storyTitle: story.title }))
    );
    return allEpisodes.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  },
};
