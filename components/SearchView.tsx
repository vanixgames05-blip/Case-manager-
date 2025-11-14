
import React, { useState, useMemo } from 'react';
import { Case } from '../types';

interface SearchViewProps {
  cases: Case[];
  onEditCase: (caseData: Case) => void;
  initialFilterStatus?: 'All' | 'Pending' | 'Decided';
}

const CaseRow: React.FC<{ caseData: Case; onEdit: (caseData: Case) => void; }> = ({ caseData, onEdit }) => (
    <div className="bg-white p-3 rounded-lg shadow border border-gray-200 mb-3 transition-shadow hover:shadow-md">
        <div className="grid grid-cols-3 gap-2 items-center">
            <div className="col-span-2">
                <p className="font-bold text-primary truncate">{caseData.title}</p>
                {caseData.caseType && <p className="text-sm font-medium text-gray-600 truncate">{caseData.caseType}</p>}
                <p className="text-sm text-textSecondary">{caseData.courtName}</p>
                {caseData.representing && <p className="text-xs text-textSecondary"><span className="font-semibold">Representing:</span> {caseData.representing}</p>}
                <p className="text-xs text-textSecondary mt-1">Next Date: {caseData.nextDate ? new Date(caseData.nextDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="flex flex-col items-end space-y-2">
                <button onClick={() => onEdit(caseData)} className="w-full text-xs bg-secondary text-primary font-semibold px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors">
                    View/Edit
                </button>
            </div>
        </div>
    </div>
);


const SearchView: React.FC<SearchViewProps> = ({ cases, onEditCase, initialFilterStatus = 'All' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Decided'>(initialFilterStatus);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        c.title.toLowerCase().includes(term) ||
        c.caseNumber.toLowerCase().includes(term) ||
        c.courtName.toLowerCase().includes(term) ||
        (c.caseType && c.caseType.toLowerCase().includes(term)) ||
        (c.representing && c.representing.toLowerCase().includes(term));
      
      const matchesStatus = 
        filterStatus === 'All' || c.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    }).sort((a,b) => new Date(b.nextDate).getTime() - new Date(a.nextDate).getTime());
  }, [cases, searchTerm, filterStatus]);

  const inputClass = "w-full px-3 py-2 bg-white border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary";

  return (
    <div className="bg-surface p-4 rounded-lg shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-primary">Search & Filter Cases</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">Search by Title, No., Court, Type, Side</label>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">Filter by Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Pending' | 'Decided')}
            className={inputClass}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Decided">Decided</option>
          </select>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <h3 className="text-lg font-semibold text-primary mb-2">
            Results ({filteredCases.length})
        </h3>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
        {filteredCases.length > 0 ? (
          filteredCases.map(c => <CaseRow key={c.id} caseData={c} onEdit={onEditCase} />)
        ) : (
          <p className="text-center text-textSecondary py-6">No cases match your criteria.</p>
        )}
        </div>
      </div>
    </div>
  );
};

export default SearchView;
