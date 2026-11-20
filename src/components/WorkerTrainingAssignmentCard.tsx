import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  GraduationCap,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  TrainingAssignmentService,
  TrainingAssignmentRecord,
} from '../domain/TrainingAssignmentService';

interface WorkerTrainingAssignmentCardProps {
  workerId: string;
  onOpenSopModule: (moduleCode: string) => void;
}

export const WorkerTrainingAssignmentCard: React.FC<WorkerTrainingAssignmentCardProps> = ({
  workerId,
  onOpenSopModule,
}) => {
  const [assignments, setAssignments] = useState<TrainingAssignmentRecord[]>([]);

  const loadAssignments = useCallback(() => {
    if (!workerId) return;
    const active = TrainingAssignmentService.getActiveAssignmentsForWorker(workerId);
    setAssignments(active);
  }, [workerId]);

  useEffect(() => {
    loadAssignments();

    const handleUpdate = () => {
      loadAssignments();
    };

    window.addEventListener('bib_training_assignments_updated', handleUpdate);
    window.addEventListener('gappy_notification_updated', handleUpdate);

    return () => {
      window.removeEventListener('bib_training_assignments_updated', handleUpdate);
      window.removeEventListener('gappy_notification_updated', handleUpdate);
    };
  }, [loadAssignments]);

  if (!assignments || assignments.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated p-4 sm:p-5 border border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-zinc-950 to-zinc-900 shadow-xl relative overflow-hidden animate-fade-in mb-6">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg animate-pulse">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Tugas Re-Training Kompetensi Wajib</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {assignments.length} Modul
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Diterbitkan otomatis dari hasil evaluasi audit BIB untuk peningkatan standar kepatuhan K3.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5 relative z-10">
        {assignments.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900/90 border border-zinc-800 hover:border-rose-500/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-rose-300">
                  {item.moduleCode}
                </span>
                <span className="text-xs font-bold text-white group-hover:text-rose-200 transition">
                  {item.moduleTitle}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1 text-amber-400/90">
                  <AlertTriangle className="w-3 h-3" />
                  Kategori Lemah: <strong>{item.category}</strong>
                  {item.gapPercentage !== undefined && ` (Gap ${item.gapPercentage}%)`}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Batas Waktu: <strong>{item.deadlineDate}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSopModule(item.moduleCode)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 shrink-0 self-start sm:self-center hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pelajari Modul</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
