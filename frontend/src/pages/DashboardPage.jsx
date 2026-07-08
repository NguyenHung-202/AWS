import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPresignedUrl, uploadEssay, createEssay, getEssays } from '../services/api';
import { 
  Upload, Loader, CheckCircle2, AlertTriangle, Clock, 
  LogOut, RefreshCw, FileText, ArrowRight, User 
} from 'lucide-react';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [essays, setEssays] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Polling interval ref
  const pollingRef = useRef(null);

  useEffect(() => {
    loadEssays();
    return () => stopPolling();
  }, []);

  // Poll if any essay is in PROCESSING state
  useEffect(() => {
    const hasProcessing = essays.some(e => e.status === 'PROCESSING');
    if (hasProcessing) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [essays]);

  const startPolling = () => {
    if (!pollingRef.current) {
      pollingRef.current = setInterval(() => {
        refreshEssaysQuietly();
      }, 5000);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const loadEssays = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getEssays();
      // Sort essays by createdAt descending
      const sorted = (data || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEssays(sorted);
    } catch (err) {
      setError('Failed to fetch essays. Please verify that your local backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshEssaysQuietly = async () => {
    try {
      const data = await getEssays();
      const sorted = (data || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setEssays(sorted);
    } catch (err) {
      console.error('Quiet refresh failed:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        setError('Please select a valid plain text (.txt) file');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
      setSuccessMsg('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload first.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccessMsg('');

      // 1. Get presigned URL from API Gateway
      const { uploadUrl, fileKey } = await getPresignedUrl(selectedFile.name);

      // 2. Upload the file binary directly to S3
      await uploadEssay(selectedFile, uploadUrl);

      // 3. Register the essay details in DynamoDB and start the job starter trigger
      await createEssay(selectedFile.name, fileKey);

      setSuccessMsg('Essay uploaded successfully! Analysis started.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Reload history
      await loadEssays();
    } catch (err) {
      setError(err.message || 'An error occurred during file upload.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
        setError('Please drop a valid plain text (.txt) file');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
      setSuccessMsg('');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            Analyzing
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Scored
          </span>
        );
      case 'FAILED':
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 font-sans relative pb-12 overflow-x-hidden">
      {/* Decorative Blur Spheres */}
      <div className="glow-purple top-10 right-10"></div>
      <div className="glow-blue bottom-10 left-10"></div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-[rgba(255,255,255,0.06)] shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center shadow-md">
              <FileText className="w-5.5 h-5.5 text-white" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white">
              EssayScorer<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/40 border border-[rgba(255,255,255,0.06)] rounded-xl py-1.5 px-3">
              <User className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-gray-300">{user?.email || 'testuser@gmail.com'}</span>
            </div>

            <button 
              onClick={logout}
              className="flex items-center justify-center gap-2 py-2 px-3 sm:px-4 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl transition duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Upload Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-[rgba(255,255,255,0.06)]">
              <h2 className="text-lg font-bold text-white font-display mb-2">Upload Essay</h2>
              <p className="text-xs text-gray-400 mb-5">
                Submit an essay in .txt format to extract text and trigger the evaluation pipeline.
              </p>

              {/* Success / Error Alerts */}
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-xs mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-3 rounded-lg text-xs mb-4 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Drag/Drop Box */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-brand-500 hover:bg-brand-500/5 rounded-xl p-8 text-center transition duration-300 cursor-pointer group"
              >
                <input
                  type="file"
                  accept=".txt"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="bg-slate-800/50 group-hover:bg-brand-500/10 rounded-full p-4 w-fit mx-auto mb-3 transition duration-300">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-brand-400" />
                </div>
                
                <p className="text-sm font-semibold text-gray-300 group-hover:text-brand-300">
                  {selectedFile ? selectedFile.name : 'Select or drop file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Plain text (.txt) files only
                </p>
              </div>

              {/* File Info & Upload Action Button */}
              {selectedFile && (
                <div className="mt-4 p-3 bg-slate-800/30 border border-[rgba(255,255,255,0.06)] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="font-medium truncate text-gray-300">{selectedFile.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full mt-5 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-950/20 text-sm"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing Essay...
                  </>
                ) : (
                  'Submit for Assessment'
                )}
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Essay History List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Evaluation Records</h2>
                  <p className="text-xs text-gray-400">View scores and feedback logs</p>
                </div>
                <button 
                  onClick={loadEssays}
                  disabled={loading}
                  className="p-2 bg-slate-800/50 hover:bg-slate-700/50 border border-[rgba(255,255,255,0.08)] rounded-xl text-gray-400 hover:text-white transition duration-200 cursor-pointer disabled:opacity-50"
                  title="Force reload list"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Essay Table Content */}
              {loading && essays.length === 0 ? (
                <div className="p-16 text-center">
                  <Loader className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Loading your history...</p>
                </div>
              ) : essays.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <div className="h-12 w-12 rounded-full bg-slate-800/40 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold">No assessment records found</p>
                  <p className="text-xs text-gray-500 mt-1">Upload your first essay on the left to begin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] bg-slate-900/30 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Filename</th>
                        <th className="px-6 py-4">Uploaded</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Score</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-sm">
                      {essays.map((essay) => (
                        <tr 
                          key={essay.essayId} 
                          className="hover:bg-slate-800/20 transition duration-150 group"
                        >
                          <td className="px-6 py-4.5 font-medium text-gray-200 max-w-[180px] truncate">
                            {essay.filename}
                          </td>
                          <td className="px-6 py-4.5 text-xs text-gray-400 font-mono">
                            {new Date(essay.createdAt || Date.now()).toLocaleString()}
                          </td>
                          <td className="px-6 py-4.5 text-center">
                            {getStatusBadge(essay.status)}
                          </td>
                          <td className="px-6 py-4.5 text-center font-display font-extrabold text-base">
                            {essay.status === 'COMPLETED' ? (
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                                {essay.score}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4.5 text-right">
                            {essay.status === 'COMPLETED' ? (
                              <button 
                                onClick={() => navigate(`/essay/${essay.essayId}`)}
                                className="inline-flex items-center gap-1 py-1.5 px-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 rounded-lg text-xs font-semibold transition duration-200 cursor-pointer"
                              >
                                View Analysis
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            ) : essay.status === 'FAILED' || essay.status === 'ERROR' ? (
                              <div className="text-xs text-rose-400 font-medium select-text">
                                Assessment error
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 flex items-center justify-end gap-1 font-medium">
                                <Loader className="w-3 h-3 animate-spin text-amber-500" />
                                Processing...
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
