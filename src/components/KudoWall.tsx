import React, { useEffect, useState, useCallback } from 'react';
import { KudoEntity, KudoReactionType } from '../types/kudos';
import { KudoService } from '../lib/kudoService';
import { supabase } from '../lib/supabaseClient';
import { Award, Loader2, Quote, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface KudoWallProps {
  currentWorkerId?: string;
  currentUserRole?: string;
}

export function KudoWall({ currentWorkerId, currentUserRole }: KudoWallProps) {
  const [kudos, setKudos] = useState<KudoEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactionLoading, setReactionLoading] = useState<string | null>(null);

  const isSupervisorOrAdmin = currentUserRole === 'supervisor' || currentUserRole === 'admin' || currentUserRole === 'SYSTEM_ADMIN';

  const fetchKudos = useCallback(async () => {
    try {
      const data = await KudoService.getRecentKudos(12, currentWorkerId);
      setKudos(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentWorkerId]);

  useEffect(() => {
    fetchKudos();

    // Subscribe to new kudos realtime
    const kudoChannel = supabase
      .channel('kudo_wall_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'worker_kudos' },
        () => {
          fetchKudos();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'worker_kudos' },
        () => {
          fetchKudos();
        }
      )
      .subscribe();

    // Listen to local reaction & pin events
    const handleReactionEvent = () => fetchKudos();
    const handlePinnedEvent = () => fetchKudos();

    window.addEventListener('gappy_kudo_reaction_updated', handleReactionEvent);
    window.addEventListener('gappy_kudo_pinned_updated', handlePinnedEvent);

    return () => {
      supabase.removeChannel(kudoChannel);
      window.removeEventListener('gappy_kudo_reaction_updated', handleReactionEvent);
      window.removeEventListener('gappy_kudo_pinned_updated', handlePinnedEvent);
    };
  }, [fetchKudos]);

  const handleToggleReaction = async (kudoId: string, reactionType: KudoReactionType) => {
    if (!currentWorkerId) return;
    setReactionLoading(`${kudoId}-${reactionType}`);

    // Optimistic UI update
    setKudos(prev => prev.map(k => {
      if (k.id !== kudoId) return k;
      const currentReactions = k.reactions || { clap: 0, muscle: 0, star: 0, userReactions: [] };
      const hasReacted = currentReactions.userReactions.includes(reactionType);

      const nextUserReactions = hasReacted
        ? currentReactions.userReactions.filter(t => t !== reactionType)
        : [...currentReactions.userReactions, reactionType];

      const nextCount = Math.max(0, currentReactions[reactionType] + (hasReacted ? -1 : 1));

      return {
        ...k,
        reactions: {
          ...currentReactions,
          [reactionType]: nextCount,
          userReactions: nextUserReactions
        }
      };
    }));

    try {
      await KudoService.toggleReaction(kudoId, currentWorkerId, reactionType);
    } catch {
      // rollback on failure
      fetchKudos();
    } finally {
      setReactionLoading(null);
    }
  };

  const handleTogglePin = async (kudo: KudoEntity) => {
    if (!isSupervisorOrAdmin || !currentWorkerId) return;
    const nextPinState = !kudo.is_pinned;

    // Optimistic UI
    setKudos(prev => {
      const updated = prev.map(k => k.id === kudo.id ? { ...k, is_pinned: nextPinState } : k);
      return updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    try {
      await KudoService.togglePinKudo(kudo.id, currentWorkerId, nextPinState);
    } catch {
      fetchKudos();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Kerja Aman': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Bantuan Hebat': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'Team Player': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Inisiatif': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Kerja Aman': return '🛡️';
      case 'Bantuan Hebat': return '🤝';
      case 'Team Player': return '👥';
      case 'Inisiatif': return '💡';
      default: return '🌟';
    }
  };

  if (loading && kudos.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col items-center justify-center min-h-[150px]">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-3" />
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Memuat Kudos...</p>
      </div>
    );
  }

  if (kudos.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col items-center justify-center text-center min-h-[150px]">
        <Award className="w-8 h-8 text-zinc-700 mb-2" />
        <p className="text-sm font-bold text-zinc-400">Belum Ada Apresiasi</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">Jadilah yang pertama mengirimkan Kudo ke rekan kerja Anda!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Tembok Apresiasi</h3>
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
            {kudos.length} Terkini
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">
          Beri reaksi (👏, 💪, ⭐) untuk mendukung rekan Anda
        </span>
      </div>
      
      {/* Horizontal Scroll Area */}
      <div className="flex overflow-x-auto snap-x gap-3 pb-4 scrollbar-hide">
        {kudos.map(kudo => {
          const reactions = kudo.reactions || { clap: 0, muscle: 0, star: 0, userReactions: [] };

          return (
            <div 
              key={kudo.id} 
              className={`snap-start shrink-0 w-[295px] bg-zinc-900 rounded-2xl p-4 flex flex-col transition relative ${
                kudo.is_pinned 
                  ? 'border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/5 to-zinc-900 shadow-lg shadow-amber-500/5' 
                  : 'border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Pinned Badge & Actions */}
              <div className="flex justify-between items-start mb-2.5 gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${getCategoryColor(kudo.category)}`}>
                    <span>{getCategoryIcon(kudo.category)}</span>
                    <span>{kudo.category}</span>
                  </div>
                  {kudo.is_pinned && (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black flex items-center gap-0.5">
                      <Pin className="w-2.5 h-2.5 fill-current" />
                      Pilihan Pengawas
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-zinc-500">
                    {formatDistanceToNow(new Date(kudo.created_at), { addSuffix: true, locale: localeId })}
                  </span>
                  {isSupervisorOrAdmin && (
                    <button
                      onClick={() => handleTogglePin(kudo)}
                      title={kudo.is_pinned ? 'Lepas Sematan (Unpin)' : 'Sematkan Kudo Pilihan Pengawas (Pin)'}
                      className={`p-1 rounded hover:bg-zinc-800 transition cursor-pointer ${
                        kudo.is_pinned ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <Pin className={`w-3.5 h-3.5 ${kudo.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Message */}
              <div className="flex-1 mb-3">
                {kudo.message ? (
                  <div className="flex gap-2">
                    <Quote className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-200 italic line-clamp-3 leading-relaxed">
                      "{kudo.message}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Mendapat apresiasi atas dedikasi {kudo.category}.</p>
                )}
              </div>

              {/* Sender & Receiver Card */}
              <div className="flex items-center justify-between py-2 border-y border-zinc-800/60 text-[10px] mb-2.5">
                <div className="flex items-center gap-1.5 overflow-hidden max-w-[130px]">
                  <img 
                    src={kudo.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kudo.sender_id}`}
                    alt="Sender"
                    className="w-5 h-5 rounded-full bg-zinc-800 shrink-0"
                  />
                  <span className="text-zinc-400 truncate">
                    Oleh <strong className="text-zinc-300 font-bold">{kudo.sender_name}</strong>
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 overflow-hidden max-w-[130px]">
                  <span className="text-zinc-400 truncate text-right">
                    Ke <strong className="text-emerald-400 font-bold">{kudo.receiver_name}</strong>
                  </span>
                  <img 
                    src={kudo.receiver_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kudo.receiver_id}`}
                    alt="Receiver"
                    className="w-5 h-5 rounded-full bg-zinc-800 shrink-0 border border-emerald-500/30"
                  />
                </div>
              </div>

              {/* Social Reaction Bar */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {/* Clap */}
                  <button
                    onClick={() => handleToggleReaction(kudo.id, 'clap')}
                    disabled={!currentWorkerId || reactionLoading === `${kudo.id}-clap`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition active:scale-90 cursor-pointer ${
                      reactions.userReactions.includes('clap')
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                    }`}
                    title="Beri Aplaus (Clap)"
                  >
                    <span>👏</span>
                    <span className="text-[10px]">{reactions.clap > 0 ? reactions.clap : ''}</span>
                  </button>

                  {/* Muscle / Solid */}
                  <button
                    onClick={() => handleToggleReaction(kudo.id, 'muscle')}
                    disabled={!currentWorkerId || reactionLoading === `${kudo.id}-muscle`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition active:scale-90 cursor-pointer ${
                      reactions.userReactions.includes('muscle')
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                    }`}
                    title="Beri Solid (Respect)"
                  >
                    <span>💪</span>
                    <span className="text-[10px]">{reactions.muscle > 0 ? reactions.muscle : ''}</span>
                  </button>

                  {/* Star / Mantap */}
                  <button
                    onClick={() => handleToggleReaction(kudo.id, 'star')}
                    disabled={!currentWorkerId || reactionLoading === `${kudo.id}-star`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition active:scale-90 cursor-pointer ${
                      reactions.userReactions.includes('star')
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                        : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                    }`}
                    title="Beri Mantap (Star)"
                  >
                    <span>⭐</span>
                    <span className="text-[10px]">{reactions.star > 0 ? reactions.star : ''}</span>
                  </button>
                </div>

                <span className="text-[10px] text-zinc-600 font-medium">
                  +{kudo.points_awarded || 25} PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
