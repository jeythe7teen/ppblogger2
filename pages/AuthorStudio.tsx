import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/store';
import { Story, User, Episode } from '../types';
import { Button, Input, TextArea, Card } from '../components/UI';
import { Plus, PenTool, Save, BookOpen, ArrowLeft, Trash2, Edit3, Eye, EyeOff, Settings, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { useToast } from '../ToastContext';

interface AuthorStudioProps {
  user: User;
}

type View = 'list' | 'edit-story' | 'edit-episode';

export const AuthorStudio: React.FC<AuthorStudioProps> = ({ user }) => {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [view, setView] = useState<View>('list');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [storyForm, setStoryForm] = useState({ id: '', title: '', description: '', coverImage: '' });
  const [episodeForm, setEpisodeForm] = useState({ id: '', title: '', content: '' });
  
  const loadAuthorStories = async () => {
    setIsLoading(true);
    setError(null);
    if (!user) return;
    try {
      // FIX: Use the specific, secure function to get only this author's stories
      const authorStories = await StorageService.getStoriesByAuthor(user.id);
      setStories(authorStories.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("Failed to load author stories:", err);
      setError(t('errors.dataFetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const resetToListView = () => {
    setView('list');
    setSelectedStory(null);
    setSelectedEpisode(null);
    loadAuthorStories();
  };
  
  // --- Story Actions ---

  const handleEditStory = (story: Story) => {
    setSelectedStory(story);
    setStoryForm({ id: story.id, title: story.title, description: story.description, coverImage: story.coverImage });
    setView('edit-story');
  };
  
  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storyForm.id) { // Authors can only update existing stories
      await StorageService.updateStory(storyForm.id, {
        title: storyForm.title,
        description: storyForm.description,
        coverImage: storyForm.coverImage
      });
      showToast(t('notifications.storyDetailsSaved'), 'success');
    }
    resetToListView();
  };

  // --- Episode Actions ---
  const handleNewEpisode = (story: Story) => {
    setSelectedStory(story);
    setEpisodeForm({ id: '', title: '', content: '' });
    setView('edit-episode');
  };

  const handleEditEpisode = (story: Story, episode: Episode) => {
    setSelectedStory(story);
    setSelectedEpisode(episode);
    setEpisodeForm({ id: episode.id, title: episode.title, content: episode.content });
    setView('edit-episode');
  };

  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) return;

    // --- VALIDATION ---
    const content = episodeForm.content;
    if (content.length > 4000) {
        showToast(t('errors.contentTooLong', { max: 4000 }), 'error'); return;
    }
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    if (linkRegex.test(content)) {
        showToast(t('errors.contentHasLinks'), 'error'); return;
    }
    const imageRegex = /<img\s[^>]*?src\s*=\s*['"]([^'"]*?)['"][^>]*?>|!\[.*?\]\(.*?\)/g;
    if (imageRegex.test(content)) {
        showToast(t('errors.contentHasImages'), 'error'); return;
    }
    // --- END VALIDATION ---

    if (episodeForm.id) { // Update
      await StorageService.updateEpisode(selectedStory.id, episodeForm.id, {
        title: episodeForm.title,
        content: episodeForm.content
      });
    } else { // Create
      await StorageService.createEpisode(selectedStory.id, {
        storyId: selectedStory.id,
        title: episodeForm.title,
        content: episodeForm.content
      });
    }
    showToast(t('notifications.chapterSaved'), 'success');
    resetToListView();
  };

  const handleDeleteEpisode = async (storyId: string, episodeId: string) => {
    if (window.confirm(t('authorStudio.deleteChapterConfirm'))) {
        await StorageService.deleteEpisode(storyId, episodeId);
        showToast(t('notifications.chapterDeleted'), 'success');
        setStories(prevStories => 
            prevStories.map(story => {
                if (story.id === storyId) {
                    return { ...story, episodes: story.episodes.filter(ep => ep.id !== episodeId) };
                }
                return story;
            })
        );
    }
  };

  const handleToggleEpisodeStatus = async (storyId: string, episodeId: string) => {
    await StorageService.toggleEpisodeStatus(storyId, episodeId);
    showToast(t('notifications.chapterStatusUpdated'), 'success');
    const newStories = stories.map(s => {
      if (s.id === storyId) {
        return {
          ...s,
          episodes: s.episodes.map(e => {
            if (e.id === episodeId) {
              const newStatus: 'published' | 'draft' = e.status === 'published' ? 'draft' : 'published';
              return {...e, status: newStatus};
            }
            return e;
          })
        }
      }
      return s;
    });
    setStories(newStories);
  };

  // --- RENDER VIEWS ---

  if (view === 'edit-story' && selectedStory) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={resetToListView} className="mb-4">{t('authorStudio.backToDashboard')}</Button>
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-white">{t('authorStudio.editNovel')}</h2>
          <form onSubmit={handleSaveStory}>
            <Input label={t('authorStudio.titleLabel')} defaultValue={storyForm.title} onChange={e => setStoryForm({...storyForm, title: e.target.value})} required />
            <TextArea label={t('authorStudio.synopsisLabel')} defaultValue={storyForm.description} onChange={e => setStoryForm({...storyForm, description: e.target.value})} required rows={4} />
            <Input label={t('authorStudio.coverImageLabel')} defaultValue={storyForm.coverImage} onChange={e => setStoryForm({...storyForm, coverImage: e.target.value})} />
            <Button type="submit" icon={Save}>{t('authorStudio.saveNovel')}</Button>
          </form>
        </Card>
      </div>
    );
  }

  if (view === 'edit-episode' && selectedStory) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={resetToListView} className="mb-4">{t('authorStudio.backToManager')}</Button>
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-2">{episodeForm.id ? t('authorStudio.editChapter') : t('authorStudio.newChapter')}</h2>
          <p className="text-gray-400 mb-6">{t('authorStudio.for')}: {selectedStory.title}</p>
          <form onSubmit={handleSaveEpisode}>
            <Input label={t('authorStudio.chapterTitleLabel')} value={episodeForm.title} onChange={e => setEpisodeForm({...episodeForm, title: e.target.value})} required />
            <div className="relative">
                <TextArea 
                    label={t('authorStudio.contentLabel')} 
                    value={episodeForm.content} 
                    onChange={e => setEpisodeForm({...episodeForm, content: e.target.value})}
                    required 
                    rows={15} 
                    className="font-serif text-lg leading-relaxed" 
                    maxLength={4000}
                />
                <div className={`absolute bottom-5 right-3 text-xs ${episodeForm.content.length > 4000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {episodeForm.content.length} / 4000
                </div>
            </div>
            <Button type="submit" icon={Save}>{t('authorStudio.saveChapter')}</Button>
          </form>
        </Card>
      </div>
    );
  }

  // Main List View
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-white">{t('authorStudio.mainTitle')}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-bgLight rounded-lg border border-dashed border-red-500/30 text-red-400">
           <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
           <h3 className="text-xl font-medium text-white">{error}</h3>
           <p className="text-red-400/80">{t('errors.checkConnection')}</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 bg-bgLight rounded-lg border border-dashed border-slate-700">
          <PenTool className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white">{t('authorStudio.noNovelsAssigned')}</h3>
          <p className="text-gray-400 mb-6">{t('authorStudio.noNovelsAssignedDesc')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {stories.map(story => (
            <Card key={story.id} className="overflow-visible">
              <div className="p-4 bg-slate-800 flex flex-wrap justify-between items-center gap-4">
                  <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-white">{story.title}</h2>
                         <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${story.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                           {story.status} ({t('authorStudio.adminManaged')})
                         </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{story.description}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" icon={Edit3} onClick={() => handleEditStory(story)}>{t('authorStudio.editDetails')}</Button>
                  </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{t('authorStudio.chapters')}</h3>
                  <Button variant="secondary" size="sm" icon={Plus} onClick={() => handleNewEpisode(story)}>{t('authorStudio.newChapter')}</Button>
                </div>
                <div className="border border-slate-700 rounded-lg">
                  {story.episodes.length > 0 ? (
                     story.episodes.sort((a,b) => a.createdAt - b.createdAt).map((ep, index) => (
                      <div key={ep.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-slate-700 last:border-b-0 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-500">{index + 1}</span>
                          <p className="font-medium text-white">{ep.title}</p>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ep.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                           {ep.status}
                         </span>
                        </div>
                        <div className="flex gap-1 self-end sm:self-center">
                          <Button variant="ghost" size="sm" icon={ep.status === 'published' ? EyeOff : Eye} onClick={() => handleToggleEpisodeStatus(story.id, ep.id)} title={ep.status === 'published' ? t('authorStudio.unpublish') : t('authorStudio.publish')} className="!p-2"/>
                          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => handleEditEpisode(story, ep)} title={t('authorStudio.editChapter')} className="!p-2" />
                          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 hover:text-red-400 !p-2" icon={Trash2} onClick={() => handleDeleteEpisode(story.id, ep.id)} title={t('authorStudio.deleteChapterTooltip')} />
                        </div>
                      </div>
                     ))
                  ) : (
                    <p className="text-sm text-gray-500 p-4 text-center">{t('authorStudio.noChapters')}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
