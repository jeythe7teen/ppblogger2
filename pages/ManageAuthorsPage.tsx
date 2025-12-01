import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { User, UserRole } from '../types';
import { Button, Input, Card } from '../components/UI';
import { UserPlus, Edit3, Trash2, ArrowLeft, Users, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { useToast } from '../ToastContext';

export const ManageAuthorsPage: React.FC = () => {
  const { t } = useTranslations();
  const { showToast } = useToast();
  
  const [authors, setAuthors] = useState<User[]>([]);
  const [readers, setReaders] = useState<User[]>([]);
  const [selectedReader, setSelectedReader] = useState('');
  const [editingAuthor, setEditingAuthor] = useState<User | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsDataLoading(true);
    setError(null);
    try {
        const allUsers = await StorageService.getUsers();
        setAuthors(allUsers.filter(u => u.role === UserRole.AUTHOR));
        setReaders(allUsers.filter(u => u.role === UserRole.READER));
    } catch (err) {
        console.error("Failed to fetch users:", err);
        setError(t('errors.dataFetchFailed'));
    } finally {
        setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [t]);

  const handlePromoteReader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReader) {
        showToast(t('errors.formRequired'), 'error');
        return;
    }
    
    setIsSubmitting(true);
    try {
      const readerToPromote = readers.find(r => r.id === selectedReader);
      if (readerToPromote) {
        await StorageService.promoteUserToAuthor(selectedReader);
        showToast(t('notifications.authorPromoted', { username: readerToPromote.username }), 'success');
        setSelectedReader('');
        await fetchData();
      }
    } catch (err: any) {
      showToast(err.message || t('errors.promoteAuthorFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAuthor = (author: User) => {
    setEditingAuthor({ ...author });
  };
  
  const handleUpdateAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuthor) return;
    setIsSubmitting(true);
    try {
      await StorageService.updateUser(editingAuthor.id, { username: editingAuthor.username });
      showToast(t('notifications.authorUpdated', { username: editingAuthor.username }), 'success');
      setEditingAuthor(null);
      await fetchData();
    } catch (err: any) {
       showToast(err.message || 'Failed to update author', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAuthor = async (author: User) => {
    if (window.confirm(t('admin.deleteAuthorConfirm', { username: author.username }))) {
      try {
        await StorageService.deleteUserAndContent(author.id);
        showToast(t('notifications.authorDeleted', { username: author.username }), 'success');
        await fetchData();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete author', 'error');
      }
    }
  };

  const renderAuthorList = () => {
      if (isDataLoading) {
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
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {authors.length > 0 ? authors.map(author => (
              <div key={author.id} className="bg-slate-900 p-2 rounded-lg">
                {editingAuthor?.id === author.id ? (
                  <form onSubmit={handleUpdateAuthor} className="flex flex-col sm:flex-row gap-2 items-end">
                    <Input 
                      value={editingAuthor.username} 
                      onChange={e => setEditingAuthor({...editingAuthor, username: e.target.value})} 
                      className="mb-0 flex-1" 
                      label={t('admin.authorUsernameLabel')}
                      disabled={isSubmitting}
                    />
                    <div className="flex gap-2 self-stretch">
                      <Button type="submit" size="sm" className="h-full" isLoading={isSubmitting}>{t('admin.save')}</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAuthor(null)} className="h-full" disabled={isSubmitting}>X</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <img src={author.avatarUrl} alt={author.username} className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm truncate">{author.username}</p>
                      <p className="text-xs text-gray-400 truncate">{author.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={Edit3} className="!p-2" onClick={() => handleEditAuthor(author)} title={t('admin.editAuthor')} />
                    <Button variant="ghost" size="sm" icon={Trash2} className="text-red-500 hover:bg-red-500/10 !p-2" onClick={() => handleDeleteAuthor(author)} title={t('admin.deleteAuthor')} />
                  </div>
                )}
              </div>
            )) : <p className="text-gray-500 text-center py-4">{t('admin.noAuthors')}</p>}
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/admin">
          <Button variant="ghost" icon={ArrowLeft} className="mr-2">{t('manageAuthorsPage.backToDashboard')}</Button>
        </Link>
        <Users className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-bold text-white">{t('manageAuthorsPage.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: List */}
        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4 text-white">{t('admin.existingAuthorsTitle')}</h2>
            {renderAuthorList()}
          </Card>
        </div>

        {/* Right Column: Promote Form */}
        <div className="lg:col-span-1">
          <Card className="p-4 sm:p-6 lg:sticky top-24">
            <h3 className="text-xl font-bold mb-2">{t('admin.promoteReaderTitle')}</h3>
            <p className="text-sm text-gray-400 mb-4">{t('admin.promoteReaderDesc')}</p>
            <form onSubmit={handlePromoteReader} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.selectReader')}</label>
                <select 
                  value={selectedReader} 
                  onChange={e => setSelectedReader(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 border bg-slate-900 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting || readers.length === 0}
                >
                    <option value="">{t('admin.selectReaderPlaceholder')}</option>
                    {readers.map(r => <option key={r.id} value={r.id}>{r.username} ({r.email})</option>)}
                </select>
              </div>
              <Button type="submit" icon={UserPlus} isLoading={isSubmitting} disabled={isSubmitting || readers.length === 0} className="w-full">{t('admin.promoteButton')}</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};