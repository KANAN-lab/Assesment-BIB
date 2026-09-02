import React, { useEffect, useState } from 'react';
import { KudoEntity } from '../types/kudos';
import { KudoService } from '../lib/kudoService';
import { supabase } from '../lib/supabaseClient';
import { Award, Loader2, Quote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export function KudoWall() {
  const [kudos, setKudos] = useState<KudoEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKudos();

    // Subscribe to new kudos
    const channel = supabase
      .channel('kudo_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'worker_kudos' },
        (payload) => {
          // Re-fetch to get the join names instead of just pushing the payload
          fetchKudos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchKudos = async () => {
    setLoading(true);
    const data = await KudoService.getRecentKudos(10);
    setKudos(data);
    setLoading(false);
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
        <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">Jadilah yang pertama mengirimkan Kudo ke rekan Anda!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Award className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Tembok Apresiasi</h3>
      </div>
      
      {/* Horizontal Scroll Area */}
      <div className="flex overflow-x-auto snap-x gap-4 pb-4 scrollbar-hide">
        {kudos.map(kudo => (
          <div 
            key={kudo.id} 
            className="snap-start shrink-0 w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col"
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1.5 ${getCategoryColor(kudo.category)}`}>
                <span>{getCategoryIcon(kudo.category)}</span>
                {kudo.category}
              </div>
              <span className="text-[10px] text-zinc-500">
                {formatDistanceToNow(new Date(kudo.created_at), { addSuffix: true, locale: localeId })}
              </span>
            </div>
            
            <div className="flex-1 mb-3">
              {kudo.message ? (
                <div className="flex gap-2">
                  <Quote className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-300 italic line-clamp-3">
                    "{kudo.message}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Mendapat apresiasi atas {kudo.category}.</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 overflow-hidden">
                <img 
                  src={kudo.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kudo.sender_id}`}
                  alt="Sender"
                  className="w-5 h-5 rounded-full bg-zinc-800 shrink-0"
                />
                <span className="text-[10px] text-zinc-400 truncate">Dari <strong className="text-zinc-300">{kudo.sender_name}</strong></span>
              </div>
              
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-zinc-400 truncate">Ke <strong className="text-emerald-400">{kudo.receiver_name}</strong></span>
                <img 
                  src={kudo.receiver_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${kudo.receiver_id}`}
                  alt="Receiver"
                  className="w-5 h-5 rounded-full bg-zinc-800 shrink-0 border border-emerald-500/30"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
