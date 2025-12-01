import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StorageService } from './services/store';
import { User, UserRole, SocialLinks, Story } from './types';
import { AuthPage } from './pages/Auth';
import { AuthorStudio } from './pages/AuthorStudio';
import { StoryView } from './pages/StoryView';
import { HomePage } from './pages/Home';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthorPage } from './pages/AuthorPage';
import { AllNovelsPage } from './pages/AllNovelsPage';
import { AllChaptersPage } from './pages/AllChaptersPage';
import { ManageNovelsPage } from './pages/ManageNovelsPage';
import { ManageAuthorsPage } from './pages/ManageAuthorsPage';
import { SiteAuthorReportPage } from './pages/SiteAuthorReportPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { AllOngoingNovelsPage } from './pages/AllOngoingNovelsPage';
import { AllCompletedNovelsPage } from './pages/AllCompletedNovelsPage';
import { Button } from './components/UI';
import { LogOut, PenTool, Shield, LogIn, Search, X, Filter } from 'lucide-react';
import { useTranslations } from './LanguageContext';

interface LayoutProps {
  children?: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout = ({ children, user, onLogout }: LayoutProps) => {
  const { language, setLanguage, t } = useTranslations();
  const [activeAuthors, setActiveAuthors] = useState<User[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAuthor, setSelectedAuthor] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Story[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mobile modal states
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setActiveAuthors(await StorageService.getActiveAuthors());
        setSocialLinks(await StorageService.getSocialLinks());
      } catch (error) {
        console.error("Failed to fetch initial layout data:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'author' && pathParts[2]) {
      setSelectedAuthor(pathParts[2]);
    } else {
      setSelectedAuthor('');
    }
  }, [location.pathname]);

