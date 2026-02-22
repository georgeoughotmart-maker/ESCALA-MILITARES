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
}

export default function Dashboard({ stats, recentServices }: DashboardProps) {
  const { monthly, nextService } = stats;

  const chartData = recentServices.slice(0, 7).reverse().map(s => ({
    date: format(parseISO(s.date), 'dd/MM'),
    value: s.value
  }));

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-neutral-500">Resumo do seu serviço este mês</p>
        </div>
        <div className="w-10 h-10 bg-[#171717] border border-[#262626] rounded-full flex items-center justify-center text-neutral-400">
          <Bell size={20} />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          icon={DollarSign} 
          label="Ganhos Mensais" 
          value={`R$ ${monthly.total_value.toFixed(2)}`} 
          color="text-green-500" 
          bg="bg-green-500/10"
        />
        <StatCard 
          icon={Clock} 
          label="Horas Trabalhadas" 
          value={`${monthly.total_hours.toFixed(1)}h`} 
          color="text-blue-500" 
          bg="bg-blue-500/10"
        />
        <StatCard 
          icon={CalendarIcon} 
          label="Total de Serviços" 
          value={monthly.total_services.toString()} 
          color="text-purple-500" 
          bg="bg-purple-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Service */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Próximo Serviço
          </h3>
          {nextService ? (
            <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 relative overflow-hidden group">
              <div 
                className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: nextService.type_color }}
              />
              <div className="flex justify-between items-start mb-4">
                <span 
                  className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${nextService.type_color}20`, color: nextService.type_color }}
                >
                  {nextService.type_name}
                </span>
                <p className="text-xs text-neutral-500">{format(parseISO(nextService.date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
              </div>
              <h4 className="text-xl font-bold text-white mb-1">{nextService.type_name}</h4>
              <p className="text-neutral-400 text-sm mb-4">Início: {nextService.start_time || 'N/A'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
                <div className="flex items-center gap-2 text-green-500">
                  <DollarSign size={16} />
                  <span className="font-bold">R$ {nextService.value.toFixed(2)}</span>
                </div>
                <button className="text-blue-500 text-sm font-medium flex items-center gap-1 hover:underline">
                  Ver detalhes <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#171717] border border-[#262626] border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <CalendarIcon size={32} className="text-neutral-600 mb-2" />
              <p className="text-neutral-500 text-sm">Nenhum serviço agendado</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" />
            Ganhos Recentes
          </h3>
          <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#525252" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#525252" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3b82f6' : '#262626'} />
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
          <h3 className="text-lg font-semibold text-white">Serviços Recentes</h3>
          <button className="text-blue-500 text-sm font-medium hover:underline">Ver todos</button>
        </div>
        <div className="space-y-2">
          {recentServices.slice(0, 5).map((service) => (
            <div key={service.id} className="bg-[#171717] border border-[#262626] rounded-xl p-4 flex items-center justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: service.type_color }}
                >
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-white">{service.type_name}</p>
                  <p className="text-xs text-neutral-500">{format(parseISO(service.date), "d 'de' MMM", { locale: ptBR })} • {service.start_time || '--:--'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">R$ {service.value.toFixed(2)}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="bg-[#171717] border border-[#262626] rounded-2xl p-6 flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
