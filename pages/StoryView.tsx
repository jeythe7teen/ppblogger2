import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Story, Episode, User, Comment, UserRole } from '../types';
import { Button, TextArea } from '../components/UI';
import { FormattedContent } from '../components/FormattedContent';
import { Heart, MessageSquare, ArrowLeft, User as UserIcon, Book, List, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, CornerUpLeft, Eye, Share2, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { useToast } from '../ToastContext';

interface StoryViewProps {
  user: User | null;
}

export const StoryView: React.FC<StoryViewProps> = ({ user }) => {
  const { storyId, episodeId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { showToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [visibleEpisodes, setVisibleEpisodes] = useState<Episode[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (storyId && !episodeId && !isLoading) { // Only increment story view if viewing the main story page
      StorageService.incrementStoryView(storyId);
    }
  }, [storyId, episodeId, isLoading]);
  
  useEffect(() => {
    if (storyId && episodeId && !isLoading) {
      StorageService.incrementEpisodeView(storyId, episodeId);
    }
  }, [storyId, episodeId, isLoading]);

  useEffect(() => {
    const fetchStoryData = async () => {
      setIsLoading(true);
      setError(null);
      if (storyId) {
        try {
          // Use efficient single-document fetch
          const foundStory = await StorageService.getStoryById(storyId);

          if (foundStory) {
            // Filter episodes based on user role
            const userVisibleEpisodes = (foundStory.episodes || [])
                .filter(e => e.status === 'published' || (user && (user.role === 'ADMIN' || user.id === foundStory.authorId)))
                .sort((a, b) => a.createdAt - b.createdAt);
            
            setVisibleEpisodes(userVisibleEpisodes);
            setStory(foundStory);

            if (episodeId) {
                const foundEp = userVisibleEpisodes.find(e => e.id === episodeId);
                if (foundEp) {
                  setActiveEpisode(foundEp);
                } else {
                  // If the specific episode isn't found or accessible, show an error.
                  setError(t('storyView.notFound'));
                }
            } else {
                setActiveEpisode(null);
            }
          } else {
            // Story is not found or user does not have permission
            setStory(null);
            setActiveEpisode(null);
            setError(t('storyView.notFound'));
          }
        } catch (err) {
          console.error("Failed to fetch story data:", err);
          setError(t('errors.dataFetchFailed'));
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchStoryData();
  }, [storyId, episodeId, refreshTrigger, user, t]);

  const handleLike = async () => {
    if (!user || !story || !activeEpisode) return;
    await StorageService.toggleLike(story.id, activeEpisode.id, user.id);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
        await navigator.clipboard.writeText(url);
        showToast(t('storyView.linkCopied'), 'success');
    } catch (clipErr) {
      try {
        if(navigator.share) {
          await navigator.share({
            title: activeEpisode?.title || story?.title,
            text: `Check out this story on ${t('header.siteTitle')}`,
            url: window.location.href
          })
        } else {
          throw new Error("Clipboard and Share API failed.");
        }
      } catch(e) {
        window.prompt(t('storyView.copyLinkManual'), url);
      }
    }
  };

  const handleComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const content = parentId ? replyText : commentText;
    if (!user || !story || !activeEpisode || !content.trim()) return;
    
    const newCommentData = {
        episodeId: activeEpisode.id,
        userId: user.id,
        username: user.username,
        userRole: user.role,
        content: content,
        parentId: parentId || null
    };
    
    await StorageService.addComment(story.id, activeEpisode.id, newCommentData);

    if (parentId) {
      setReplyingTo(null);
      setReplyText('');
    } else {
      setCommentText('');
    }
    setRefreshTrigger(prev => prev + 1);
  };
  
  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (!user || !story || !activeEpisode) return;
    await StorageService.toggleCommentVote(story.id, activeEpisode.id, commentId, user.id, voteType);
    setRefreshTrigger(prev => prev + 1);
  };

  const getChapterNav = () => {
    if (!story || !activeEpisode) return { prev: null, next: null };
    const currentIndex = visibleEpisodes.findIndex(ep => ep.id === activeEpisode.id);
    const prev = currentIndex > 0 ? visibleEpisodes[currentIndex - 1] : null;
    const next = currentIndex < visibleEpisodes.length - 1 ? visibleEpisodes[currentIndex + 1] : null;
    return { prev, next };
  };

  const { prev: prevChapter, next: nextChapter } = getChapterNav();

  const CommentTree = ({ comments, parentId = null }: { comments: Comment[], parentId?: string | null }) => {
    const childComments = comments
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.createdAt - b.createdAt);
  
    if (childComments.length === 0) return null;
  
    return (
      <div className={`space-y-6 ${parentId ? 'ml-4 sm:ml-6 pl-2 sm:pl-4 border-l-2 border-slate-700' : ''}`}>
        {childComments.map(comment => {
          const isStoryAuthor = comment.userId === story?.authorId;
          const isAdmin = comment.userRole === UserRole.ADMIN;
          
          let cardClass = "bg-slate-800";
          if (isStoryAuthor) cardClass = "bg-amber-900/20 border border-amber-500/30";
          if (isAdmin) cardClass = "bg-rose-900/20 border border-rose-500/30";

          return (
            <div key={comment.id} className="flex gap-2 sm:gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mt-1">
                <UserIcon className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <div className={`${cardClass} rounded-lg p-3`}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{comment.username}</span>
                      {isStoryAuthor && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">{t('storyView.authorBadge')}</span>}
                      {isAdmin && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">{t('storyView.adminBadge')}</span>}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <button
                    disabled={!user}
                    onClick={() => handleVote(comment.id, 'like')}
                    className={`flex items-center gap-1 hover:text-primary disabled:hover:text-gray-400 ${user && comment.likes.includes(user.id) ? 'text-primary' : ''}`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {comment.likes.length}
                  </button>
                  <button
                    disabled={!user}
                    onClick={() => handleVote(comment.id, 'dislike')}
                    className={`flex items-center gap-1 hover:text-rose-500 disabled:hover:text-gray-400 ${user && comment.dislikes.includes(user.id) ? 'text-rose-500' : ''}`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> {comment.dislikes.length}
                  </button>
                  <button
                    disabled={!user}
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 hover:text-primary disabled:hover:text-gray-400"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" /> {t('storyView.reply')}
                  </button>
                </div>
                {replyingTo === comment.id && (
                  <form onSubmit={(e) => handleComment(e, comment.id)} className="mt-4 ml-4">
                    <TextArea
                      placeholder={`${t('storyView.replyingTo')} ${comment.username}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                       <Button type="button" variant="ghost" onClick={() => setReplyingTo(null)}>{t('storyView.cancel')}</Button>
                       <Button type="submit" size="sm" disabled={!replyText.trim()}>{t('storyView.reply')}</Button>
                    </div>
                  </form>
                )}
                <CommentTree comments={comments} parentId={comment.id} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-red-400 p-4">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">{error || t('storyView.notFound')}</h2>
      </div>
    );
  }
  
  // RENDER CHAPTER READING VIEW
  if (activeEpisode) {
    const chapterIndex = visibleEpisodes.findIndex(ep => ep.id === activeEpisode.id);
    const chapterNumber = chapterIndex > -1 ? chapterIndex + 1 : 0;

    return (
        <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center mb-6 sm:mb-8">
                <Link to={`/story/${story.id}`}>
                    <Button variant="outline" icon={List} size="sm">{t('storyView.allChapters')}</Button>
                </Link>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={ChevronLeft} size="sm" disabled={!prevChapter} onClick={() => navigate(`/story/${story.id}/episode/${prevChapter!.id}`)}>{t('storyView.prev')}</Button>
                    <Button variant="secondary" icon={ChevronRight} size="sm" disabled={!nextChapter} onClick={() => navigate(`/story/${story.id}/episode/${nextChapter!.id}`)}>{t('storyView.next')}</Button>
                </div>
            </div>

            {/* Content */}
            <article className="bg-bgLight p-4 sm:p-8 md:p-12 shadow-lg border border-slate-700 rounded-lg">
                <header className="mb-4 text-center">
                    <h1 className="text-3xl md:text-5xl font-heading font-bold text-white leading-tight">
                        {chapterNumber}: {activeEpisode.title.replace(/^(Chapter|Episode)\s*\d+[:\s]*/i, '')}
                    </h1>
                    <Link to={`/story/${story.id}`} className="text-gray-400 hover:text-primary transition-colors text-sm mt-1 inline-block">
                        {story.title}
                    </Link>
                </header>

                {/* METADATA BAR */}
                 <div className="flex flex-col items-center justify-center gap-y-2 text-gray-400 text-sm my-4">
                    {activeEpisode.updatedAt && (new Date(activeEpisode.updatedAt).getTime() > new Date(activeEpisode.createdAt).getTime()) && (
                        <div className="w-full text-center text-xs text-gray-500 italic">
                           {t('storyView.lastEdited', { date: new Date(activeEpisode.updatedAt).toLocaleString() })}
                        </div>
                    )}
                    <div className="flex items-center justify-center flex-wrap gap-x-4 sm:gap-x-6">
                        <div className="flex items-center gap-1.5" title={t('authorPage.viewsStat')}>
                            <Eye className="w-4 h-4" />
                            <span>{activeEpisode.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={t('authorPage.likesStat')}>
                            <Heart className="w-4 h-4" />
                            <span>{activeEpisode.likes.length.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={t('authorPage.commentsStat')}>
                            <MessageSquare className="w-4 h-4" />
                            <span>{activeEpisode.comments.length.toLocaleString()}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleShare} icon={Share2}>
                            {t('storyView.share')}
                        </Button>
                    </div>
                </div>


                <div className="mb-12">
                    <FormattedContent content={activeEpisode.content} />
                </div>
                 <footer className="flex items-center justify-center gap-4 mb-12">
                    <Button 
                        variant={user && activeEpisode.likes.includes(user.id) ? "primary" : "outline"}
                        onClick={handleLike}
                        disabled={!user}
                        icon={Heart}
                    >
                        {activeEpisode.likes.length}
                    </Button>
                 </footer>

                {/* Comments Section */}
                <div className="bg-slate-900 p-4 sm:p-6 md:p-8 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {activeEpisode.comments.length} {t('storyView.comments')}
                    </h3>
                    {user ? (
                        <form onSubmit={(e) => handleComment(e)} className="mb-8">
                           <TextArea 
                                placeholder={t('storyView.leaveComment')}
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                rows={3}
                            />
                            <div className="flex justify-end mt-2">
                                <Button type="submit" disabled={!commentText.trim()}>{t('storyView.postComment')}</Button>
                            </div>
                        </form>
                    ) : (
                         <div className="bg-slate-800 border border-slate-700 p-4 rounded text-center text-sm mb-8">
                            <Link to="/auth" className="text-primary font-bold hover:underline">{t('storyView.signIn')}</Link> {t('storyView.signInToComment')}
                        </div>
                    )}
                    <CommentTree comments={activeEpisode.comments} />
                </div>
            </article>
        </div>
    );
  }

  // RENDER NOVEL DETAILS VIEW
  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
       <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
                <img src={story.coverImage} alt={story.title} className="w-full max-w-xs mx-auto md:max-w-full aspect-[2/3] object-cover rounded-lg shadow-lg" />
            </div>
            <div className="flex-1">
                <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">{story.title}</h1>
                <div className="flex items-center gap-2 text-gray-400 mb-6">
                    <UserIcon className="w-4 h-4" />
                    <span className="font-medium">{story.authorName}</span>
                </div>
                <div className="prose prose-invert max-w-none text-gray-300 mb-8">
                    <p>{story.description}</p>
                </div>

                <div className="bg-bgLight border border-slate-700 rounded-lg">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <List className="w-5 h-5 text-primary" />
                            {t('authorStudio.chapters')}
                        </h2>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {visibleEpisodes.length > 0 ? (
                            visibleEpisodes.map((ep, index) => (
                                <Link key={ep.id} to={`/story/${story.id}/episode/${ep.id}`} className="block group">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 transition-colors">
                                        <div>
                                            <p className="font-semibold text-white group-hover:text-primary transition-colors">{t('storyView.chapter')} {index + 1}</p>
                                            <p className="text-gray-400 text-sm">{ep.title}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="p-4 text-gray-500">{t('storyView.noChapters')}</p>
                        )}
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};
