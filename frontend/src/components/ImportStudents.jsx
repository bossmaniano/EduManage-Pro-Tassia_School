import { useState } from 'react';
import { Upload, FileSpreadsheet, FileText, Check, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

// Get API base URL from environment (supports both local and production)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function ImportStudents({ classes = [], onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'docx'].includes(ext)) {
        setError('Please select an .xlsx or .docx file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setPreviewData(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use direct fetch for FormData - don't use apiFetch as it stringifies the body
      const res = await fetch(`${API_BASE_URL}/api/students/import/parse`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to parse file');
        return;
      }

      setPreviewData(data);
    } catch (err) {
      setError('Error parsing file: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData?.valid_students?.length) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await apiFetch('/api/students/import/process', {
        method: 'POST',
        body: {
          students: previewData.valid_students,
          classId: selectedClass || null
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to import students');
        return;
      }

      setResult(data);
      if (onSuccess) {
        onSuccess(data.created_students);
      }
    } catch (err) {
      setError('Error importing students: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setResult(null);
    setError(null);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-gray-400" />;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx') return <FileSpreadsheet className="w-12 h-12 text-green-600" />;
    if (ext === 'docx') return <FileText className="w-12 h-12 text-blue-600" />;
    return <Upload className="w-12 h-12 text-gray-400" />;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">Bulk Import Students</h2>

      {/* File Upload Section */}
      {!previewData && !result && (
        <>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            <input
              type="file"
              accept=".xlsx,.docx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {getFileIcon()}
              <p className="mt-2 text-gray-600">
                {file ? file.name : 'Click to upload .xlsx or .docx file'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: Excel (.xlsx), Word (.docx)
              </p>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={!file || parsing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {parsing ? 'Parsing file...' : 'Parse File'}
          </button>
        </>
      )}

      {/* Preview Section */}
      {previewData && !result && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <h3 className="font-semibold mb-2">File Analysis</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{previewData.total_extracted}</p>
                <p className="text-gray-600">Total Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{previewData.valid_students?.length || 0}</p>
                <p className="text-gray-600">Valid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{previewData.duplicates?.length || 0}</p>
                <p className="text-gray-600">Duplicates</p>
              </div>
            </div>
            {previewData.invalid_count > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                {previewData.invalid_count} invalid entries were skipped
              </p>
            )}
          </div>

          {previewData.duplicates?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <h4 className="font-semibold text-yellow-800 mb-1">Duplicate Names (already in system):</h4>
              <p className="text-sm text-yellow-700">{previewData.duplicates.join(', ')}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Class (Optional)
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">No class assigned</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 max-h-48 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Students to Import:</th>
                </tr>
              </thead>
              <tbody>
                {(previewData.valid_students || []).map((name, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-1">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={processing || !(previewData.valid_students?.length)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {processing ? 'Importing...' : `Import ${previewData.valid_students?.length || 0} Students`}
            </button>
          </div>
        </>
      )}

      {/* Result Section */}
      {result && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Import Successful!</h3>
          <p className="text-gray-600 mb-4">
            Successfully imported {result.created_count} students
          </p>
          
          {result.errors?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 text-left">
              <p className="font-semibold text-yellow-800">Some errors occurred:</p>
              <ul className="text-sm text-yellow-700 list-disc list-inside">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleReset}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
          >
            Import More Students
          </button>
        </div>
      )}
    </div>
  );
}
