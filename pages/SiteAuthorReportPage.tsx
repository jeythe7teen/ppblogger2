import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StorageService } from '../services/store';
import { User, Story, Episode } from '../types';
import { Button, Card } from '../components/UI';
import { ArrowLeft, BarChart2, Download, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, FileDown, AlertTriangle } from 'lucide-react';
import { useTranslations } from '../LanguageContext';
import { translations } from '../translations';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportRow {
  storyId: string;
  storyName: string;
  authorId: string;
  authorName: string;
  chapterNumber: number;
  chapterId: string;
  chapterTitle: string;
  chapterViews: number;
  chapterLikes: number;
  chapterComments: number;
  episodeStatus: 'published' | 'draft';
  storyStatus: 'published' | 'draft';
  totalStoryViews: number;
  totalStoryLikes: number;
  totalStoryComments: number;
  storyCreatedAt: number;
}

type SortKey = keyof ReportRow;

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}> = ({ label, options, selectedValues, onChange, t }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onChange(options.map(o => o.value));
        } else {
            onChange([]);
        }
    };
    
    const handleOptionChange = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };
    
    const getButtonLabel = () => {
        if (selectedValues.length === options.length) return t('siteAuthorReport.allSelected');
        if (selectedValues.length === 0) return t('siteAuthorReport.noneSelected');
        return t('siteAuthorReport.countSelected', { count: selectedValues.length });
    };

    return (
        <div className="relative" ref={ref}>
            <label className="text-sm font-medium text-gray-400 block mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 px-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary flex justify-between items-center"
            >
                <span>{getButtonLabel()}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-bgLight border border-slate-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    <div className="p-2">
                        <label className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 bg-slate-800 border-slate-600 text-primary focus:ring-primary"
                                checked={selectedValues.length === options.length}
                                onChange={handleSelectAll}
                            />
                            <span className="font-semibold">{t('siteAuthorReport.selectAll')}</span>
                        </label>
                    </div>
                    <div className="border-t border-slate-700">
                        {options.map(option => (
                            <label key={option.value} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-4 w-4 bg-slate-800 border-slate-600 text-primary focus:ring-primary"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => handleOptionChange(option.value)}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


export const SiteAuthorReportPage: React.FC = () => {
  const { t, language } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'storyCreatedAt', direction: 'descending' });

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const allStories = await StorageService.getStories();
            const allUsers = await StorageService.getUsers();
            const allAuthors = allUsers.filter(u => u.role === 'AUTHOR');

            setAuthors(allAuthors);
            setStories(allStories);

            setSelectedAuthors(allAuthors.map(a => a.id));
            setSelectedStories(allStories.map(s => s.id));

            const flattenedData: ReportRow[] = [];
            allStories.forEach(story => {
              const author = allAuthors.find(a => a.id === story.authorId);
              const totalStoryLikes = story.episodes.reduce((sum, ep) => sum + ep.likes.length, 0);
              const totalStoryComments = story.episodes.reduce((sum, ep) => sum + ep.comments.length, 0);

              if (story.episodes.length === 0) {
                flattenedData.push({
                  storyId: story.id, storyName: story.title, authorId: story.authorId, authorName: author?.username || 'N/A', chapterNumber: 0,
                  chapterId: 'N/A', chapterTitle: 'No Chapters Yet', chapterViews: 0, chapterLikes: 0, chapterComments: 0,
                  episodeStatus: 'draft', storyStatus: story.status, totalStoryViews: story.views, totalStoryLikes, totalStoryComments, storyCreatedAt: story.createdAt,
                });
              } else {
                story.episodes.forEach((episode, index) => {
                  flattenedData.push({
                    storyId: story.id, storyName: story.title, authorId: story.authorId, authorName: author?.username || 'N/A', chapterNumber: index + 1,
                    chapterId: episode.id, chapterTitle: episode.title, chapterViews: episode.views, chapterLikes: episode.likes.length, chapterComments: episode.comments.length,
                    episodeStatus: episode.status, storyStatus: story.status, totalStoryViews: story.views, totalStoryLikes, totalStoryComments, storyCreatedAt: story.createdAt,
                  });
                });
              }
            });
            setReportData(flattenedData);
        } catch (err) {
            console.error("Failed to fetch report data:", err);
            setError(t('errors.dataFetchFailed'));
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [t]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let sortableData = [...reportData];

    sortableData = sortableData.filter(
        item => selectedAuthors.includes(item.authorId) && selectedStories.includes(item.storyId)
    );

    sortableData.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'ascending' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return sortableData;
  }, [reportData, selectedAuthors, selectedStories, sortConfig]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const currentTranslations = translations[language] || translations.en;
    const tableHeaders = currentTranslations.siteAuthorReport.tableHeaders;
    const tableColumn = Object.values(tableHeaders);
    
    const tableRows: any[] = [];

    filteredAndSortedData.forEach(item => {
        const rowData = [
            item.storyName,
            item.authorName,
            item.chapterNumber,
            item.chapterViews,
            item.chapterLikes,
            item.chapterComments,
            item.episodeStatus,
            item.storyStatus,
            `V:${item.totalStoryViews} L:${item.totalStoryLikes} C:${item.totalStoryComments}`,
        ];
        tableRows.push(rowData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
        },
        headStyles: {
            fillColor: [22, 163, 74]
        }
    });
    doc.text("Site Author Report", 14, 15);
    doc.save("padikkalaam-parakkalaam-report.pdf");
  };

  const handleDownloadCsv = () => {
      const currentTranslations = translations[language] || translations.en;
      const tableHeaders = currentTranslations.siteAuthorReport.tableHeaders;
      const headers = Object.values(tableHeaders).map(h => `"${h}"`);
      
      let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
      
      filteredAndSortedData.forEach(item => {
          const row = [
              `"${item.storyName.replace(/"/g, '""')}"`,
              `"${item.authorName.replace(/"/g, '""')}"`,
              item.chapterNumber,
              item.chapterViews,
              item.chapterLikes,
              item.chapterComments,
              item.episodeStatus,
              item.storyStatus,
              `"V:${item.totalStoryViews} L:${item.totalStoryLikes} C:${item.totalStoryComments}"`,
          ];
          csvContent += row.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "padikkalaam-parakkalaam-report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-2 text-gray-500" />;
    if (sortConfig.direction === 'ascending') return <ArrowUp className="w-3 h-3 ml-2" />;
    return <ArrowDown className="w-3 h-3 ml-2" />;
  };
  
  const renderContent = () => {
      if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
      }
       if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-red-400 p-8">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p className="font-bold">{error}</p>
            </div>
        );
      }
      
      const currentTranslations = translations[language] || translations.en;
      const tableHeaderKeys = Object.keys(currentTranslations.siteAuthorReport.tableHeaders) as Array<keyof typeof currentTranslations.siteAuthorReport.tableHeaders>;

      return (
        <div className="overflow-x-auto bg-bgLight rounded-lg border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-800">
                <tr>
                {tableHeaderKeys.map((key) => (
                    <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700" onClick={() => requestSort(key as SortKey)}>
                        <div className="flex items-center">
                            {currentTranslations.siteAuthorReport.tableHeaders[key]}
                            {getSortIcon(key as SortKey)}
                        </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
                {filteredAndSortedData.map((item, index) => (
                <tr key={`${item.storyId}-${item.chapterId}-${index}`} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-white">{item.storyName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.authorName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">{item.chapterNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">{item.chapterViews}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">{item.chapterLikes}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">{item.chapterComments}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.episodeStatus === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{t(item.episodeStatus)}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-center"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.storyStatus === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{t(item.storyStatus)}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">V:{item.totalStoryViews} L:{item.totalStoryLikes} C:{item.totalStoryComments}</td>
                </tr>
                ))}
            </tbody>
            </table>
            {filteredAndSortedData.length === 0 && (
                <p className="p-8 text-center text-gray-500">{t('siteAuthorReport.noData')}</p>
            )}
        </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" icon={ArrowLeft} className="mr-2">{t('siteAuthorReport.backToDashboard')}</Button>
          </Link>
          <BarChart2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-bold text-white">{t('siteAuthorReport.title')}</h1>
        </div>
        <div className="flex gap-2">
            <Button icon={FileDown} onClick={handleDownloadCsv}>{t('siteAuthorReport.downloadAsCsv')}</Button>
            <Button icon={Download} onClick={handleDownloadPdf}>{t('siteAuthorReport.downloadAsPdf')}</Button>
        </div>
      </div>
      
      <Card className="p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MultiSelectDropdown 
                label={t('siteAuthorReport.filterByAuthor')}
                options={authors.map(a => ({ value: a.id, label: a.username }))}
                selectedValues={selectedAuthors}
                onChange={setSelectedAuthors}
                t={t}
            />
            <MultiSelectDropdown 
                label={t('siteAuthorReport.filterByStory')}
                options={stories.map(s => ({ value: s.id, label: s.title }))}
                selectedValues={selectedStories}
                onChange={setSelectedStories}
                t={t}
            />
        </div>
      </Card>

      {renderContent()}
    </div>
  );
};