  // Effect for search logic
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const fetchAndFilterStories = async () => {
      try {
        const allStories = await StorageService.getPublishedStories();
        const filtered = allStories.filter(story =>
          story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.authorName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("Failed to fetch stories for search:", error);
      }
    };

    const timeoutId = setTimeout(fetchAndFilterStories, 300); // Debounce search
    return () => clearTimeout(timeoutId);

  }, [searchQuery]);

  // Effect to handle clicks outside search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAuthorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const authorId = event.target.value;
    setSelectedAuthor(authorId);
    if (authorId) {
      navigate(`/author/${authorId}`);
    } else {
      navigate('/');
    }
    setIsFilterModalOpen(false); // Close modal on selection
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleSearchResultClick = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    setIsSearchModalOpen(false); // Close modal on selection
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-bgDark/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 h-16 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center flex-shrink-0 min-w-0">
                 <span className="font-heading text-base sm:text-xl font-bold text-white tracking-wider truncate">{t('header.siteTitle')}</span>
            </Link>
            
            <div className="flex-1 flex justify-center px-1 md:px-2 lg:px-8">
               <div className="hidden md:flex items-center gap-2 w-full max-w-md">
                   <div className="relative flex-1" ref={searchContainerRef}>
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Search className="h-5 w-5 text-gray-400" />
                       </div>
                       <input 
                         className="block w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                         placeholder={t('header.searchPlaceholder')}
                         type="search" 
                         value={searchQuery}
                         onChange={handleSearchChange}
                         onFocus={() => setIsSearchFocused(true)}
                       />
                       {isSearchFocused && searchQuery && (
                         <div className="absolute top-full mt-2 w-full sm:w-96 bg-bgLight border border-slate-700 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                           {searchResults.length > 0 ? (
                             searchResults.map(story => (
                               <Link 
                                 key={story.id} 
                                 to={`/story/${story.id}`}
                                 onClick={handleSearchResultClick}
                                 className="flex items-center gap-4 p-3 hover:bg-slate-700/50 transition-colors"
                               >
                                 <img src={story.coverImage} alt={story.title} className="w-10 h-14 object-cover rounded-sm flex-shrink-0" />
                                 <div className="overflow-hidden">
                                   <p className="font-semibold text-white truncate">{story.title}</p>
                                   <p className="text-xs text-gray-400 truncate">{story.authorName}</p>
                                 </div>
                               </Link>
                             ))
                           ) : (
                             <p className="p-4 text-sm text-gray-500 text-center">{t('header.noResults')}</p>
                           )}
                         </div>
                       )}
                   </div>
                   <div className="relative">
                       <select 
                           value={selectedAuthor}
                           onChange={handleAuthorChange}
                           className="appearance-none bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:border-slate-500"
                        >
                           <option value="">{t('header.chooseAuthor')}</option>
                           {activeAuthors.map(author => (
                               <option key={author.id} value={author.id}>{author.username}</option>
                           ))}
                       </select>
                       <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                       </div>
                   </div>
               </div>
               {/* Mobile Icons */}
               <div className="md:hidden flex items-center gap-1">
                    <Button variant="ghost" icon={Filter} className="!p-2" onClick={() => setIsFilterModalOpen(true)} title={t('header.filterByAuthor')} />
                    <Button variant="ghost" icon={Search} className="!p-2" onClick={() => setIsSearchModalOpen(true)} title={t('header.searchPlaceholder')} />
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className="flex items-center border border-slate-600 rounded-md">
                    <button 
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-1 text-xs font-bold rounded-l-md transition-colors ${language === 'en' ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                        EN
                    </button>
                    <button 
                        onClick={() => setLanguage('ta')}
                        className={`px-2 py-1 text-xs font-bold rounded-r-md transition-colors ${language === 'ta' ? 'bg-primary text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>
                        தமிழ்
                    </button>
                </div>
                
                <div className="hidden md:flex items-center gap-3 border-l border-slate-700 ml-2 pl-3">
                    {socialLinks.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors" title="YouTube">
                          <i className="fab fa-youtube fa-lg"></i>
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" title="Facebook">
                          <i className="fab fa-facebook fa-lg"></i>
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors" title="Instagram">
                          <i className="fab fa-instagram fa-lg"></i>
                      </a>
                    )}
                </div>
                
                {user ? (
                    <>
                        {user.role === UserRole.ADMIN && (
                            <Link to="/admin" title={t('header.adminDashboard')}>
                                <Button variant="ghost" className="!p-2"><Shield className="w-5 h-5"/></Button>
                            </Link>
                        )}
                        {user.role === UserRole.AUTHOR && (
                            <Link to="/author-studio" title={t('header.authorStudio')}>
                                <Button variant="ghost" className="!p-2"><PenTool className="w-5 h-5"/></Button>
                            </Link>
                        )}
                        <Button variant="outline" size="sm" onClick={onLogout} title={t('header.logout')} className="hidden md:flex">
                            <LogOut className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">{t('header.logout')}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onLogout} title={t('header.logout')} className="md:hidden !p-2">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Link to="/auth" className="hidden md:block">
                            <Button title={t('header.login')}>
                                <LogIn className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">{t('header.login')}</span>
                            </Button>
                        </Link>
                        <Link to="/auth" className="md:hidden">
                            <Button variant="ghost" className="!p-2" title={t('header.login')}>
                                <LogIn className="w-5 h-5" />
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
      </header>
      <main className="flex-grow w-full overflow-x-hidden">
        {children}
      </main>
      <footer className="bg-bgLight border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 text-center text-gray-500 text-sm">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">{t('footer.privacyPolicy')}</Link>
          <p className="mt-2">&copy; {new Date().getFullYear()} Padikkalaam Parakkalaam. {t('footer.rights')}</p>
        </div>
      </footer>

      {/* Mobile Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-bgDark z-[100] p-4 flex flex-col md:hidden">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="font-heading text-xl text-white">{t('header.searchPlaceholder')}</h2>
                <Button variant="ghost" onClick={() => setIsSearchModalOpen(false)} className="!p-2">
                    <X className="w-6 h-6" />
                    <span className="sr-only">{t('header.closeSearch')}</span>
                </Button>
            </div>
            <div className="flex flex-col gap-4">
                <div className="relative flex-1" ref={searchContainerRef}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                        className="block w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                        placeholder={t('header.searchPlaceholder')}
                        type="search" 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => setIsSearchFocused(true)}
                        autoFocus
                    />
                    {isSearchFocused && searchQuery && (
                        <div className="absolute top-full mt-2 w-full bg-bgLight border border-slate-700 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                searchResults.map(story => (
                                    <Link 
                                        key={story.id} 
                                        to={`/story/${story.id}`}
                                        onClick={handleSearchResultClick}
                                        className="flex items-center gap-4 p-3 hover:bg-slate-700/50 transition-colors"
                                    >
                                        <img src={story.coverImage} alt={story.title} className="w-10 h-14 object-cover rounded-sm flex-shrink-0" />
                                        <div className="overflow-hidden">
                                            <p className="font-semibold text-white truncate">{story.title}</p>
                                            <p className="text-xs text-gray-400 truncate">{story.authorName}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="p-4 text-sm text-gray-500 text-center">{t('header.noResults')}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {/* Mobile Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-bgDark z-[100] p-4 flex flex-col md:hidden">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="font-heading text-xl text-white">{t('header.filterByAuthor')}</h2>
                <Button variant="ghost" onClick={() => setIsFilterModalOpen(false)} className="!p-2">
                    <X className="w-6 h-6" />
                    <span className="sr-only">{t('header.closeFilter')}</span>
                </Button>
            </div>
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <select 
                        value={selectedAuthor}
                        onChange={handleAuthorChange}
                        className="appearance-none w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-3 pr-8 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:border-slate-500"
                    >
                        <option value="">{t('header.chooseAuthor')}</option>
                        {activeAuthors.map(author => (
                            <option key={author.id} value={author.id}>{author.username}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles: UserRole[];
  element: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, allowedRoles, element }) => {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Not authorized, redirect to home
  }
  return element;
};

const App = () => {
  // FIX: Initialize user state to null. The onAuthChange listener will populate it.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRightClickModal, setShowRightClickModal] = useState(false);
  
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setShowRightClickModal(true);
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    // Firebase auth listener
    const unsubscribe = StorageService.onAuthChange((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const handleLogin = () => {
    // The onAuthChange listener will handle setting the user
    // This function is mainly to satisfy props for now
    console.log("Login process initiated...");
  };

  const handleLogout = async () => {
    await StorageService.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={currentUser ? <Navigate to="/" replace /> : <AuthPage onLogin={handleLogin} />} />
          <Route path="/story/:storyId" element={<StoryView user={currentUser} />} />
          <Route path="/story/:storyId/episode/:episodeId" element={<StoryView user={currentUser} />} />
          <Route path="/author/:authorId" element={<AuthorPage />} />
          <Route path="/novels" element={<AllNovelsPage />} />
          <Route path="/chapters" element={<AllChaptersPage />} />
          <Route path="/novels/ongoing" element={<AllOngoingNovelsPage />} />
          <Route path="/novels/completed" element={<AllCompletedNovelsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
          {/* Protected Routes */}
          <Route 
            path="/author-studio" 
            element={
              <ProtectedRoute user={currentUser} allowedRoles={[UserRole.AUTHOR]} element={<AuthorStudio user={currentUser as User} />} />
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute user={currentUser} allowedRoles={[UserRole.ADMIN]} element={<AdminDashboard />} />
            } 
          />
           <Route 
            path="/admin/novels" 
            element={
              <ProtectedRoute user={currentUser} allowedRoles={[UserRole.ADMIN]} element={<ManageNovelsPage />} />
            } 
          />
           <Route 
            path="/admin/authors" 
            element={
              <ProtectedRoute user={currentUser} allowedRoles={[UserRole.ADMIN]} element={<ManageAuthorsPage />} />
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute user={currentUser} allowedRoles={[UserRole.ADMIN]} element={<SiteAuthorReportPage />} />
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      {showRightClickModal && (
        <div 
          className="fixed inset-0 bg-black/70 z-[100] flex flex-col items-center justify-center p-4"
          onClick={() => setShowRightClickModal(false)}
        >
          <div className="bg-bgLight p-8 rounded-lg shadow-2xl border border-slate-700 text-center">
             <p className="text-white text-2xl font-semibold">இப்படி பண்றீங்களே மா !</p>
          </div>
        </div>
      )}
    </HashRouter>
  );
};

export default App;
