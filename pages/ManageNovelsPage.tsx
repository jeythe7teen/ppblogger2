
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { User, UserRole, Story } from '../types';
import { Button, Input, Card, TextArea } from '../components/UI';
import { Plus, Trash2, Edit3, EyeOff, Eye, Book, ArrowLeft, X, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { useToast } from '../ToastContext';
import { auth } from '../firebase';

export const ManageNovelsPage: React.FC = () => {
    const { t } = useTranslations();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authors, setAuthors] = useState<User[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [storyForm, setStoryForm] = useState({ title: '', description: '', coverImage: '', authorId: '', classification: 'ongoing' as 'ongoing' | 'completed' });
    const [formError, setFormError] = useState('');
    const [authorFilter, setAuthorFilter] = useState('all');

    // State for the edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStory, setEditingStory] = useState<Story | null>(null);

    // FIX: Add state for delete confirmation modal with verification
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingStory, setDeletingStory] = useState<Story | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [deleteModalError, setDeleteModalError] = useState('');


    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allUsers = await StorageService.getUsers();
            setAuthors(allUsers.filter(u => u.role === UserRole.AUTHOR));
            const allStories = await StorageService.getStories();
            setStories(allStories.sort((a,b) => b.createdAt - a.createdAt));
        } catch (err) {
            console.error("Failed to fetch novels management data:", err);
            setError(t('errors.dataFetchFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateStory = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!storyForm.title.trim() || !storyForm.authorId) {
          showToast(t('admin.storyFormError'), 'error');
          setFormError(t('admin.storyFormError')); // Also keep local for form
          return;
        }
        const author = authors.find(a => a.id === storyForm.authorId);
        if (!author) return;
    
        await StorageService.createStory({
          ...storyForm,
          authorName: author.username,
        });
        showToast(t('notifications.novelCreated', { title: storyForm.title }), 'success');
        setStoryForm({ title: '', description: '', coverImage: '', authorId: '', classification: 'ongoing' });
        await fetchData();
    };
    
    // FIX: Replaced simple delete with a verification flow. This opens the modal.
    const openDeleteModal = async (story: Story) => {
        setDeletingStory(story);
        setIsDeleteModalOpen(true);
        setVerificationCode('');
        setDeleteModalError('');
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("User not authenticated.");
            await StorageService.initiateAdminActionCode(currentUser.uid);
            showToast(t('manageNovels.codeSent'), 'info');
        } catch (error) {
            console.error("Failed to initiate delete action:", error);
            setDeleteModalError('Failed to send verification code. Please try again.');
        }
    };

    const closeDeleteModal = () => {
        setDeletingStory(null);
        setIsDeleteModalOpen(false);
        setVerificationCode('');
        setDeleteModalError('');
    };

    const confirmDeleteStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingStory || !verificationCode.trim()) return;
        
        setIsVerifying(true);
        setDeleteModalError('');

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("User not authenticated.");

            const success = await StorageService.deleteStoryWithVerification(currentUser.uid, verificationCode, deletingStory.id);

            if (success) {
                showToast(t('notifications.novelDeleted', { title: deletingStory.title }), 'success');
                closeDeleteModal();
                await fetchData();
            } else {
                setDeleteModalError(t('manageNovels.invalidCode'));
            }
        } catch (error) {
            console.error("Error deleting story:", error);
            setDeleteModalError(t('manageNovels.deleteFailed'));
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleToggleStoryStatus = async (storyId: string) => {
        await StorageService.toggleStoryStatus(storyId);
        showToast(t('notifications.novelStatusUpdated'), 'success');
        await fetchData();
    };

    const openEditModal = (story: Story) => {
        setEditingStory(story);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditingStory(null);
        setIsEditModalOpen(false);
    };
    
    const handleUpdateStory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStory) return;

        const author = authors.find(a => a.id === editingStory.authorId);
        if (!author) {
            showToast('Selected author not found.', 'error');
            return;
        }
        
        await StorageService.adminUpdateStory(editingStory.id, {
            ...editingStory,
            authorName: author.username // Ensure authorName is updated if authorId changes
        });
        
        showToast(t('notifications.novelUpdated', { title: editingStory.title }), 'success');
        await fetchData();
        closeEditModal();
    };

    const filteredStories = useMemo(() => {
        if (authorFilter === 'all') {
            return stories;
        }
        return stories.filter(story => story.authorId === authorFilter);
    }, [stories, authorFilter]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-center text-red-400 p-4">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            );
        }
        return (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {filteredStories.map(story => (
                <div key={story.id} className="bg-slate-800 p-2 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                   <div className="flex-1">
                       <p className="font-medium text-white">{story.title}</p>
                       <p className="text-xs text-gray-400">
                            {story.authorName} - 
                            <span className={`font-semibold capitalize mx-1 ${story.status === 'published' ? 'text-green-400' : 'text-amber-400'}`}>{story.status}</span> -
                            <span className={`font-semibold capitalize mx-1`}>{t(`classification.${story.classification}`)}</span>
                       </p>
                   </div>
                   <div className="flex gap-1 flex-shrink-0 self-end sm:self-center">
                       <Button variant="ghost" size="sm" icon={Edit3} onClick={() => openEditModal(story)} title={t('authorStudio.edit')} className="!p-2"/>
                       <Button variant="ghost" size="sm" icon={story.status === 'published' ? EyeOff : Eye} onClick={() => handleToggleStoryStatus(story.id)} title={story.status === 'published' ? t('authorStudio.unpublish') : t('authorStudio.publish')} className="!p-2"/>
                       {/* FIX: Call openDeleteModal instead of the old handleDeleteStory */}
                       <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 hover:text-red-400 !p-2" icon={Trash2} onClick={() => openDeleteModal(story)} title={t('authorStudio.deleteNovelTooltip')} />
                   </div>
                </div>
              ))}
            </div>
        );
    };

    return (
        <>
            <div className="max-w-7xl mx-auto py-8 px-4">
                 <div className="flex items-center gap-3 mb-8">
                    <Link to="/admin">
                        <Button variant="ghost" icon={ArrowLeft} className="mr-2">{t('manageNovels.backToDashboard')}</Button>
                    </Link>
                    <Book className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-heading font-bold text-white">{t('manageNovels.title')}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                     {/* Left Column: Create & List */}
                    <div className="lg:col-span-2 space-y-8">
                         <Card className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                <h2 className="text-xl font-bold text-white">{t('admin.allNovels')}</h2>
                                <div className="relative w-full sm:w-auto">
                                     <label htmlFor="authorFilter" className="sr-only">{t('admin.filterByAuthor')}</label>
                                     <select
                                        id="authorFilter"
                                        value={authorFilter}
                                        onChange={(e) => setAuthorFilter(e.target.value)}
                                        className="w-full sm:w-60 appearance-none bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
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
                           {renderContent()}
                        </Card>
                    </div>
                     {/* Right Column: Create Form */}
                    <div className="lg:col-span-1">
                         <Card className="p-4 sm:p-6 lg:sticky top-24">
                            <h3 className="text-xl font-bold mb-4">{t('authorStudio.createNovel')}</h3>
                            {formError && <p className="text-red-400 text-sm mb-4">{formError}</p>}
                            <form onSubmit={handleCreateStory} className="space-y-4">
                                <Input label={t('authorStudio.titleLabel')} value={storyForm.title} onChange={e => setStoryForm({...storyForm, title: e.target.value})} required />
                                <TextArea label={t('authorStudio.synopsisLabel')} value={storyForm.description} onChange={e => setStoryForm({...storyForm, description: e.target.value})} rows={3} />
                                <Input label={t('authorStudio.coverImageLabel')} value={storyForm.coverImage} onChange={e => setStoryForm({...storyForm, coverImage: e.target.value})} placeholder="Optional, random if blank" />
                                <div>
                                   <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.assignToAuthor')}</label>
                                   <select value={storyForm.authorId} onChange={e => setStoryForm({...storyForm, authorId: e.target.value})} required className="w-full px-3 py-2 border bg-slate-900 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                       <option value="">{t('admin.selectAuthor')}</option>
                                       {authors.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="block text-sm font-medium text-gray-300 mb-1">{t('classification.label')}</label>
                                   <select value={storyForm.classification} onChange={e => setStoryForm({...storyForm, classification: e.target.value as 'ongoing' | 'completed'})} required className="w-full px-3 py-2 border bg-slate-900 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                       <option value="ongoing">{t('classification.ongoing')}</option>
                                       <option value="completed">{t('classification.completed')}</option>
                                   </select>
                                </div>
                                <Button type="submit" icon={Plus} className="w-full">{t('authorStudio.createNovelButton')}</Button>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Edit Story Modal */}
            {isEditModalOpen && editingStory && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">{t('authorStudio.editNovel')}</h2>
                                <Button variant="ghost" size="sm" onClick={closeEditModal} className="!p-2"><X className="w-5 h-5"/></Button>
                            </div>
                            <form onSubmit={handleUpdateStory} className="space-y-4">
                                <Input label={t('authorStudio.titleLabel')} value={editingStory.title} onChange={e => setEditingStory({...editingStory, title: e.target.value})} required />
                                <TextArea label={t('authorStudio.synopsisLabel')} value={editingStory.description} onChange={e => setEditingStory({...editingStory, description: e.target.value})} rows={4} />
                                <Input label={t('authorStudio.coverImageLabel')} value={editingStory.coverImage} onChange={e => setEditingStory({...editingStory, coverImage: e.target.value})} />
                                <div>
                                   <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.assignToAuthor')}</label>
                                   <select value={editingStory.authorId} onChange={e => setEditingStory({...editingStory, authorId: e.target.value})} required className="w-full px-3 py-2 border bg-slate-900 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                       {authors.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="block text-sm font-medium text-gray-300 mb-1">{t('classification.label')}</label>
                                   <select value={editingStory.classification} onChange={e => setEditingStory({...editingStory, classification: e.target.value as 'ongoing' | 'completed'})} required className="w-full px-3 py-2 border bg-slate-900 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                                       <option value="ongoing">{t('classification.ongoing')}</option>
                                       <option value="completed">{t('classification.completed')}</option>
                                   </select>
                                </div>
                                <Button type="submit">{t('authorStudio.saveNovel')}</Button>
                            </form>
                        </div>
                    </Card>
                </div>
            )}

            {/* FIX: Add Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingStory && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <form onSubmit={confirmDeleteStory}>
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-white">{t('manageNovels.deleteConfirmTitle')}</h2>
                                <p className="text-sm text-gray-400 mt-2 mb-4">{t('manageNovels.deleteConfirmText')}</p>
                                
                                {deleteModalError && <p className="text-red-400 text-sm mb-4">{deleteModalError}</p>}
                                
                                <Input 
                                    label={t('manageNovels.verificationCode')}
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="bg-slate-800 px-6 py-3 flex justify-end gap-3 rounded-b-lg">
                                <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={isVerifying}>
                                    {t('manageNovels.cancelButton')}
                                </Button>
                                <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 focus:ring-red-500" isLoading={isVerifying} disabled={isVerifying || !verificationCode.trim()}>
                                    {t('manageNovels.deleteButton')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </>
    );
};
