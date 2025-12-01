import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Story, User } from '../types';
import { useTranslations } from '../LanguageContext';
import { Eye, Heart, MessageSquare, AlertTriangle } from 'lucide-react';

// Reusing the NovelCoverCard logic for consistency
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


export const AllNovelsPage: React.FC = () => {
    const { t } = useTranslations();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allStories, setAllStories] = useState<StoryWithStats[]>([]);
    const [filteredStories, setFilteredStories] = useState<StoryWithStats[]>([]);
    const [authors, setAuthors] = useState<User[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [allPublishedStories, activeAuthors] = await Promise.all([
                    StorageService.getPublishedStories(),
                    StorageService.getActiveAuthors()
                ]);

                setAuthors(activeAuthors);

                const storiesWithStats: StoryWithStats[] = allPublishedStories.map(story => {
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
                setAllStories(storiesWithStats);
            } catch (err) {
                console.error("Failed to fetch novels:", err);
                setError(t('errors.dataFetchFailed'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [t]);

     useEffect(() => {
        let storiesToProcess = [...allStories];

        if (selectedAuthor !== 'all') {
            storiesToProcess = storiesToProcess.filter(story => story.authorId === selectedAuthor);
        }

        storiesToProcess.sort((a, b) => {
            if (sortOrder === 'latest') {
                return b.createdAt - a.createdAt;
            } else {
                return a.createdAt - b.createdAt;
            }
        });
        
        setFilteredStories(storiesToProcess);
    }, [selectedAuthor, sortOrder, allStories]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="min-h-[40vh] flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }

        if (error) {
            return (
                <div className="min-h-[40vh] flex flex-col items-center justify-center text-center text-red-400 p-4">
                    <AlertTriangle className="w-10 h-10 mb-4" />
                    <h2 className="text-lg font-bold mb-2">{error}</h2>
                </div>
            );
        }

        if (filteredStories.length > 0) {
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {filteredStories.map(story => (
                        <NovelCoverCard key={story.id} story={story} />
                    ))}
                </div>
            );
        }

        return <p className="text-gray-400 text-center py-12">{t('allNovels.noNovels')}</p>;
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white">{t('allNovels.title')}</h1>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'latest' | 'oldest')}
                            className="w-full appearance-none bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:border-slate-500"
                        >
                            <option value="latest">{t('filter.latestToOld')}</option>
                            <option value="oldest">{t('filter.oldToLatest')}</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                     <div className="relative w-full sm:w-auto">
                         <select
                            value={selectedAuthor}
                            onChange={(e) => setSelectedAuthor(e.target.value)}
                            className="w-full appearance-none bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:border-slate-500"
                        >
                            <option value="all">{t('filter.allAuthors')}</option>
                            {authors.map(author => (
                                <option key={author.id} value={author.id}>{author.username}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                 </div>
            </div>
            {renderContent()}
        </div>
    );
};
