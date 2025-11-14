
import React, { useState, useMemo, useCallback } from 'react';
import { Case, View } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CalendarIcon, PlusCircleIcon, DocumentTextIcon, SearchIcon, BriefcaseIcon, DatabaseIcon } from './components/icons';
import CalendarView from './components/CalendarView';
import CaseForm from './components/CaseForm';
import DraftingTool from './components/DraftingTool';
import SearchView from './components/SearchView';
import DataManagementView from './components/DataManagementView';

const App: React.FC = () => {
  const [cases, setCases] = useLocalStorage<Case[]>('cases', []);
  const [currentView, setCurrentView] = useState<View>('calendar');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [initialSearchFilter, setInitialSearchFilter] = useState<'All' | 'Pending' | 'Decided'>('All');

  const casesByDate = useMemo(() => {
    const map = new Map<string, Case[]>();
    cases.forEach(c => {
      if (c.nextDate && c.status === 'Pending') {
        const dateStr = new Date(c.nextDate).toISOString().split('T')[0];
        if (!map.has(dateStr)) {
          map.set(dateStr, []);
        }
        map.get(dateStr)?.push(c);
      }
    });
    return map;
  }, [cases]);
  
  const caseStats = useMemo(() => ({
    total: cases.length,
    pending: cases.filter(c => c.status === 'Pending').length,
    decided: cases.filter(c => c.status === 'Decided').length,
  }), [cases]);

  const handleShowCases = useCallback((status: 'All' | 'Pending' | 'Decided') => {
    setInitialSearchFilter(status);
    setCurrentView('search');
  }, []);

  const handleSaveCase = useCallback((caseData: Case) => {
    const existingIndex = cases.findIndex(c => c.id === caseData.id);
    if (existingIndex > -1) {
      const updatedCases = [...cases];
      updatedCases[existingIndex] = caseData;
      setCases(updatedCases);
    } else {
      setCases(prevCases => [...prevCases, caseData]);
    }
    setSelectedCase(null);
    setCurrentView('calendar');
  }, [cases, setCases]);

  const handleEditCase = (caseData: Case) => {
    setSelectedCase(caseData);
    setCurrentView('add_case');
  };

  const handleAddNew = () => {
    setSelectedCase(null);
    setCurrentView('add_case');
  };

  const handleNavClick = (view: View) => {
    setSelectedCase(null);
    if (view === 'search') {
      handleShowCases('All');
    } else {
      setCurrentView(view);
    }
  };
  
  const renderView = () => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView casesByDate={casesByDate} onEditCase={handleEditCase} stats={caseStats} onShowCases={handleShowCases} />;
      case 'add_case':
        return <CaseForm existingCase={selectedCase} onSave={handleSaveCase} onCancel={() => { setSelectedCase(null); setCurrentView('calendar'); }} />;
      case 'drafting':
        return <DraftingTool />;
      case 'search':
        return <SearchView cases={cases} onEditCase={handleEditCase} initialFilterStatus={initialSearchFilter} />;
      case 'data':
        return <DataManagementView cases={cases} setCases={setCases} />;
      default:
        return <CalendarView casesByDate={casesByDate} onEditCase={handleEditCase} stats={caseStats} onShowCases={handleShowCases} />;
    }
  };

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => handleNavClick(view)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${currentView === view ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen font-sans text-textPrimary flex flex-col md:max-w-4xl md:mx-auto md:shadow-2xl">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-10 flex items-center space-x-3">
        <BriefcaseIcon className="w-8 h-8"/>
        <h1 className="text-2xl font-bold">Mir's Law Case Manager</h1>
      </header>
      
      <main className="flex-grow p-2 sm:p-4 mb-16">
        {renderView()}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 shadow-t-md z-10 md:max-w-4xl md:mx-auto md:left-auto md:right-auto w-full">
        <nav className="flex justify-around items-center h-16">
          <NavItem view="calendar" icon={<CalendarIcon className="w-6 h-6 mb-1"/>} label="Calendar" />
          <NavItem view="search" icon={<SearchIcon className="w-6 h-6 mb-1"/>} label="Search" />
          <button onClick={handleAddNew} className="flex flex-col items-center justify-center text-gray-500 hover:text-primary">
              <PlusCircleIcon className="w-8 h-8 mb-1 text-accent"/>
              <span className="text-xs">Add Case</span>
          </button>
          <NavItem view="drafting" icon={<DocumentTextIcon className="w-6 h-6 mb-1"/>} label="Drafting" />
          <NavItem view="data" icon={<DatabaseIcon className="w-6 h-6 mb-1"/>} label="Data" />
        </nav>
      </footer>
    </div>
  );
};

export default App;