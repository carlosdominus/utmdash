import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';
import { Filter as FilterIcon, Table as TableIcon, LayoutDashboard, Search, X, ChevronDown, DollarSign, TrendingUp, Receipt, Wallet, Target, CheckCircle2 } from 'lucide-react';
import { DashboardData } from '../types';

interface DashboardProps {
  data: DashboardData;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

// Mapa de cores para evitar classes dinâmicas que o Tailwind CDN não detecta
const colorMap: Record<string, { bg: string, text: string, lightBg: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-600', lightBg: 'bg-amber-50' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', lightBg: 'bg-indigo-50' },
};

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'table'>('visual');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Identificação Inteligente de Colunas Financeiras
  const findHeader = (keys: string[]) => 
    data.headers.find(h => keys.some(k => h.toLowerCase() === k.toLowerCase() || h.toLowerCase().includes(k.toLowerCase())));

  const colFaturamento = findHeader(['faturamento', 'receita', 'faturado']);
  const colGastos = findHeader(['gastos', 'gasto', 'custo', 'investimento', 'spend']);
  const colRoas = findHeader(['roas']);
  const colData = findHeader(['data', 'periodo']);
  const colAnuncio = findHeader(['nome do ad', 'anúncio', 'ad name']);

  // Colunas para filtros (Multi-seleção)
  const filterableColumns = data.headers.filter(h => 
    ['data', 'nome do ad', 'bm-ca-pf (teste)', 'status', 'campanha', 'ad set'].some(t => h.toLowerCase().includes(t))
  );

  // Valores únicos para cada filtro
  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    filterableColumns.forEach(col => {
      const vals = Array.from(new Set<string>(data.rows.map(r => String(r[col] ?? '')).filter(v => v !== '')));
      map[col] = vals.sort();
    });
    return map;
  }, [data.rows, filterableColumns]);

  // Lógica de Multi-seleção
  const toggleFilter = (column: string, value: string) => {
    setFilters(prev => {
      const current = prev[column] || [];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [column]: updated.length > 0 ? updated : [] };
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Filtragem dos dados
  const filteredRows = useMemo(() => {
    return data.rows.filter(row => {
      const matchesFilters = Object.entries(filters).every(([col, vals]) => {
        const selectedValues = vals as string[];
        if (!selectedValues || selectedValues.length === 0) return true;
        return selectedValues.includes(String(row[col]));
      });
      const matchesSearch = searchTerm === '' || data.headers.some(h => 
        String(row[h]).toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesFilters && matchesSearch;
    });
  }, [data.rows, filters, searchTerm]);

  // Cálculo de KPIs
  const stats = useMemo(() => {
    let fat = 0, gas = 0, roasSum = 0, roasCount = 0;
    
    filteredRows.forEach(row => {
      const f = Number(row[colFaturamento || '']) || 0;
      const g = Number(row[colGastos || '']) || 0;
      fat += f;
      gas += g;
      
      const r = Number(row[colRoas || '']);
      if (typeof r === 'number' && !isNaN(r) && row[colRoas || ''] !== '') {
        roasSum += r;
        roasCount++;
      }
    });

    const imp = fat * 0.06;
    const luc = fat - gas - imp;
    const avgRoas = roasCount > 0 ? roasSum / roasCount : (gas > 0 ? fat / gas : 0);
    
    return { fat, gas, imp, luc, roas: avgRoas };
  }, [filteredRows, colFaturamento, colGastos, colRoas]);

  const categoricalHeaders = data.headers.filter(h => 
    data.types[h] === 'string' && !h.toLowerCase().includes('id')
  );
  const metricHeaders = data.headers.filter(h => 
    data.types[h] === 'number' && !h.toLowerCase().includes('id')
  );
  
  const [chartCat, setChartCat] = useState(colAnuncio || colData || categoricalHeaders[0] || '');
  const [chartMet, setChartMet] = useState(colRoas || colFaturamento || metricHeaders[0] || '');

  const chartData = useMemo(() => {
    if (!chartCat || !chartMet) return [];
    const aggregated: Record<string, number> = {};
    filteredRows.forEach(row => {
      const k = String(row[chartCat]) || 'N/A';
      const v = Number(row[chartMet]) || 0;
      aggregated[k] = (aggregated[k] || 0) + v;
    });
    return Object.entries(aggregated)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredRows, chartCat, chartMet]);

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FilterIcon className="w-5 h-5" /></div>
            <div>
              <h4 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Filtros</h4>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearAllFilters}
              className="px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center"
            >
              <X className="w-4 h-4 mr-1" /> LIMPAR
            </button>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filterableColumns.map(col => (
            <div key={col} className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{col}</label>
              <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50 space-y-1 scrollbar-thin">
                {uniqueValuesMap[col]?.map(val => (
                  <button
                    key={val}
                    onClick={() => toggleFilter(col, val)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-[10px] font-bold transition-all text-left ${
                      (filters[col] as string[])?.includes(val) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate flex-1">{val}</span>
                    {(filters[col] as string[])?.includes(val) && <CheckCircle2 className="w-3 h-3 ml-1 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Faturamento" value={formatBRL(stats.fat)} icon={<TrendingUp className="w-4 h-4" />} color="emerald" tag="Bruto" />
        <StatCard title="Investido" value={formatBRL(stats.gas)} icon={<Wallet className="w-4 h-4" />} color="rose" tag="Spend" />
        <StatCard title="Impostos" value={formatBRL(stats.imp)} icon={<Receipt className="w-4 h-4" />} color="amber" tag="6%" />
        <StatCard title="ROAS Médio" value={`${stats.roas.toFixed(2)}x`} icon={<Target className="w-4 h-4" />} color="indigo" tag="ROI" />
        <div className="bg-indigo-600 p-5 rounded-[28px] shadow-xl text-white relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Lucro Estimado</p>
            <h3 className="text-2xl font-black tracking-tighter">{formatBRL(stats.luc)}</h3>
            <p className="text-[11px] font-bold text-indigo-100 mt-2">Margem: {stats.fat > 0 ? ((stats.luc/stats.fat)*100).toFixed(1) : 0}%</p>
          </div>
          <DollarSign className="absolute -bottom-2 -right-2 w-16 h-16 text-white opacity-10" />
        </div>
      </div>

      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
        <TabButton active={activeTab === 'visual'} onClick={() => setActiveTab('visual')} label="Visual" icon={<LayoutDashboard className="w-4 h-4 mr-2" />} />
        <TabButton active={activeTab === 'table'} onClick={() => setActiveTab('table')} label="Dados" icon={<TableIcon className="w-4 h-4 mr-2" />} />
      </div>

      {activeTab === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
            <ChartControl label="Categoria:" val={chartCat} setVal={setChartCat} options={categoricalHeaders} />
            <ChartControl label="Métrica:" val={chartMet} setVal={setChartMet} options={metricHeaders} />
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Top Performance</h4>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Tendência</h4>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...chartData].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={5} dot={{r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-black text-slate-800 tracking-tighter uppercase text-sm">Auditoria ({filteredRows.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {data.headers.map(h => (
                    <th key={h} className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                    {data.headers.map(h => {
                      const isFinancial = h.toLowerCase().match(/(faturamento|gasto|lucro|imposto|spend|receita)/);
                      const isRoas = h.toLowerCase().includes('roas');
                      const isPercentage = h.toLowerCase().includes('%');
                      return (
                        <td key={h} className="px-6 py-3 text-slate-600 font-bold whitespace-nowrap">
                          {typeof row[h] === 'number' && isFinancial ? formatBRL(row[h]) : 
                           typeof row[h] === 'number' && (isRoas || isPercentage) ? `${row[h].toLocaleString('pt-BR')}${isPercentage ? '%' : 'x'}` : 
                           row[h]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, tag }: any) => {
  const styles = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm relative group overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-1.5 ${styles.lightBg} ${styles.text} rounded-lg`}>{icon}</div>
          <span className={`text-[9px] font-black uppercase ${styles.lightBg} ${styles.text} px-2 py-0.5 rounded-full`}>{tag}</span>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl font-black text-slate-800 tracking-tighter truncate">{value}</h3>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {icon} {label}
  </button>
);

const ChartControl = ({ label, val, setVal, options }: any) => (
  <div className="flex items-center space-x-3">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="relative">
      <select 
        value={val} 
        onChange={e => setVal(e.target.value)}
        className="appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none pr-8 cursor-pointer"
      >
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

export default Dashboard;