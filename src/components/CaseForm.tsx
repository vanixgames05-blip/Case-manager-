import React, { useState, useEffect, useCallback } from 'react';
import { Case, CaseNature, CaseHistory } from '../types';
import { predictNextStage } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { SparklesIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface CaseFormProps {
  existingCase: Case | null;
  onSave: (caseData: Case) => void;
  onCancel: () => void;
}

const CaseForm: React.FC<CaseFormProps> = ({ existingCase, onSave, onCancel }) => {
  const [caseData, setCaseData] = useState<Case>(
    existingCase || {
      id: uuidv4(),
      title: '',
      caseNumber: '',
      year: new Date().getFullYear(),
      nature: CaseNature.CIVIL,
      caseType: '',
      representing: '',
      courtName: '',
      currentStage: '',
      diaryNotes: '',
      nextDate: '',
      history: [],
      status: 'Pending',
    }
  );
  
  const [predictedStage, setPredictedStage] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [stageOfHearing, setStageOfHearing] = useState(existingCase?.currentStage || 'Case Initiation');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCaseData(prev => ({ ...prev, [name]: value }));
  };

  const handlePredictStage = useCallback(async () => {
    if (caseData.diaryNotes.trim().length > 10) { // Only predict for meaningful text
      setIsPredicting(true);
      setPredictedStage(''); // Clear previous prediction
      const prediction = await predictNextStage(caseData);
      setPredictedStage(prediction);
      setIsPredicting(false);
    }
  }, [caseData]);
  
  useEffect(() => {
    if (!caseData.diaryNotes.trim()) return;

    const identifier = setTimeout(() => {
        handlePredictStage();
    }, 1500); // Debounce for 1.5s

    return () => {
        clearTimeout(identifier);
    };
  }, [caseData.diaryNotes, handlePredictStage]);


  const applyPredictedStage = () => {
    if (predictedStage && predictedStage !== "Could not predict next stage.") {
      setCaseData(prev => ({ ...prev, currentStage: predictedStage }));
      setPredictedStage('');
    }
  };
  
  const handleAddHistory = () => {
    if (caseData.diaryNotes.trim() === '') return;
    const today = new Date();
    const historyEntry: CaseHistory = {
        date: today.toISOString().split('T')[0],
        proceedings: caseData.diaryNotes,
        stage: stageOfHearing,
        nextDate: caseData.nextDate,
    };
    setCaseData(prev => ({...prev, history: [historyEntry, ...prev.history], diaryNotes: ''}));
    setStageOfHearing(caseData.currentStage); // The new currentStage becomes the stage for the next hearing
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(caseData);
  };
  
  const inputClass = "w-full px-3 py-2 bg-white border border-gray-400 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary";
  const labelClass = "block text-sm font-medium text-textSecondary mb-1";
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-surface p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-primary border-b-2 border-secondary pb-2">
        {existingCase ? 'Edit Case Details' : 'Add New Case'}
      </h2>
      
      <div>
        <label className={labelClass} htmlFor="title">Case Title</label>
        <input type="text" name="title" value={caseData.title} onChange={handleChange} className={inputClass} required />
      </div>

      <div>
        <label className={labelClass} htmlFor="caseType">Case Type / Nature of Suit</label>
        <input type="text" name="caseType" placeholder="e.g., Suit for Specific Performance, Bail Application" value={caseData.caseType || ''} onChange={handleChange} className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="representing">Representing Side</label>
        <input type="text" name="representing" placeholder="e.g., Plaintiff, Defendant, Petitioner" value={caseData.representing || ''} onChange={handleChange} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="caseNumber">Case Number</label>
          <input type="text" name="caseNumber" value={caseData.caseNumber} onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="year">Year</label>
          <input type="number" name="year" value={caseData.year} onChange={handleChange} className={inputClass} required />
        </div>
      </div>
      
      <div>
          <label className={labelClass} htmlFor="courtName">Court Name</label>
          <input type="text" name="courtName" value={caseData.courtName} onChange={handleChange} className={inputClass} required />
      </div>

      <div>
        <label className={labelClass}>Case Nature</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input type="radio" name="nature" value={CaseNature.CIVIL} checked={caseData.nature === CaseNature.CIVIL} onChange={handleChange} className="mr-2 text-primary focus:ring-primary" />
            Civil
          </label>
          <label className="flex items-center">
            <input type="radio" name="nature" value={CaseNature.CRIMINAL} checked={caseData.nature === CaseNature.CRIMINAL} onChange={handleChange} className="mr-2 text-primary focus:ring-primary" />
            Criminal
          </label>
        </div>
      </div>
      
      {caseData.nature === CaseNature.CRIMINAL && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-red-200 rounded-md bg-red-50">
          <div>
            <label className={labelClass} htmlFor="firNumber">FIR Number</label>
            <input type="text" name="firNumber" value={caseData.firNumber || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="policeStation">Police Station</label>
            <input type="text" name="policeStation" value={caseData.policeStation || ''} onChange={handleChange} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="offence">Type of Offence / Section of Law</label>
            <input 
              type="text"
              name="offence"
              value={caseData.offence || ''}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g., U/S 302 PPC, Sec 420 PPC"
            />
          </div>
        </div>
      )}
      
      <div>
        <label className={labelClass} htmlFor="diaryNotes">Today's Proceedings / Diary Entry</label>
        <textarea name="diaryNotes" value={caseData.diaryNotes} onChange={handleChange} onPaste={handlePredictStage} className={inputClass} rows={3} placeholder="Record what happened in court today... AI will predict the next stage automatically."></textarea>
        <div className="mt-2 flex flex-wrap items-center gap-2 min-h-[28px]">
            {isPredicting && (
                 <div className="flex items-center text-sm text-yellow-800">
                    <SparklesIcon className="w-4 h-4 mr-1 animate-pulse"/>
                    <span>AI is predicting the next stage...</span>
                </div>
            )}
            {predictedStage && !isPredicting && (
                <div className="flex items-center text-sm p-1 rounded-md bg-gray-100">
                    <span className="text-gray-700 mr-2 font-medium">{`Suggestion: "${predictedStage}"`}</span>
                    <button type="button" onClick={applyPredictedStage} className="p-1 text-green-600 hover:text-green-800" aria-label="Accept suggestion"><CheckCircleIcon className="w-5 h-5"/></button>
                    <button type="button" onClick={() => setPredictedStage('')} className="p-1 text-red-500 hover:text-red-700" aria-label="Reject suggestion"><XCircleIcon className="w-5 h-5"/></button>
                </div>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="nextDate">Next Date</label>
            <input type="date" name="nextDate" value={caseData.nextDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="status">Case Status</label>
            <select name="status" value={caseData.status} onChange={handleChange} className={inputClass}>
                <option value="Pending">Pending</option>
                <option value="Decided">Decided</option>
            </select>
          </div>
      </div>
      <div>
        <label className={labelClass}>Next Stage / Purpose</label>
        <div className="flex items-center p-2 bg-gray-50 border rounded-md min-h-[42px]">
            <p className="text-sm text-textPrimary font-medium">{caseData.currentStage || 'AI will predict based on diary entry'}</p>
        </div>
      </div>

       {existingCase && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-bold text-primary">Case History</h3>
          <p className="text-sm text-textSecondary">
            After entering today's proceedings in the diary above, click "Add to History" to create a permanent record. This uses the diary entry and the stage that was set for today's hearing.
          </p>
          <div className="space-y-2">
            <button type="button" onClick={handleAddHistory} disabled={!caseData.diaryNotes} className="text-sm bg-secondary text-primary font-semibold px-3 py-1 rounded hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Add to History</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {caseData.history.length > 0 ? caseData.history.map((h, i) => (
              <div key={i} className="text-sm p-2 bg-gray-50 border rounded-md">
                <p><span className="font-semibold">{new Date(h.date).toLocaleDateString()}:</span> {h.proceedings}</p>
                <p className="text-xs text-gray-500">Stage: {h.stage} | Next Date: {h.nextDate ? new Date(h.nextDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            )) : <p className="text-textSecondary text-sm">No history recorded.</p>}
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-900">Save Case</button>
      </div>
    </form>
  );
};

export default CaseForm;