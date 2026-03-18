import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Service, ServiceType } from '../types';

interface CalendarProps {
  services: Service[];
  serviceTypes: ServiceType[];
  onAddService: (date: Date) => void;
  onEditService: (service: Service) => void;
  onDeleteService: (id: number) => void;
}

export default function Calendar({ services, serviceTypes, onAddService, onEditService, onDeleteService }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getServicesForDay = (day: Date) => {
    return services.filter(s => {
      try {
        return isSameDay(parseISO(s.date), day);
      } catch (e) {
        return false;
      }
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#171717] to-[#1a1a1a] p-6 rounded-2xl border border-[#262626] shadow-xl">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Calendário</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-blue-500 font-bold capitalize">{format(currentDate, 'MMMM', { locale: ptBR })}</span>
            <span className="text-neutral-500 font-medium">{format(currentDate, 'yyyy')}</span>
          </div>
          <p className="text-[10px] text-blue-500/60 uppercase tracking-widest mt-2 font-bold">Clique em um dia para adicionar um serviço</p>
        </div>
        <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#262626] rounded-xl p-1.5 shadow-inner">
          <button onClick={prevMonth} className="p-2.5 hover:bg-blue-600/10 hover:text-blue-500 rounded-lg text-neutral-400 transition-all active:scale-90">
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-600 rounded-lg transition-all shadow-lg hover:shadow-blue-600/20"
          >
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2.5 hover:bg-blue-600/10 hover:text-blue-500 rounded-lg text-neutral-400 transition-all active:scale-90">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="calendar-grid min-w-[600px] sm:min-w-0">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
          <div 
            key={day} 
            className={`p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] border-b border-[#262626] ${
              idx === 0 || idx === 6 ? 'text-red-500/70 bg-red-500/5' : 'text-neutral-500 bg-[#171717]'
            }`}
          >
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const dayServices = getServicesForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const primaryService = dayServices[0];

          return (
            <div 
              key={i} 
              className={`calendar-day group relative ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${primaryService ? 'has-service' : ''}`}
              onClick={() => onAddService(day)}
              style={primaryService ? { 
                backgroundColor: `${primaryService.type_color}10`,
                borderLeft: `4px solid ${primaryService.type_color}`,
                boxShadow: `inset 4px 0 10px -5px ${primaryService.type_color}`
              } : undefined}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`day-number text-sm font-bold ${isToday ? 'text-white' : 'text-neutral-500'}`}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-600/20 hover:text-blue-500 rounded-lg text-neutral-600 transition-all">
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {dayServices.map(service => (
                  <div
                    key={service.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditService(service);
                    }}
                    className="group/item relative text-[10px] font-bold px-2 py-1 rounded-lg border border-transparent hover:border-white/20 truncate cursor-pointer transition-all shadow-sm"
                    style={{ 
                      backgroundColor: `${service.type_color}25`, 
                      color: service.type_color,
                      borderLeft: `2px solid ${service.type_color}`
                    }}
                  >
                    <span className="truncate block pr-4">{service.type_name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteService(service.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 rounded-md text-red-500 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-6 bg-[#171717]/50 rounded-2xl border border-[#262626] backdrop-blur-sm">
        <div className="w-full mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Legenda de Serviços</p>
        </div>
        {serviceTypes.map(type => (
          <div key={type.id} className="flex items-center gap-2 bg-[#0a0a0a] px-3 py-1.5 rounded-full border border-[#262626] shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: type.color, boxShadow: `0 0 10px ${type.color}40` }}></div>
            <span className="text-xs font-bold text-neutral-300">{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
