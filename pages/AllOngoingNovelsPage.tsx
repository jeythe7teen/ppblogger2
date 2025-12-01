import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Story, User } from '../types';
import { useTranslations } from '../LanguageContext';
import { Eye, Heart, MessageSquare } from 'lucide-react';

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
                        <span>{t('card.chaptersLabel')}: {story.totalChapters}</span>
                        {story.latestChapterNumber > 0 && <span>{t('card.latestLabel')}: #{story.latestChapterNumber}</span>}
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


export const AllOngoingNovelsPage: React.FC = () => {
    const { t } = useTranslations();
    const [allStories, setAllStories] = useState<StoryWithStats[]>([]);
    const [filteredStories, setFilteredStories] = useState<StoryWithStats[]>([]);
    const [authors, setAuthors] = useState<User[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');


    useEffect(() => {
        // FIX: Make data fetching async
        const fetchData = async () => {
            const allPublishedStories = await StorageService.getPublishedStories();
            const ongoingStories = allPublishedStories.filter(s => s.classification === 'ongoing');
            
            const activeAuthors = await StorageService.getActiveAuthors();
            setAuthors(activeAuthors);

            const storiesWithStats: StoryWithStats[] = ongoingStories.map(story => {
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
        };
        fetchData();
    }, []);

    useEffect(() => {
        let storiesToProcess = [...allStories];

        // Filter by author first
        if (selectedAuthor !== 'all') {
            storiesToProcess = storiesToProcess.filter(story => story.authorId === selectedAuthor);
        }

        // Then sort
        storiesToProcess.sort((a, b) => {
            if (sortOrder === 'latest') {
                return b.createdAt - a.createdAt;
            } else {
                return a.createdAt - b.createdAt;
            }
        });
        
        setFilteredStories(storiesToProcess);
    }, [selectedAuthor, sortOrder, allStories]);


    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white">{t('allOngoingNovels.title')}</h1>
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
            {filteredStories.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredStories.map(story => (
                        <NovelCoverCard key={story.id} story={story} />
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-12">{t('allOngoingNovels.noNovels')}</p>
            )}
        </div>
    );
};