import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Episode } from '../types';
import { useTranslations } from '../LanguageContext';
import { Calendar, Eye, Heart, MessageSquare, ChevronRight } from 'lucide-react';

type EpisodeWithMeta = Episode & { storyTitle: string };

export const AllChaptersPage: React.FC = () => {
    const { t } = useTranslations();
    const [episodes, setEpisodes] = useState<EpisodeWithMeta[]>([]);

    useEffect(() => {
        // FIX: Make data fetching async
        const fetchData = async () => {
            const allPublishedStories = await StorageService.getPublishedStories();
            const allPublishedEpisodesRaw = await StorageService.getLatestEpisodes();
            
            const enrichedEpisodes = allPublishedEpisodesRaw.map(ep => {
                const story = allPublishedStories.find(s => s.id === ep.storyId);
                return {
                    ...ep,
                    storyTitle: story?.title || t('home.unknownStory')
                };
            });
            setEpisodes(enrichedEpisodes);
        };
        fetchData();
    }, [t]);

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-heading font-bold text-white mb-8">{t('allChapters.title')}</h1>
            {episodes.length > 0 ? (
                <div className="space-y-4">
                    {episodes.map(episode => (
                        <Link key={episode.id} to={`/story/${episode.storyId}/episode/${episode.id}`} className="block group bg-bgLight border border-slate-700 rounded-lg p-4 transition-colors hover:border-primary">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-400">{episode.storyTitle}</p>
                                    <h2 className="text-xl font-semibold text-white group-hover:text-primary">{episode.title}</h2>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                        <Calendar className="w-3 h-3"/>
                                        <span>{new Date(episode.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-primary mt-1 flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-x-4 text-gray-500 mt-3 pt-3 border-t border-slate-800">
                                <div className="flex items-center gap-1.5 text-sm">
                                    <Eye className="w-4 h-4" />
                                    <span>{episode.views || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <Heart className="w-4 h-4" />
                                    <span>{episode.likes.length}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{episode.comments.length}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-center py-12">{t('allChapters.noChapters')}</p>
            )}
        </div>
    );
};