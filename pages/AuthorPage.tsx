import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Story, User } from '../types';
import { useTranslations } from '../LanguageContext';
import { Eye, Heart, MessageSquare, Book, AlertTriangle } from 'lucide-react';

// Re-defining these types here to be self-contained, as they are on HomePage
type StoryWithStats = Story & {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalChapters: number;
    latestChapterNumber: number;
};

const NovelCoverCard: React.FC<{ story: StoryWithStats }> = ({ story }) => {
    const { t } = useTranslations();
    return (
        <Link to={`/story/${story.id}`} className="block w-full group">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-lg transform transition-transform duration-300 group-hover:scale-105">
                <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 text-white text-xs backdrop-blur-sm">
                    <div className="flex flex-wrap justify-between items-center gap-x-2">
                        <span className="flex-1 min-w-0 truncate">{t('card.chaptersLabel')}: {story.totalChapters}</span>
                        {story.latestChapterNumber > 0 && <span className="flex-shrink-0">{t('card.latestLabel')}: #{story.latestChapterNumber}</span>}
                    </div>
                </div>
            </div>
            <h4 className="mt-2 font-semibold text-white truncate group-hover:text-primary transition-colors">{story.title}</h4>
            <p className="text-xs text-gray-400 mb-1">{story.authorName}</p>
            <div className="flex items-center gap-x-3 text-gray-500">
                <div className="flex items-center gap-1 text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{story.totalViews}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{story.totalLikes}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    <span>{story.totalComments}</span>
                </div>
            </div>
        </Link>
    );
};


export const AuthorPage: React.FC = () => {
    const { authorId } = useParams<{ authorId: string }>();
    const { t } = useTranslations();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [author, setAuthor] = useState<User | null>(null);
    const [stories, setStories] = useState<StoryWithStats[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            if (authorId) {
                try {
                    // Use efficient single-document fetch instead of listing all users
                    const foundAuthor = await StorageService.getUserById(authorId);
                    setAuthor(foundAuthor || null);

                    if (foundAuthor) {
                      const allPublishedStories = await StorageService.getPublishedStories();
                      const authorStories = allPublishedStories
                          .filter(story => story.authorId === authorId)
                          .map(story => {
                              const totalLikes = story.episodes.reduce((sum, ep) => sum + ep.likes.length, 0);
                              const totalComments = story.episodes.reduce((sum, ep) => sum + ep.comments.length, 0);
                              
                              const publishedEpisodes = story.episodes.filter(ep => ep.status === 'published');
                              const totalChapters = publishedEpisodes.length;
                              const latestChapterNumber = totalChapters > 0 ? totalChapters : 0;

                              return {
                                  ...story,
                                  totalViews: story.views || 0,
                                  totalLikes,
                                  totalComments,
                                  totalChapters,
                                  latestChapterNumber,
                              };
                          });
                      setStories(authorStories);
                    } else {
                      setError("Author not found.");
                      setStories([]);
                    }
                } catch (err) {
                    console.error("Failed to fetch author page data:", err);
                    setError(t('errors.dataFetchFailed'));
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [authorId, t]);

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
    
    if (error || !author) {
        return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-red-400 p-4">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <h2 className="text-xl font-bold mb-2">{error || 'Author not found.'}</h2>
          </div>
        );
    }
    
    const totalNovels = stories.length;
    const totalAuthorViews = stories.reduce((sum, story) => sum + story.totalViews, 0);
    const totalAuthorLikes = stories.reduce((sum, story) => sum + story.totalLikes, 0);
    const totalAuthorComments = stories.reduce((sum, story) => sum + story.totalComments, 0);

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
                {t('authorPage.title', { authorName: author.username })}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-300 mb-8 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-2" title={t('authorPage.novelsStat')}>
                  <Book className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{totalNovels}</span>
                  <span className="text-sm text-gray-400">{t('authorPage.novelsStat')}</span>
              </div>
              <div className="flex items-center gap-2" title={t('authorPage.viewsStat')}>
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{totalAuthorViews.toLocaleString()}</span>
                   <span className="text-sm text-gray-400">{t('authorPage.viewsStat')}</span>
              </div>
              <div className="flex items-center gap-2" title={t('authorPage.likesStat')}>
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{totalAuthorLikes.toLocaleString()}</span>
                   <span className="text-sm text-gray-400">{t('authorPage.likesStat')}</span>
              </div>
              <div className="flex items-center gap-2" title={t('authorPage.commentsStat')}>
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{totalAuthorComments.toLocaleString()}</span>
                   <span className="text-sm text-gray-400">{t('authorPage.commentsStat')}</span>
              </div>
            </div>

            {stories.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {stories.map(story => (
                        <NovelCoverCard key={story.id} story={story} />
                    ))}
                </div>
            ) : (
                <p className="text-gray-400">{t('authorPage.noNovels')}</p>
            )}
        </div>
    );
};
