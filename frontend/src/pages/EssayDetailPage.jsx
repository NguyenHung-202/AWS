import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEssay } from '../services/api';
import { 
  ArrowLeft, Loader, FileText, Calendar, CheckCircle2, 
  AlertTriangle, Award, BookOpen, PenTool, Sparkles 
} from 'lucide-react';

export default function EssayDetailPage() {
  const { essayId } = useParams();
  const navigate = useNavigate();
  const [essay, setEssay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEssayDetails();
  }, [essayId]);

  const fetchEssayDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getEssay(essayId);
      setEssay(data);
    } catch (err) {
      setError('Failed to load essay details. Make sure the backend is active.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreVerdict = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 80) return { label: 'Very Good', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' };
    if (score >= 70) return { label: 'Good', color: 'text-brand-300', bg: 'bg-brand-500/10 border-brand-500/20' };
    if (score >= 50) return { label: 'Average', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { label: 'Needs Improvement', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
  };

  // Custom text renderer to convert Markdown-like syntax from Gemini into styled HTML
  const formatFeedback = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Empty lines
      if (!trimmed) return <div key={idx} className="h-2"></div>;

      // Headings (e.g. ### Grammar or 1. Grammar)
      if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
        const title = trimmed.replace(/^#+\s*/, '');
        return (
          <h4 key={idx} className="text-base font-bold text-white mt-4 mb-2 flex items-center gap-2 border-b border-slate-800 pb-1.5 font-display">
            <Sparkles className="w-4 h-4 text-purple-400" />
            {title}
          </h4>
        );
      }

      // Strong sections within lists or paragraphs (e.g., **Grammar**: text)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const content = trimmed.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-gray-300 mb-1.5 leading-relaxed">
            {renderBoldText(content)}
          </li>
        );
      }

      // Standard paragraphs
      return (
        <p key={idx} className="text-sm text-gray-300 mb-2 leading-relaxed">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-purple-300 font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Fetching analysis details...</p>
        </div>
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-rose-500/20 text-center">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Error Loading Essay</h2>
          <p className="text-xs text-gray-400 mb-6">{error || 'Essay record not found.'}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const scoreInfo = getScoreVerdict(essay.score || 0);
  
  // SVG Radial Gauge Calculations
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((essay.score || 0) / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-100 font-sans relative pb-16 overflow-x-hidden">
      {/* Decorative Blurs */}
      <div className="glow-purple top-10 left-10"></div>
      <div className="glow-blue bottom-10 right-10"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[rgba(255,255,255,0.06)] shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-slate-850 hover:bg-slate-800 border border-[rgba(255,255,255,0.06)] rounded-xl py-2 px-4 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-display font-extrabold text-sm text-gray-300">Analysis Mode</span>
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>
          </div>
        </div>
      </header>

      {/* Content wrapper */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Score Gauge & Metadata (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Score Card */}
            <div className="glass-card rounded-2xl p-6 border border-[rgba(255,255,255,0.06)] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
              
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
                Evaluation Score
              </h3>
              
              {/* Radial Dial SVG */}
              <div className="relative w-36 h-36 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-slate-800"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-purple-500 transition-all duration-1000 ease-out"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold font-display text-white">
                    {essay.score}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">
                    out of 100
                  </span>
                </div>
              </div>

              {/* Score label badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${scoreInfo.bg} ${scoreInfo.color} mb-3`}>
                <Award className="w-4 h-4" />
                {scoreInfo.label}
              </div>
            </div>

            {/* Metadata File Info Card */}
            <div className="glass-card rounded-2xl p-6 border border-[rgba(255,255,255,0.06)] space-y-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileText className="w-4.5 h-4.5 text-purple-400" />
                Essay Metadata
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block mb-0.5">Filename</span>
                  <span className="font-semibold text-gray-200 select-all truncate block">
                    {essay.filename}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-500 block mb-0.5">Date Assessed</span>
                  <div className="flex items-center gap-1 text-gray-300 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(essay.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block mb-0.5">Status</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block mb-0.5">Unique Identifier</span>
                  <span className="text-gray-400 font-mono select-all block text-[10px] break-all">
                    {essay.essayId}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: AI Analysis & Feedback Content (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Feedback Content Card */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-[rgba(255,255,255,0.06)] relative">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-display">AI Evaluator Feedback</h2>
                    <p className="text-xs text-gray-400">Scoring breakdown and improvement advice</p>
                  </div>
                </div>
                
                <div className="hidden sm:block text-[10px] font-semibold text-gray-500 uppercase tracking-widest bg-slate-900/50 px-2.5 py-1 rounded-lg">
                  Powered by Gemini 1.5 Flash
                </div>
              </div>

              {/* Render Structured Feedback */}
              <div className="space-y-4 select-text">
                {essay.feedback ? (
                  <div className="prose prose-invert prose-purple max-w-none">
                    {formatFeedback(essay.feedback)}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    No detailed feedback text was generated.
                  </div>
                )}
              </div>

            </div>

          </div>
          
        </div>
      </main>
    </div>
  );
}
