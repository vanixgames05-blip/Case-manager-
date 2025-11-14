
import React, { useState, useMemo } from 'react';
import { Case } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, BriefcaseIcon, DocumentTextIcon, CheckCircleIcon } from './icons';

interface CalendarViewProps {
  casesByDate: Map<string, Case[]>;
  onEditCase: (caseData: Case) => void;
  stats: {
    total: number;
    pending: number;
    decided: number;
  };
  onShowCases: (status: 'All' | 'Pending' | 'Decided') => void;
}

const CaseCard: React.FC<{ caseData: Case; onEdit: (caseData: Case) => void; }> = ({ caseData, onEdit }) => (
    <div className="bg-white p-3 rounded-lg shadow border border-gray-200 mb-3 transition-shadow hover:shadow-md">
        <div className="flex justify-between items-start">
            <div className="flex-grow mr-2 overflow-hidden">
                <h4 className="font-bold text-primary mb-2 truncate">{caseData.title}</h4>
                <div className="text-sm text-textSecondary space-y-0.5">
                    <p>{caseData.caseNumber}/{caseData.year}</p>
                    <p>{caseData.courtName}</p>
                    <p>{caseData.caseType || caseData.nature}</p>
                    {caseData.representing && <p>{caseData.representing}</p>}
                </div>
            </div>
            <div className="flex flex-col items-end space-y-2 shrink-0">
                <button onClick={() => onEdit(caseData)} className="text-xs bg-secondary text-primary font-semibold px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors whitespace-nowrap">
                    View/Edit
                </button>
            </div>
        </div>
    </div>
);

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className={`flex items-center p-3 bg-white rounded-lg shadow border-l-4 ${colorClass}`}>
      {icon}
      <div className="ml-3">
        <p className="text-sm font-medium text-textSecondary">{title}</p>
        <p className="text-2xl font-bold text-textPrimary">{value}</p>
      </div>
    </div>
);

const CalendarView: React.FC<CalendarViewProps> = ({ casesByDate, onEditCase, stats, onShowCases }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay(); // 0 for Sunday

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const selectedDateString = selectedDate ? selectedDate.toISOString().split('T')[0] : null;
  const casesForSelectedDate = selectedDateString ? casesByDate.get(selectedDateString) || [] : [];

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startingDay; i++) {
        days.push(<div key={`empty-start-${i}`} className="border-r border-b border-gray-200"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayCasesCount = casesByDate.get(dateStr)?.length || 0;
        const isSelected = selectedDate?.toDateString() === dayDate.toDateString();
        const isToday = new Date().toDateString() === dayDate.toDateString();

        days.push(
            <div
                key={i}
                onClick={() => setSelectedDate(dayDate)}
                className={`p-1.5 border-r border-b border-gray-200 text-center cursor-pointer transition-colors ${isSelected ? 'bg-primary text-white' : isToday ? 'bg-secondary' : 'hover:bg-gray-100'}`}
            >
                <div className="relative">
                    <span>{i}</span>
                    {dayCasesCount > 0 && (
                        <span className={`absolute -top-1 -right-1 flex items-center justify-center text-xs w-4 h-4 rounded-full ${isSelected ? 'bg-white text-primary' : 'bg-accent text-white'}`}>
                            {dayCasesCount}
                        </span>
                    )}
                </div>
            </div>
        );
    }
    // Fill remaining cells for a full 6-week grid if needed
    const totalCells = days.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        days.push(<div key={`empty-end-${i}`} className="border-r border-b border-gray-200"></div>);
    }

    return days;
  }, [currentDate, selectedDate, casesByDate]);
  
  const cardWrapperClass = "cursor-pointer rounded-lg transition-transform duration-200 hover:scale-105";

  return (
    <div className="space-y-6">
        <div>
            <h2 className="text-xl font-bold text-primary mb-3">Case Load Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div onClick={() => onShowCases('All')} className={cardWrapperClass}>
                    <StatCard 
                        title="Total Cases" 
                        value={stats.total} 
                        icon={<BriefcaseIcon className="w-8 h-8 text-primary" />} 
                        colorClass="border-primary" 
                    />
                </div>
                <div onClick={() => onShowCases('Pending')} className={cardWrapperClass}>
                    <StatCard 
                        title="Pending Cases" 
                        value={stats.pending} 
                        icon={<DocumentTextIcon className="w-8 h-8 text-yellow-500" />} 
                        colorClass="border-yellow-500" 
                    />
                </div>
                <div onClick={() => onShowCases('Decided')} className={cardWrapperClass}>
                    <StatCard 
                        title="Disposed Cases" 
                        value={stats.decided} 
                        icon={<CheckCircleIcon className="w-8 h-8 text-green-500" />} 
                        colorClass="border-green-500" 
                    />
                </div>
            </div>
        </div>

        <div className="bg-surface p-4 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200">
                <ChevronLeftIcon />
                </button>
                <h2 className="text-xl font-bold text-primary">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200">
                <ChevronRightIcon />
                </button>
            </div>
            
            <div className="grid grid-cols-7 text-sm font-semibold text-center text-textSecondary border-t border-l border-gray-200">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 border-r border-b border-gray-200 bg-gray-50">{day}</div>
                ))}
                {calendarDays}
            </div>

            <div className="mt-6">
                <h3 className="text-lg font-bold text-primary border-b-2 border-secondary pb-2 mb-4">
                Cases for {selectedDate ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'today'}
                </h3>
                {casesForSelectedDate.length > 0 ? (
                casesForSelectedDate.map(caseData => (
                    <CaseCard key={caseData.id} caseData={caseData} onEdit={onEditCase} />
                ))
                ) : (
                <p className="text-textSecondary text-center py-4">No cases scheduled for this date.</p>
                )}
            </div>
        </div>
    </div>
  );
};

export default CalendarView;