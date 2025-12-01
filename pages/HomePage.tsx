import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/store';
import { User, Story, Announcement, AnnouncementSettings, Episode } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Eye, Heart, MessageSquare, Megaphone, AlertTriangle, User as UserIcon } from 'lucide-react';
import { useTranslations } from '../LanguageContext';

type EpisodeWithMeta = Episode & { authorName: string; coverImage: string; storyTitle: string };

type StoryForHomePage = Story & {
    totalEpisodeViews: number;
    totalLikes: number;
    totalComments: number;
    latestUpdate: number;
    totalChapters: number;
    latestChapterNumber: number;
};


const NovelCoverCard: React.FC<{ story: StoryForHomePage }> = ({ story }) => {
  const { t } = useTranslations();
  return (
    <Link to={`/story/${story.id}`} className="block w-32 sm:w-40 flex-shrink-0 group">
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
              <span>{story.totalEpisodeViews.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
              <Heart className="w-3 h-3" />
              <span>{story.totalLikes.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="w-3 h-3" />
              <span>{story.totalComments.toLocaleString()}</span>
          </div>
      </div>
    </Link>
  );
};

const ChapterCard: React.FC<{ episode: EpisodeWithMeta }> = ({ episode }) => (
    <Link to={`/story/${episode.storyId}/episode/${episode.id}`} className="block w-56 sm:w-64 flex-shrink-0 group">
        <div className="bg-bgLight border border-slate-700 rounded-lg p-4 transition-colors group-hover:border-primary h-full flex flex-col justify-between">
            <div>
              <p className="text-sm text-gray-400 truncate">{episode.storyTitle}</p>
              <h4 className="font-semibold text-white group-hover:text-primary truncate">{episode.title}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <Calendar className="w-3 h-3"/>
                  <span>{new Date(episode.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
             <div className="flex items-center gap-x-3 text-gray-500 mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1 text-xs">
                    <Eye className="w-3 h-3" />
                    <span>{episode.views || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <Heart className="w-3 h-3" />
                    <span>{episode.likes.length}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    <span>{episode.comments.length}</span>
                </div>
            </div>
        </div>
    </Link>
);


const Carousel: React.FC<{ title: string; children: React.ReactNode; viewAllLink?: string }> = ({ title, children, viewAllLink }) => {
    const { t } = useTranslations();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for precision issues
        }
    };
    
    useEffect(() => {
        const currentRef = scrollRef.current;
        checkScroll();
        currentRef?.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
            currentRef?.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [children]);


    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (React.Children.count(children) === 0) {
        return null;
    }
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8">
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-white">{title}</h3>
                {viewAllLink && (
                  <Link to={viewAllLink} className="text-sm font-semibold text-gray-400 hover:text-primary flex items-center gap-1">
                      {t('home.viewAll')} <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
            </div>
            <div className="relative group">
                <div 
                    ref={scrollRef} 
                    className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-6 lg:px-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent scroll-smooth"
                >
                    {children}
                </div>
                {canScrollLeft &&
                    <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 ml-1">
                        <ChevronLeft />
                    </button>
                }
                {canScrollRight &&
                    <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 mr-1">
                        <ChevronRight />
                    </button>
                }
            </div>
        </div>
    )
};

export const HomePage = () => {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestEpisodes, setLatestEpisodes] = useState<EpisodeWithMeta[]>([]);
  const [popularStories, setPopularStories] = useState<StoryForHomePage[]>([]);
  const [ongoingStories, setOngoingStories] = useState<StoryForHomePage[]>([]);
  const [completedStories, setCompletedStories] = useState<StoryForHomePage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementSettings, setAnnouncementSettings] = useState<AnnouncementSettings | null>(null);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          allPublishedStories, 
          allPublishedEpisodesRaw, 
          fetchedAnnouncements, 
          fetchedSettings
        ] = await Promise.all([
          StorageService.getPublishedStories(),
          StorageService.getLatestEpisodes(),
          StorageService.getAnnouncements(),
          StorageService.getAnnouncementSettings()
        ]);
        

        const storiesWithStatsAndMeta: StoryForHomePage[] = allPublishedStories.map(story => {
          const totalLikes = story.episodes.reduce((sum, ep) => sum + ep.likes.length, 0);
          const totalComments = story.episodes.reduce((sum, ep) => sum + ep.comments.length, 0);
          const totalEpisodeViews = story.episodes.reduce((sum, ep) => sum + ep.views, 0);
          
          const publishedEpisodes = story.episodes.filter(ep => ep.status === 'published');
          const totalChapters = publishedEpisodes.length;
          const latestChapterNumber = totalChapters > 0 ? totalChapters : 0;

          return {
            ...story,
            totalEpisodeViews,
            totalLikes,
            totalComments,
            latestUpdate: Math.max(...story.episodes.map(ep => ep.createdAt), story.createdAt),
            totalChapters,
            latestChapterNumber,
          };
        });
        
        const top6Popular = [...storiesWithStatsAndMeta].sort((a,b) => b.totalEpisodeViews - a.totalEpisodeViews).slice(0, 6);
        setPopularStories(top6Popular);

        setOngoingStories(storiesWithStatsAndMeta.filter(s => s.classification === 'ongoing'));
        setCompletedStories(storiesWithStatsAndMeta.filter(s => s.classification === 'completed'));
        
        const enrichedEpisodes = allPublishedEpisodesRaw.map(ep => {
          return {
            ...ep,
            storyTitle: ep.storyTitle || t('home.unknownStory')
          };
        }).slice(0, 10);
        setLatestEpisodes(enrichedEpisodes);

        setAnnouncements(fetchedAnnouncements);
        setAnnouncementSettings(fetchedSettings);
      } catch (err) {
        console.error("Failed to fetch homepage data:", err);
        setError(t('errors.dataFetchFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t]);

  useEffect(() => {
    if (announcements.length > 1 && announcementSettings) {
      const intervalId = setInterval(() => {
        setIsFading(true);
        setTimeout(() => {
            setCurrentAnnouncementIndex(prevIndex => (prevIndex + 1) % announcements.length);
            setIsFading(false);
        }, 500); // Half a second for fade out
      }, announcementSettings.rotationInterval * 1000);

      return () => clearInterval(intervalId);
    }
  }, [announcements, announcementSettings]);

  const linkify = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
  
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('www.') ? `//${part}` : part;
        return (
          <a 
            key={index} 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
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

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-red-400 p-4">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold mb-2">{t('errors.dataFetchFailed')}</h2>
        <p className="text-red-300/80">{t('errors.checkConnection')}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-12 pb-12">
        {announcements.length > 0 && (
             <div className="bg-slate-800/50 border-y-2 border-primary/20 py-10 min-h-[180px] flex items-center justify-center">
                <div className={`max-w-4xl mx-auto text-center px-4 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                     <div className="flex justify-center items-center gap-3 mb-4">
                        <Megaphone className="w-6 h-6 text-primary"/>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">{t('home.announcementTitle')}</h1>
                     </div>
                     <p className="text-base sm:text-lg text-gray-300 leading-relaxed whitespace-pre-line">
                       {linkify(announcements[currentAnnouncementIndex].message)}
                     </p>
                </div>
            </div>
        )}
        
        <div className={announcements.length === 0 ? 'pt-12 space-y-12' : 'space-y-12'}>
          <Carousel title={t('home.latestChapters')} viewAllLink="/chapters">
            {latestEpisodes.map(ep => <ChapterCard key={ep.id} episode={ep} />)}
          </Carousel>

          <Carousel title={t('home.popularNovels')}>
            {popularStories.map(story => <NovelCoverCard key={story.id} story={story} />)}
          </Carousel>
          
          <Carousel title={t('home.ongoingStories')} viewAllLink="/novels/ongoing">
            {ongoingStories.map(story => <NovelCoverCard key={story.id} story={story} />)}
          </Carousel>
          
          <Carousel title={t('home.completedStories')} viewAllLink="/novels/completed">
            {completedStories.map(story => <NovelCoverCard key={story.id} story={story} />)}
          </Carousel>
        </div>
    </div>
  );
};