import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Clock, Calendar as CalendarIcon, DollarSign, ArrowUpRight, Bell } from 'lucide-react';
import { DashboardStats, Service } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  recentServices: Service[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export default function Dashboard({ stats, recentServices, selectedMonth, onMonthChange }: DashboardProps) {
  const { monthly, nextService } = stats;

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      value: d.toISOString().slice(0, 7),
      label: format(d, 'MMMM yyyy', { locale: ptBR })
    };
  });

  const chartData = recentServices
    .filter(s => s.date.startsWith(selectedMonth))
    .slice(0, 7)
    .reverse()
    .map(s => ({
      date: format(parseISO(s.date), 'dd/MM'),
      value: s.value
    }));

  const breakdown = recentServices
    .filter(s => s.date.startsWith(selectedMonth))
    .reduce((acc: any, s) => {
      if (!acc[s.type_name]) {
        acc[s.type_name] = { name: s.type_name, value: 0, color: s.type_color, count: 0 };
      }
      acc[s.type_name].value += s.value;
      acc[s.type_name].count += 1;
      return acc;
    }, {});

  const breakdownArray = Object.values(breakdown).sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
            <div className="sm:hidden w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400">
              <Bell size={16} />
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">{last12Months.find(m => m.value === selectedMonth)?.label}</p>
          <p className="hidden sm:block text-[10px] text-blue-600/60 uppercase tracking-widest mt-1 font-bold">Acompanhe seus ganhos e produtividade mensal</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none capitalize shadow-sm"
          >
            {last12Months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <div className="hidden sm:flex w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 shrink-0 shadow-sm">
            <Bell size={20} />
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={DollarSign} 
          label="Ganhos no Período" 
          value={`R$ ${(monthly.total_value || 0).toFixed(2)}`} 
          color="text-green-500" 
          bg="bg-green-500/10"
          tooltip="Soma total dos valores de todos os serviços realizados neste mês."
        />
        <StatCard 
          icon={Clock} 
          label="Horas Trabalhadas" 
          value={`${(monthly.total_hours || 0).toFixed(1)}h`} 
          color="text-blue-500" 
          bg="bg-blue-500/10"
          tooltip="Total de horas acumuladas com base na carga horária dos serviços."
        />
        <StatCard 
          icon={CalendarIcon} 
          label="Total de Serviços" 
          value={monthly.total_services.toString()} 
          color="text-purple-500" 
          bg="bg-purple-500/10"
          tooltip="Quantidade total de escalas e serviços registrados no mês."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown by Type */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            Por Categoria
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
            {breakdownArray.length > 0 ? (
              breakdownArray.map((item: any) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-500 flex items-center gap-2 truncate pr-2 font-medium">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name} ({item.count})</span>
                    </span>
                    <span className="text-slate-900 font-bold shrink-0">R$ {item.value.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500" 
                      style={{ 
                        width: `${monthly.total_value > 0 ? (item.value / monthly.total_value) * 100 : 0}%`,
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-4 font-medium">Nenhum dado para este mês</p>
            )}
          </div>

          {/* Next Service (Desktop) */}
          <div className="hidden lg:block space-y-4 pt-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Próximo Serviço
            </h3>
            {nextService ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm transition-all hover:shadow-md">
                <div 
                  className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: nextService.type_color }}
                />
                <div className="flex justify-between items-start mb-4">
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${nextService.type_color}15`, color: nextService.type_color }}
                  >
                    {nextService.type_name}
                  </span>
                  <p className="text-xs text-slate-500 font-medium">{format(parseISO(nextService.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-1">{nextService.type_name}</h4>
                <p className="text-slate-500 text-sm mb-4 font-medium">Início: {nextService.start_time || 'N/A'}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-green-600">
                    <DollarSign size={16} />
                    <span className="font-bold">R$ {(nextService.value || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <CalendarIcon size={32} className="text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm font-medium">Nenhum serviço agendado</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Service (Below Breakdown on Mobile, separate logic) */}
        <div className="lg:hidden space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Próximo Serviço
          </h3>
          {nextService ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm">
              <div 
                className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: nextService.type_color }}
              />
              <div className="flex justify-between items-start mb-4">
                <span 
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${nextService.type_color}15`, color: nextService.type_color }}
                >
                  {nextService.type_name}
                </span>
                <p className="text-xs text-slate-500 font-medium">{format(parseISO(nextService.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-1">{nextService.type_name}</h4>
              <p className="text-slate-500 text-sm mb-4 font-medium">Início: {nextService.start_time || 'N/A'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-green-600">
                  <DollarSign size={16} />
                  <span className="font-bold">R$ {(nextService.value || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <CalendarIcon size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm font-medium">Nenhum serviço agendado</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-600" />
            Ganhos Recentes
          </h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 h-[280px] shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Services List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Serviços Recentes</h3>
          <button className="text-blue-600 text-sm font-bold hover:underline">Ver todos</button>
        </div>
        <div className="space-y-2">
          {recentServices.slice(0, 5).map((service) => (
            <div key={service.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: service.type_color }}
                >
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{service.type_name}</p>
                  <p className="text-xs text-slate-500 font-medium">{format(parseISO(service.date), "d 'de' MMM", { locale: ptBR })} • {service.start_time || '--:--'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900">R$ {(service.value || 0).toFixed(2)}</p>
                <p className="text-[10px] text-green-600 font-black uppercase tracking-wider">Pago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, tooltip }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex items-center gap-4 group relative shadow-sm hover:shadow-md transition-all">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bg} rounded-xl flex items-center justify-center ${color} shadow-sm`}>
        <Icon size={20} className="sm:w-6 sm:h-6" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg sm:text-2xl font-black text-slate-900">{value}</p>
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 shadow-xl text-center font-medium">
          {tooltip}
        </div>
      )}
    </div>
  );
}
