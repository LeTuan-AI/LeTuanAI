
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Zap,
  BookOpen,
  ChevronRight,
  Loader2,
  Lightbulb,
  Clapperboard,
  Scissors,
  Send,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Clock
} from 'lucide-react';
import { suggestIdeas, generateScreenplay, breakdownScenes, generateFinalPrompt } from '../services/promptService';
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Shield, Zap as ZapIcon, Shirt, Sparkle } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CHARACTER_COLORS = [
  'bg-orange-500', 
  'bg-blue-500', 
  'bg-purple-500', 
  'bg-emerald-500', 
  'bg-rose-500', 
  'bg-amber-500', 
  'bg-indigo-500', 
  'bg-cyan-500'
];

const MAIN_CHARACTER_NAMES = [
  'lê tuấn', 'đình thược', 'ngân thơm', 'hà út', 'tuyết mai', 'sato', 'tuấn', 'thược', 'thơm', 'út', 'mai'
];

const detectCharacters = (text: string, existingCharacters: Character[] = []): Character[] => {
  const characters: Character[] = [...existingCharacters];
  const regex = /@(\d+)\s*\(([^)]+)\)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const id = match[1];
    const name = match[2].trim();
    
    if (!characters.find(c => c.id === id)) {
      const lowerName = name.toLowerCase();
      
      // Basic gender inference for Vietnamese names
      let gender: 'male' | 'female' = 'male';
      
      // Common female markers in Vietnamese names
      const femaleMarkers = ['thị', 'mai', 'lan', 'hồng', 'tuyết', 'ngọc', 'linh', 'trang', 'thảo', 'phương', 'hạnh', 'hiền', 'anh', 'nhi', 'vy', 'quỳnh'];
      // Common male markers
      const maleMarkers = ['văn', 'tuấn', 'hùng', 'dũng', 'cường', 'minh', 'nam', 'sơn', 'hải', 'long', 'thành', 'trung', 'kiên', 'hoàng', 'huy', 'đức', 'việt'];

      const isFemale = femaleMarkers.some(m => lowerName.includes(m));
      const isMale = maleMarkers.some(m => lowerName.includes(m));

      if (isFemale && !isMale) gender = 'female';
      else if (isMale) gender = 'male';
      
      // Check if it's a main character
      const isMain = MAIN_CHARACTER_NAMES.some(mainName => lowerName.includes(mainName));
      
      characters.push({
        id,
        name,
        gender,
        isMain,
        useCameoOutfit: isMain, // Default to true for main characters
        color: CHARACTER_COLORS[(parseInt(id) - 1) % CHARACTER_COLORS.length]
      });
    }
  }
  
  return characters.sort((a, b) => parseInt(a.id) - parseInt(b.id));
};

