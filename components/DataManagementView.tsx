import React, { useRef } from 'react';
import { Case } from '../types';
import saveAs from 'file-saver';
import { DownloadIcon, UploadIcon, DatabaseIcon, CheckCircleIcon } from './icons';

interface DataManagementViewProps {
  cases: Case[];
  setCases: (cases: Case[]) => void;
}

const DataManagementView: React.FC<DataManagementViewProps> = ({ cases, setCases }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(cases, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `mirs-law-data-export-${timestamp}.json`);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('An error occurred while exporting your data. Please check the console for details.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File content is not valid text.');
        }
        const importedCases = JSON.parse(text);

        // Basic validation
        if (!Array.isArray(importedCases) || (importedCases.length > 0 && !importedCases[0].id)) {
          throw new Error('Invalid file format. The file does not appear to be a valid case export.');
        }

        const confirmed = window.confirm(
          `Are you sure you want to import ${importedCases.length} cases? This will overwrite all existing data in the app.`
        );

        if (confirmed) {
          setCases(importedCases as Case[]);
          alert('Data imported successfully!');
        }
      } catch (error) {
        console.error('Failed to import data:', error);
        alert(`An error occurred during import: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        // Reset file input value to allow re-importing the same file
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.onerror = () => {
        alert('Failed to read the file.');
    }
    reader.readAsText(file);
  };
  
  const buttonClass = "w-full flex items-center justify-center px-4 py-3 text-lg font-semibold rounded-md transition-colors disabled:opacity-50";

  return (
    <div className="bg-surface p-4 rounded-lg shadow-md space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <DatabaseIcon className="w-8 h-8 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Data Management</h2>
      </div>

      <div className="flex items-center p-4 border border-green-200 bg-green-50 text-green-800 rounded-lg">
          <CheckCircleIcon className="w-8 h-8 mr-3 shrink-0" />
          <div>
              <h4 className="font-bold">Works Offline</h4>
              <p className="text-sm">All case data is automatically saved to your device's local storage. No internet connection is required after the initial load.</p>
          </div>
      </div>

      <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-primary mb-2">Export Data</h3>
        <p className="text-sm text-textSecondary mb-4">
          Save a backup of all your case data to a file on your device. This is useful for transferring data or keeping a safe copy.
        </p>
        <button
          onClick={handleExport}
          disabled={cases.length === 0}
          className={`${buttonClass} bg-primary text-white hover:bg-indigo-900`}
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          Export All Data
        </button>
      </div>

      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold text-accent mb-2">Import Data</h3>
        <p className="text-sm text-textSecondary mb-4">
          Load data from a previously exported file. <span className="font-bold">Warning:</span> This will overwrite all current data in the application.
        </p>
        <button
          onClick={handleImportClick}
          className={`${buttonClass} bg-accent text-white hover:bg-red-800`}
        >
          <UploadIcon className="w-5 h-5 mr-2" />
          Import from File
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/json"
          className="hidden"
        />
      </div>
    </div>
  );
};

export default DataManagementView;