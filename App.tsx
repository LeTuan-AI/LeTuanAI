
import React, { useState } from 'react';
import { Film } from 'lucide-react';
import CinematicPromptModule from './modules/CinematicPromptModule';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onLogin={() => setIsAuthenticated(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-luxury-purple-dark font-['Inter'] pb-20 selection:bg-luxury-gold selection:text-black relative">
        {/* Brand Signature */}
        <div className="fixed top-6 right-8 z-[60] pointer-events-none">
          <span className="text-[10px] font-black text-luxury-gold/60 uppercase tracking-[0.5em] bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-luxury-gold/20">
            BY LÊ TUẤN
          </span>
        </div>

        <nav className="bg-luxury-purple-dark/80 backdrop-blur-md border-b border-white/10 h-24 flex items-center sticky top-0 z-50">
          <div className="max-w-7xl mx-auto w-full px-8 flex justify-between items-center">
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-luxury-gold rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  <Film className="w-5 h-5 text-black" />
                </div>
                <span className="text-white font-serif text-3xl font-bold tracking-tight">CINEMATIC <span className="text-luxury-gold italic">ENGINE</span> LÊ TUẤN</span>
              </div>
              <span className="text-luxury-gold/60 font-black text-[9px] tracking-[0.4em] uppercase mt-2 ml-14">Professional AI Video Prompting</span>
            </div>
            <div className="flex items-center gap-6">
               <div className="h-8 w-px bg-white/10" />
               <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.2em] px-5 py-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/10">Jimeng Optimized</span>
            </div>
          </div>
        </nav>
        <main className="relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-luxury-gold/10 blur-[120px] -z-10 pointer-events-none" />
          <CinematicPromptModule />
        </main>
        <footer className="fixed bottom-0 left-0 right-0 h-16 bg-luxury-purple-dark/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-center z-40">
           <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">© 2026 Cinematic AI Engine LÊ TUẤN — <span className="text-luxury-gold/60">Prestige Edition</span></span>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