const CinematicPromptModule: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Idea
  const [idea, setIdea] = useState('');
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  
  // Step 2: Screenplay
  const [numEpisodes, setNumEpisodes] = useState(6);
  const [durationPerEpisode, setDurationPerEpisode] = useState(1);
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  
  // Step 3: Breakdown
  const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
  
  // Step 4: Final Prompts
  const [copied, setCopied] = useState<string | null>(null);

  const handleSuggestIdeas = async () => {
    setLoading(true);
    try {
      const res = await suggestIdeas();
      setSuggestions(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScreenplay = async () => {
    if (!idea) return;
    setLoading(true);
    try {
      const res = await generateScreenplay(idea, numEpisodes, durationPerEpisode);
      setScreenplay({
        ...res,
        intensityLevel: 'action-drama' // Default
      });
      setStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdown = async (episodeId: number) => {
    if (!screenplay) return;
    const ep = screenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    
    // Get context from previous episode
    const prevEp = screenplay.episodes.find(e => e.id === episodeId - 1);
    const previousContext = prevEp ? prevEp.summary : "Đây là tập đầu tiên.";

    setLoading(true);
    setActiveEpisodeId(episodeId);
    try {
      const numScenes = Math.ceil((ep.duration * 60) / 12);
      const scenes = await breakdownScenes(ep.summary, numScenes, previousContext, screenplay.intensityLevel);
      
      // Automatically detect characters for each scene
      const scenesWithCharacters = scenes.map(s => ({
        ...s,
        characters: detectCharacters(s.description)
      }));
      
      const updatedEpisodes = screenplay.episodes.map(e => 
        e.id === episodeId ? { ...e, scenes: scenesWithCharacters } : e
      );
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
      setStep(3);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    if (!screenplay || activeEpisodeId === null) return;
    const ep = screenplay.episodes.find(e => e.id === activeEpisodeId);
    if (!ep) return;

    // Generate prompts for all scenes that don't have one yet or just all of them
    const scenesToProcess = ep.scenes;
    
    for (const scene of scenesToProcess) {
      await handleGeneratePrompt(activeEpisodeId, scene.id);
    }
  };

  const updateOverallPlot = (value: string) => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, overallPlot: value });
  };

  const updateIntensityLevel = (level: 'storytelling' | 'action-drama' | 'hardcore') => {
    if (!screenplay) return;
    setScreenplay({ ...screenplay, intensityLevel: level });
  };

  const updateEpisode = (id: number, field: 'title' | 'summary' | 'duration', value: any) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterCameoOutfit = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map(c => c.id === characterId ? { ...c, useCameoOutfit: !c.useCameoOutfit } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const toggleCharacterGender = (episodeId: number, sceneId: string, characterId: string) => {
    if (!screenplay) return;
    const updatedEpisodes = screenplay.episodes.map(e => 
      e.id === episodeId ? {
        ...e,
        scenes: e.scenes.map(s => s.id === sceneId ? { 
          ...s, 
          characters: s.characters?.map(c => c.id === characterId ? { ...c, gender: c.gender === 'male' ? 'female' : 'male' } : c)
        } : s)
      } : e
    );
    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
  };

  const handleGeneratePrompt = async (episodeId: number, sceneId: string) => {
    if (!screenplay) return;
    const ep = screenplay.episodes.find(e => e.id === episodeId);
    if (!ep) return;
    const scene = ep.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Set loading state for specific scene
    const updateSceneLoading = (isLoading: boolean) => {
      const updatedEpisodes = screenplay.episodes.map(e => 
        e.id === episodeId ? {
          ...e,
          scenes: e.scenes.map(s => s.id === sceneId ? { ...s, loading: isLoading } : s)
        } : e
      );
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
    };

    updateSceneLoading(true);
    try {
      // Find previous scene for continuity
      const currentEpisode = screenplay.episodes.find(e => e.id === episodeId);
      let previousSceneDesc = undefined;
      let previousTechnicalPrompt = undefined;
      let isLateScene = false;
      
      if (currentEpisode) {
        const sceneIndex = currentEpisode.scenes.findIndex(s => s.id === sceneId);
        isLateScene = sceneIndex >= Math.floor(currentEpisode.scenes.length / 2);
        
        if (sceneIndex > 0) {
          const prevScene = currentEpisode.scenes[sceneIndex - 1];
          previousSceneDesc = prevScene.description;
          previousTechnicalPrompt = prevScene.finalPrompt?.chinesePrompt;
        } else {
          // If first scene of episode, check last scene of previous episode
          const prevEp = screenplay.episodes.find(e => e.id === episodeId - 1);
          if (prevEp && prevEp.scenes.length > 0) {
            const lastScene = prevEp.scenes[prevEp.scenes.length - 1];
            previousSceneDesc = lastScene.description;
            previousTechnicalPrompt = lastScene.finalPrompt?.chinesePrompt;
          }
        }
      }

      // Layer 1: Global Story (Overall Plot + Summaries up to current episode)
      const episodeHistory = screenplay.episodes
        .filter(e => e.id <= episodeId)
        .map(e => `Tập ${e.id}: ${e.summary}`)
        .join('\n');
      
      const globalStory = `KỊCH BẢN TỔNG THỂ: ${screenplay.overallPlot}\n\nDIỄN BIẾN ĐẾN HIỆN TẠI:\n${episodeHistory}`;

      const res = await generateFinalPrompt(
        scene.description, 
        globalStory, 
        scene.characters || [], 
        screenplay.intensityLevel,
        previousSceneDesc,
        previousTechnicalPrompt,
        isLateScene
      );
      const updatedEpisodes = screenplay.episodes.map(e => 
        e.id === episodeId ? {
          ...e,
          scenes: e.scenes.map(s => s.id === sceneId ? { ...s, finalPrompt: res, loading: false } : s)
        } : e
      );
      setScreenplay({ ...screenplay, episodes: updatedEpisodes });
    } catch (error) {
      console.error(error);
      updateSceneLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const reset = () => {
    setStep(1);
    setIdea('');
    setSuggestions([]);
    setScreenplay(null);
    setActiveEpisodeId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-16 max-w-3xl mx-auto">
        {[
          { n: 1, label: 'Ý tưởng', icon: Lightbulb },
          { n: 2, label: 'Kịch bản', icon: Clapperboard },
          { n: 3, label: 'Chia cảnh', icon: Scissors },
          { n: 4, label: 'Xuất Prompt', icon: Send }
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center relative flex-1">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
              step >= s.n ? "bg-luxury-gold border-luxury-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "bg-black border-white/10 text-white/20"
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em] mt-4",
              step >= s.n ? "text-luxury-gold" : "text-white/20"
            )}>{s.label}</span>
            {s.n < 4 && (
              <div className={cn(
                "absolute top-6 left-[50%] w-full h-[1px] -z-0",
                step > s.n ? "bg-luxury-gold/50" : "bg-white/5"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: IDEA GENERATOR */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              {/* Card Signature */}
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-luxury-gold uppercase tracking-[0.4em]">BY LÊ TUẤN</span>
              </div>
              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-luxury-gold/10 rounded-2xl border border-luxury-gold/20">
                  <Lightbulb className="w-6 h-6 text-luxury-gold" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-white font-bold tracking-tight">Khởi tạo ý tưởng</h2>
                  <p className="text-luxury-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 1: Idea Generator</p>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="luxury-label">
                    Nhập ý tưởng sơ khai của bạn
                  </label>
                  <textarea 
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Ví dụ: Một sát thủ gác kiếm bị truy đuổi..."
                    rows={4}
                    className="input-field resize-none mb-8"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="luxury-label">
                        Số tập phim
                      </label>
                      <input 
                        type="number"
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(parseInt(e.target.value) || 1)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="luxury-label">
                        Phút mỗi tập
                      </label>
                      <input 
                        type="number"
                        value={durationPerEpisode}
                        onChange={(e) => setDurationPerEpisode(parseInt(e.target.value) || 1)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSuggestIdeas}
                    disabled={loading}
                    className="btn-secondary flex-1"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    GỢI Ý Ý TƯỞNG
                  </button>
                  <button
                    onClick={handleGenerateScreenplay}
                    disabled={loading || !idea}
                    className="btn-primary flex-1"
                  >
                    TIẾP THEO
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                <h3 className="luxury-label ml-1">Xu hướng hành động hot</h3>
                {suggestions.map((s, i) => (
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i}
                    onClick={() => setIdea(s.description)}
                    className="text-left p-6 bg-luxury-dark border border-white/5 rounded-2xl hover:border-luxury-gold/50 hover:bg-luxury-gold/5 transition-all group"
                  >
                    <h4 className="font-serif text-lg text-white mb-2 group-hover:text-luxury-gold transition-colors">{s.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed font-light">{s.description}</p>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: SCREENPLAY */}
        {step === 2 && screenplay && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              {/* Card Signature */}
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-luxury-gold uppercase tracking-[0.4em]">BY LÊ TUẤN</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-luxury-gold/10 rounded-2xl border border-luxury-gold/20">
                    <Clapperboard className="w-6 h-6 text-luxury-gold" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-white font-bold tracking-tight">Kịch bản phân tập</h2>
                    <p className="text-luxury-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 2: Screenplay Editor</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
                    <ArrowLeft className="w-5 h-5 text-luxury-gold" />
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <label className="luxury-label">Cốt truyện tổng thể</label>
                  <textarea 
                    value={screenplay.overallPlot}
                    onChange={(e) => updateOverallPlot(e.target.value)}
                    rows={4}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['storytelling', 'action-drama', 'hardcore'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateIntensityLevel(level)}
                      className={cn(
                        "p-6 rounded-2xl border transition-all text-left group",
                        screenplay.intensityLevel === level 
                          ? "bg-luxury-gold/10 border-luxury-gold shadow-[0_0_20px_rgba(212,175,55,0.1)]" 
                          : "bg-black/20 border-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Zap className={cn(
                          "w-5 h-5",
                          screenplay.intensityLevel === level ? "text-luxury-gold" : "text-white/20"
                        )} />
                        {screenplay.intensityLevel === level && (
                          <div className="w-2 h-2 rounded-full bg-luxury-gold animate-pulse" />
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-1",
                        screenplay.intensityLevel === level ? "text-luxury-gold" : "text-white/40"
                      )}>
                        {level === 'storytelling' ? 'Bình thường' : level === 'action-drama' ? 'Kịch tính' : 'Hardcore'}
                      </p>
                      <p className="text-xs text-white/60 font-light leading-relaxed">
                        {level === 'storytelling' ? 'Tập trung vào đối thoại và cảm xúc.' : level === 'action-drama' ? 'Cân bằng giữa cốt truyện và hành động.' : 'Hành động dồn dập, nhịp độ cực nhanh.'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <label className="luxury-label">Danh sách tập phim</label>
                  <div className="grid grid-cols-1 gap-4">
                    {screenplay.episodes.map((ep) => (
                      <div key={ep.id} className="bg-luxury-purple-light/40 border border-white/10 rounded-3xl p-8 hover:border-luxury-gold/40 transition-all group">
                        <div className="flex flex-col md:flex-row gap-8">
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl font-serif font-bold text-luxury-gold/20">0{ep.id}</span>
                              <input 
                                value={ep.title}
                                onChange={(e) => updateEpisode(ep.id, 'title', e.target.value)}
                                className="bg-transparent border-none text-xl font-serif font-bold text-white focus:ring-0 p-0 w-full"
                                placeholder="Tiêu đề tập..."
                              />
                            </div>
                            <textarea 
                              value={ep.summary}
                              onChange={(e) => updateEpisode(ep.id, 'summary', e.target.value)}
                              rows={3}
                              className="bg-transparent border-none text-sm text-white/80 focus:ring-0 p-0 w-full resize-none font-bold leading-relaxed"
                              placeholder="Tóm tắt nội dung tập này..."
                            />
                          </div>
                          <div className="md:w-48 flex flex-col justify-between items-end">
                            <div className="flex items-center gap-2 bg-luxury-purple-dark/60 px-4 py-2 rounded-xl border border-white/10">
                              <Clock className="w-3 h-3 text-luxury-gold" />
                              <input 
                                type="number"
                                value={ep.duration}
                                onChange={(e) => updateEpisode(ep.id, 'duration', parseInt(e.target.value) || 1)}
                                className="bg-transparent border-none text-xs font-black text-luxury-gold focus:ring-0 p-0 w-8 text-center"
                              />
                              <span className="text-[10px] font-black text-luxury-gold/60 uppercase tracking-widest">Phút</span>
                            </div>
                            <button 
                              onClick={() => handleBreakdown(ep.id)}
                              disabled={loading}
                              className="btn-primary w-full py-4"
                            >
                              {loading && activeEpisodeId === ep.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                              CHIA CẢNH
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SCENE BREAKDOWN */}
        {step === 3 && screenplay && activeEpisodeId !== null && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              {/* Card Signature */}
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-luxury-gold uppercase tracking-[0.4em]">BY LÊ TUẤN</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-luxury-gold/10 rounded-2xl border border-luxury-gold/20">
                    <Scissors className="w-6 h-6 text-luxury-gold" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-white font-bold tracking-tight">Chia cảnh chi tiết</h2>
                    <p className="text-luxury-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 3: Scene Breakdown — Tập {activeEpisodeId}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
                    <ArrowLeft className="w-5 h-5 text-luxury-gold" />
                  </button>
                  <button 
                    onClick={handleExportAll}
                    disabled={loading}
                    className="btn-secondary px-6"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    TẠO TẤT CẢ
                  </button>
                  <button onClick={() => setStep(4)} className="btn-primary px-6">
                    XEM TỔNG HỢP
                  </button>
                </div>
              </div>

              <div className="space-y-10">
                {screenplay.episodes.find(e => e.id === activeEpisodeId)?.scenes.map((scene, idx) => (
                  <div key={scene.id} className="bg-luxury-purple-light/20 border border-white/10 rounded-[2.5rem] p-10 group hover:border-luxury-gold/40 transition-all">
                    <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-luxury-gold text-black rounded-full flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                          {idx + 1}
                        </span>
                        <h3 className="text-lg font-serif font-bold text-white tracking-tight">Cảnh quay chi tiết</h3>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Nhân vật:</span>
                          {scene.characters && scene.characters.length > 0 ? (
                            scene.characters.map(char => (
                              <div 
                                key={char.id} 
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all relative overflow-hidden",
                                  char.useCameoOutfit 
                                    ? "bg-luxury-gold/10 border-luxury-gold/40" 
                                    : "bg-white/5 border-white/10 opacity-80"
                                )}
                              >
                                {char.isMain && (
                                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-luxury-gold text-[6px] font-black text-black rounded-bl-lg uppercase tracking-widest">
                                    Main
                                  </div>
                                )}
                                <div className={cn("w-2 h-2 rounded-full shrink-0", char.color)} />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-white whitespace-nowrap">@{char.id} {char.name}</span>
                                  <span className="text-[7px] font-black text-luxury-gold uppercase tracking-widest">
                                    {char.isMain ? 'Nhân vật chính' : 'Nhân vật phụ'}
                                  </span>
                                </div>
                                <div className="w-px h-4 bg-white/20 mx-1 shrink-0" />
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => toggleCharacterGender(activeEpisodeId, scene.id, char.id)}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                                      char.gender === 'male' 
                                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30" 
                                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                    )}
                                  >
                                    {char.gender === 'male' ? 'NAM' : 'NỮ'}
                                  </button>
                                  <button 
                                    onClick={() => toggleCharacterCameoOutfit(activeEpisodeId, scene.id, char.id)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                                      char.useCameoOutfit 
                                        ? "bg-luxury-gold text-black border-luxury-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                                        : "bg-white/10 text-white/60 border-white/20"
                                    )}
                                  >
                                    {char.useCameoOutfit ? (
                                      <>
                                        <ZapIcon className="w-2.5 h-2.5 fill-current" />
                                        CAMEO
                                      </>
                                    ) : (
                                      <>
                                        <Shirt className="w-2.5 h-2.5" />
                                        FREE
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <button 
                              onClick={() => {
                                const detected = detectCharacters(scene.description);
                                if (detected.length > 0) {
                                  const updatedEpisodes = screenplay.episodes.map(ep => 
                                    ep.id === activeEpisodeId ? {
                                      ...ep,
                                      scenes: ep.scenes.map(s => s.id === scene.id ? { ...s, characters: detected } : s)
                                    } : ep
                                  );
                                  setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                                }
                              }}
                              className="text-[9px] font-black text-luxury-gold uppercase tracking-widest hover:underline"
                            >
                              Quét nhân vật
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-transparent hover:border-white/20">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (!screenplay || activeEpisodeId === null) return;
                              const updatedEpisodes = screenplay.episodes.map(ep => 
                                ep.id === activeEpisodeId ? {
                                  ...ep,
                                  scenes: ep.scenes.filter(s => s.id !== scene.id)
                                } : ep
                              );
                              setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                            }}
                            className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-rose-400 transition-all border border-transparent hover:border-white/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <label className="luxury-label">Mô tả hành động & bối cảnh</label>
                        <textarea 
                          value={scene.description}
                          onChange={(e) => {
                            const newDesc = e.target.value;
                            const updatedEpisodes = screenplay.episodes.map(ep => 
                              ep.id === activeEpisodeId ? {
                                ...ep,
                                scenes: ep.scenes.map(s => {
                                  if (s.id === scene.id) {
                                    const detected = detectCharacters(newDesc, s.characters);
                                    return { ...s, description: newDesc, characters: detected };
                                  }
                                  return s;
                                })
                              } : ep
                            );
                            setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                          }}
                          className="input-field h-[200px] resize-none font-light leading-relaxed"
                        />
                        <button 
                          onClick={() => handleGeneratePrompt(activeEpisodeId, scene.id)}
                          disabled={scene.loading}
                          className="btn-primary w-full py-5 text-sm"
                        >
                          {scene.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                          TẠO PROMPT ĐIỆN ẢNH
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <label className="luxury-label">Kết quả Prompt (Jimeng/Veo)</label>
                          {scene.finalPrompt && (
                            <button 
                              onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id)}
                              className="flex items-center gap-2 text-[10px] font-bold text-luxury-gold uppercase tracking-widest hover:text-white transition-colors"
                            >
                              {copied === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === scene.id ? 'ĐÃ COPY' : 'COPY PROMPT'}
                            </button>
                          )}
                        </div>
                        
                        <div className="bg-luxury-purple-dark/60 border border-white/10 rounded-3xl p-8 h-[275px] overflow-y-auto relative custom-scrollbar">
                          {!scene.finalPrompt && !scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                              <Sparkle className="w-12 h-12 mb-4 opacity-30" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Chưa có prompt</span>
                            </div>
                          )}
                          {scene.loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-luxury-purple-dark/40 backdrop-blur-sm z-10">
                              <Loader2 className="w-10 h-10 animate-spin text-luxury-gold mb-4" />
                              <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.3em]">Đang chế tác...</span>
                            </div>
                          )}
                          {scene.finalPrompt && (
                            <div className="space-y-8">
                              <div>
                                <span className="text-[9px] font-black text-luxury-gold/60 uppercase tracking-widest block mb-3">Tiếng Trung (Prompt chính)</span>
                                <p className="text-xs font-mono font-bold text-luxury-gold leading-relaxed bg-black/40 p-6 rounded-2xl border border-white/10">
                                  {scene.finalPrompt.chinesePrompt}
                                </p>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-luxury-gold/60 uppercase tracking-widest block mb-3">Bản dịch tiếng Việt</span>
                                <p className="text-xs text-white/80 leading-relaxed italic font-bold">
                                  {scene.finalPrompt.vietnameseTranslation}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    if (!screenplay || activeEpisodeId === null) return;
                    const updatedEpisodes = screenplay.episodes.map(ep => 
                      ep.id === activeEpisodeId ? {
                        ...ep,
                        scenes: [
                          ...ep.scenes,
                          {
                            id: "scene-" + Date.now(),
                            description: "",
                            characters: []
                          }
                        ]
                      } : ep
                    );
                    setScreenplay({ ...screenplay, episodes: updatedEpisodes });
                  }}
                  className="w-full border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-white/40 hover:border-luxury-gold/50 hover:text-luxury-gold transition-all bg-luxury-purple-light/10"
                >
                  <Plus className="w-10 h-10 mb-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Thêm cảnh quay mới</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: FINAL PROMPT OUTPUT */}
        {step === 4 && screenplay && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            <div className="luxury-card relative overflow-hidden">
              {/* Card Signature */}
              <div className="absolute top-4 right-6 opacity-20 pointer-events-none">
                <span className="text-[8px] font-black text-luxury-gold uppercase tracking-[0.4em]">BY LÊ TUẤN</span>
              </div>
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Send className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif text-white font-bold tracking-tight">Xuất Prompt Điện Ảnh</h2>
                    <p className="text-luxury-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">Bước 4: Final Prompt Output</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
                    <ArrowLeft className="w-5 h-5 text-luxury-gold" />
                  </button>
                  <button onClick={reset} className="p-3 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
                    <RotateCcw className="w-5 h-5 text-luxury-gold" />
                  </button>
                </div>
              </div>

              <div className="space-y-16">
                {screenplay.episodes.map((ep) => (
                   ep.scenes.some(s => s.finalPrompt) && (
                    <div key={ep.id} className="space-y-10">
                      <div className="flex items-center gap-6">
                        <div className="h-px bg-white/10 flex-1" />
                        <h3 className="text-[11px] font-black text-luxury-gold uppercase tracking-[0.4em]">Tập {ep.id}: {ep.title}</h3>
                        <div className="h-px bg-white/10 flex-1" />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-10">
                        {ep.scenes.map((scene, idx) => (
                          scene.finalPrompt && (
                            <div key={scene.id} className="bg-luxury-purple-light/20 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-luxury-gold/40 transition-all">
                              <div className="bg-luxury-purple-dark/40 px-10 py-5 flex justify-between items-center border-b border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Cảnh {idx + 1} — PROMPT (中文)</span>
                                <button 
                                  onClick={() => copyToClipboard(scene.finalPrompt!.chinesePrompt, scene.id)}
                                  className="text-luxury-gold/60 hover:text-luxury-gold transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                  {copied === scene.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ĐÃ SAO CHÉP</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>SAO CHÉP</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div>
                                  <label className="luxury-label mb-4 block">Prompt Jimeng</label>
                                  <pre className="whitespace-pre-wrap font-mono text-xs font-bold text-luxury-gold leading-relaxed bg-black/40 p-8 rounded-[1.5rem] border border-white/10 h-[220px] overflow-y-auto custom-scrollbar">
                                    {scene.finalPrompt.chinesePrompt}
                                  </pre>
                                </div>
                                <div>
                                  <label className="luxury-label mb-4 block">Bản dịch tiếng Việt</label>
                                  <div className="text-sm text-white/80 leading-relaxed bg-black/40 p-8 rounded-[1.5rem] border border-white/10 h-[220px] overflow-y-auto custom-scrollbar font-bold italic">
                                    {scene.finalPrompt.vietnameseTranslation}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicPromptModule;
