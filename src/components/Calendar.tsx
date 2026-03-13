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
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Calendário</h2>
          <p className="text-neutral-500 capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</p>
          <p className="text-[10px] text-blue-500/60 uppercase tracking-widest mt-1">Dica: Clique em um dia para adicionar um novo serviço</p>
        </div>
        <div className="flex items-center gap-2 bg-[#171717] border border-[#262626] rounded-xl p-1">
          <button onClick={prevMonth} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 rounded-lg transition-colors">
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="calendar-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="bg-[#171717] p-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500 border-b border-[#262626]">
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
                backgroundColor: `${primaryService.type_color}15`,
                borderLeft: `3px solid ${primaryService.type_color}`
              } : undefined}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`day-number text-sm font-medium ${isToday ? 'text-white' : 'text-neutral-400'}`}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-700 rounded text-neutral-500 transition-all">
                    <Plus size={12} />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {dayServices.map(service => (
                  <div
                    key={service.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditService(service);
                    }}
                    className="group/item relative text-[10px] px-1.5 py-0.5 rounded border border-transparent hover:border-white/20 truncate cursor-pointer transition-all"
                    style={{ backgroundColor: `${service.type_color}20`, color: service.type_color }}
                  >
                    <span className="truncate block pr-3">{service.type_name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteService(service.id);
                      }}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-red-500/20 rounded text-red-500 transition-all"
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-[#262626]">
        {serviceTypes.map(type => (
          <div key={type.id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
            <span className="text-xs text-neutral-400">{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
