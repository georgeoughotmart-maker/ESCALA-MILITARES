import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
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
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

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

  // Automatically update selected day when month changes to first of month (if not current month)
  useEffect(() => {
    const today = new Date();
    if (isSameMonth(currentDate, today)) {
      setSelectedDay(today);
    } else {
      setSelectedDay(startOfMonth(currentDate));
    }
  }, [currentDate]);

  const handleDayClick = (day: Date) => {
    if (isSameDay(day, selectedDay)) {
      onAddService(day);
    } else {
      setSelectedDay(day);
    }
  };

  const selectedDayServices = getServicesForDay(selectedDay);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-auto flex justify-between items-center sm:block">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-left">Calendário</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-blue-600 font-bold capitalize text-sm sm:text-base">{format(currentDate, 'MMMM', { locale: ptBR })}</span>
              <span className="text-slate-400 font-medium text-sm sm:text-base">{format(currentDate, 'yyyy')}</span>
            </div>
          </div>
          <p className="hidden sm:block text-[10px] text-blue-600/60 uppercase tracking-widest mt-2 font-bold italic">Clique duas vezes em um dia para adicionar um serviço</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl p-1 sm:p-1.5">
          <button onClick={prevMonth} className="p-2 sm:p-2.5 hover:bg-blue-600/10 hover:text-blue-600 rounded-lg text-slate-400 transition-all active:scale-90">
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg transition-all shadow-md hover:bg-blue-500"
          >
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 sm:p-2.5 hover:bg-blue-600/10 hover:text-blue-600 rounded-lg text-slate-400 transition-all active:scale-90">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Grid wrapper - completely width-responsive on mobile without horizontal scroll */}
      <div className="w-full">
        <div className="calendar-grid w-full">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
            <div 
              key={day} 
              className={`p-1.5 sm:p-3 text-center text-[8px] sm:text-[10px] font-black uppercase tracking-wider border-b border-slate-200 ${
                idx === 0 || idx === 6 ? 'text-red-500 bg-red-50/50' : 'text-slate-500 bg-slate-50'
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
            const isSelected = isSameDay(day, selectedDay);

            return (
              <div 
                key={i} 
                className={`calendar-day cursor-pointer group relative flex flex-col justify-between p-1 sm:p-2.5 min-h-[52px] sm:min-h-[120px] transition-all hover:bg-slate-50 ${
                  !isCurrentMonth ? 'opacity-30 bg-slate-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50/20' : ''} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-20 scale-[1.01] shadow-sm' : ''
                }`}
                onClick={() => handleDayClick(day)}
                style={primaryService && window.innerWidth >= 640 ? { 
                  backgroundColor: `${primaryService.type_color}10`,
                  borderLeft: `4px solid ${primaryService.type_color}`,
                } : undefined}
              >
                <div className="flex justify-between items-center mb-0.5 sm:mb-2">
                  <span className={`day-number text-xs sm:text-sm font-bold ${
                    isToday ? 'bg-blue-600 text-white w-5 h-5 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/30' : (isSelected ? 'text-blue-600 font-extrabold' : (isCurrentMonth ? 'text-slate-900' : 'text-slate-300'))
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddService(day);
                      }}
                      className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-600/20 hover:text-blue-500 rounded-lg text-slate-400 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {/* Desktop: Full service badges */}
                <div className="hidden sm:block space-y-1 mt-1">
                  {dayServices.slice(0, 3).map(service => (
                    <div
                      key={service.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditService(service);
                      }}
                      className="group/item relative text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-black/5 hover:border-black/20 truncate cursor-pointer transition-all shadow-sm flex items-center"
                      style={{ 
                        backgroundColor: service.type_color, 
                        color: '#ffffff',
                        textShadow: '0 1px 1px rgba(0,0,0,0.1)'
                      }}
                    >
                      <span className="truncate block flex-1">{service.type_name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteService(service.id);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-black/15 rounded text-white transition-all ml-1 shrink-0"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {dayServices.length > 3 && (
                    <p className="text-[9px] text-slate-400 text-center font-bold">+{dayServices.length - 3} mais</p>
                  )}
                </div>

                {/* Mobile: Minimalist color indicator dots */}
                <div className="flex sm:hidden flex-wrap justify-center gap-1 mt-0.5">
                  {dayServices.slice(0, 3).map(service => (
                    <span 
                      key={service.id} 
                      className="w-1.5 h-1.5 rounded-full shadow-sm" 
                      style={{ backgroundColor: service.type_color }} 
                    />
                  ))}
                  {dayServices.length > 3 && (
                    <span className="text-[8px] text-slate-400 font-black leading-none">+</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon size={18} className="text-blue-600" />
              Serviços do Dia
            </h3>
            <p className="text-slate-500 text-xs font-bold capitalize mt-1">
              {format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          
          <button
            onClick={() => onAddService(selectedDay)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus size={14} />
            Novo Serviço
          </button>
        </div>

        <div className="space-y-2.5">
          {selectedDayServices.length > 0 ? (
            selectedDayServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between hover:border-blue-100 transition-all shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shrink-0"
                    style={{ backgroundColor: service.type_color }}
                  >
                    {service.type_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900 truncate">{service.type_name}</p>
                      <span className="inline-flex items-center gap-1 text-[9px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0">
                        <Clock size={10} className="text-blue-600" />
                        {service.start_time} - {service.end_time}
                      </span>
                    </div>
                    {service.notes && (
                      <p className="text-xs text-slate-500 italic mt-1 font-medium truncate">"{service.notes}"</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
                  <div className="text-right">
                    <p className="font-extrabold text-sm text-slate-950">R$ {(service.value || 0).toFixed(2)}</p>
                    <span className="text-[9px] font-bold uppercase text-green-600 tracking-wider">Registrado</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onEditService(service)}
                      className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-blue-100"
                      title="Editar"
                    >
                      <Edit2 size={15} className="text-slate-500" />
                    </button>
                    <button 
                      onClick={() => onDeleteService(service.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all border border-transparent hover:border-red-100"
                      title="Excluir"
                    >
                      <Trash2 size={15} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CalendarIcon size={24} className="text-slate-300 mb-1.5 animate-pulse" />
              <p className="text-slate-400 text-xs font-bold">Nenhum serviço agendado para este dia.</p>
              <button
                onClick={() => onAddService(selectedDay)}
                className="text-[10px] mt-2 text-blue-600 font-extrabold hover:underline"
              >
                Registrar agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-full mb-1 sm:mb-2">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-500">Categorias de Escalas</p>
        </div>
        {serviceTypes.map(type => (
          <div key={type.id} className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full" style={{ backgroundColor: type.color }}></div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700">{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
