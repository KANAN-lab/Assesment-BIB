import React, { useState, useMemo } from 'react';
import { TableProperties, Search, Filter, ChevronDown } from 'lucide-react';
import { CompetencyItem } from '../../types/assessment';

interface AdminCompetencyMatrixPanelProps {
  competencyItems: CompetencyItem[];
}

export const AdminCompetencyMatrixPanel: React.FC<AdminCompetencyMatrixPanelProps> = ({
  competencyItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const categories = useMemo(() => {
    const set = new Set<string>();
    competencyItems.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [competencyItems]);

  const filteredItems = useMemo(() => {
    return competencyItems.filter((item) => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [competencyItems, selectedCategory, searchTerm]);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="font-bold text-white text-xs flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-emerald-400" />
            Master Matriks Kompetensi ({competencyItems.length} Item Resmi)
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Acuan evaluasi standar kompetensi pekerja operasional (PT. DAYA ANUGRAH MULYA)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kompetensi..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Competency Cards */}
      <div className="max-h-[600px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
            Tidak ada item kompetensi yang cocok dengan filter.
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-800 flex items-start gap-3 hover:border-zinc-700 transition"
            >
              <span className="text-[11px] text-zinc-500 font-mono w-6 shrink-0 pt-0.5 font-bold">
                #{idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase tracking-wide">
                    {item.type}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {item.category}
                  </span>
                </div>
                <h4 className="font-bold text-white text-xs leading-snug">{item.title}</h4>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.definition}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
