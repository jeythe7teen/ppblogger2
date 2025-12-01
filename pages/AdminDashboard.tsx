
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { Announcement, AnnouncementSettings, SocialLinks } from '../types';
import { Button, Input, Card, TextArea } from '../components/UI';
import { ShieldCheck, Megaphone, Trash2, Plus, Save, Link as LinkIcon, Book, Users, BarChart2, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { useToast } from '../ToastContext';

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Announcement State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [settings, setSettings] = useState<AnnouncementSettings>({ rotationInterval: 15 });

  // Social Links State
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({ youtube: '', facebook: '', instagram: ''});

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [anns, sets, links] = await Promise.all([
        StorageService.getAnnouncements(),
        StorageService.getAnnouncementSettings(),
        StorageService.getSocialLinks()
      ]);
      setAnnouncements(anns);
      setSettings(sets);
      setSocialLinks(links);
    } catch (err) {
      console.error("Failed to fetch admin settings:", err);
      setError(t('errors.dataFetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  
  // --- ANNOUNCEMENT & SOCIAL ---
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    
    if (newAnnouncement.length > 200) {
        showToast(t('errors.announcementTooLong', { max: 200 }), 'error');
        return;
    }

    try {
      await StorageService.addAnnouncement(newAnnouncement);
      showToast(t('notifications.announcementAdded'), 'success');
      setNewAnnouncement('');
      await fetchData(); // Refresh data from server
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };
  
  const handleDeleteAnnouncement = async (id: string) => {
    if (window.confirm(t('admin.deleteAnnouncementConfirm'))) {
        const originalAnnouncements = [...announcements];
        // Optimistic UI update: Remove the item from the list immediately.
        setAnnouncements(prev => prev.filter(ann => ann.id !== id));
        try {
            // Call the service to delete from the database.
            await StorageService.deleteAnnouncement(id);
            // If successful, show a success message.
            showToast(t('notifications.announcementDeleted'), 'success');
        } catch (err: any) {
            console.error("Delete failed:", err);
            // If the API call fails, show an error and revert the UI change.
            showToast('Failed to delete announcement', 'error');
            setAnnouncements(originalAnnouncements);
        }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await StorageService.saveAnnouncementSettings(settings);
        showToast(t('notifications.settingsSaved'), 'success');
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await StorageService.saveSocialLinks(socialLinks);
        showToast(t('notifications.linksSaved'), 'success');
    } catch (err: any) {
        showToast(err.message, 'error');
    }
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
        <h2 className="text-xl font-bold mb-2">{error}</h2>
        <p className="text-red-300/80">{t('errors.checkConnection')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-bold text-white">{t('admin.title')}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/admin/novels" className="block bg-bgLight p-6 rounded-lg border border-slate-700 hover:border-primary transition-colors group">
            <Book className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{t('admin.manageNovels')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('admin.manageNovelsDesc')}</p>
        </Link>
        <Link to="/admin/authors" className="block bg-bgLight p-6 rounded-lg border border-slate-700 hover:border-primary transition-colors group">
            <Users className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{t('admin.manageAuthors')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('admin.manageAuthorsDesc')}</p>
        </Link>
         <Link to="/admin/reports" className="block bg-bgLight p-6 rounded-lg border border-slate-700 hover:border-primary transition-colors group">
            <BarChart2 className="w-8 h-8 text-primary mb-3" />
            <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{t('admin.manageReports')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('admin.manageReportsDesc')}</p>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary"/>{t('admin.announcementsTitle')}</h2>
          <form onSubmit={handleAddAnnouncement} className="flex flex-col gap-2 mb-4">
            <div className="relative">
                <TextArea 
                    placeholder={t('admin.newAnnouncementPlaceholder')} 
                    value={newAnnouncement} 
                    onChange={e => setNewAnnouncement(e.target.value)}
                    rows={5}
                    maxLength={200}
                    className="mb-1"
                />
                <div className={`text-xs text-right pr-2 ${newAnnouncement.length > 200 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                    {newAnnouncement.length} / 200
                </div>
            </div>
            <Button type="submit" icon={Plus} className="self-end">{t('admin.add')}</Button>
          </form>

          <h3 className="font-semibold text-gray-300 text-sm mb-2">{t('admin.currentAnnouncements')}</h3>
          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
            {announcements.length > 0 ? announcements.map(ann => (
              <div key={ann.id} className="bg-slate-800 p-2 rounded flex justify-between items-start gap-2">
                <p className="text-sm text-gray-300 flex-1 whitespace-pre-wrap break-words">{ann.message}</p>
                <Button variant="ghost" size="sm" icon={Trash2} className="!p-1 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteAnnouncement(ann.id)} title={t('admin.clearAnnouncement')} />
              </div>
            )) : <p className="text-sm text-gray-500 text-center py-4">{t('admin.noAnnouncements')}</p>}
          </div>

          <form onSubmit={handleSaveSettings} className="border-t border-slate-700 pt-4">
            <h3 className="font-semibold text-gray-300 mb-2">{t('admin.announcementSettings')}</h3>
            <div className="flex items-end gap-3">
              <Input
                label={t('admin.rotationIntervalLabel')}
                type="number"
                value={settings.rotationInterval}
                onChange={e => setSettings({ ...settings, rotationInterval: parseInt(e.target.value, 10) || 0 })}
                className="mb-0"
              />
              <Button type="submit" icon={Save}>{t('admin.saveSettings')}</Button>
            </div>
          </form>
        </Card>
        
        <Card className="p-4 sm:p-6">
           <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LinkIcon className="w-6 h-6 text-primary"/>{t('admin.socialLinksTitle')}</h2>
           <form onSubmit={handleSaveSocialLinks} className="space-y-4">
              <Input
                label={t('admin.youtubeUrlLabel')}
                value={socialLinks.youtube || ''}
                onChange={e => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
              />
               <Input
                label={t('admin.facebookUrlLabel')}
                value={socialLinks.facebook || ''}
                onChange={e => setSocialLinks({ ...socialLinks, facebook: e.g…