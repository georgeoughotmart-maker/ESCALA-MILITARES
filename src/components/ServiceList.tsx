import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Calendar as CalendarIcon, DollarSign, Clock, Edit2, Trash2 } from 'lucide-react';
import { Service } from '../types';

interface ServiceListProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
}

export default function ServiceList({ services, onEdit, onDelete }: ServiceListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredServices = services.filter(s => {
    const matchesSearch = s.type_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || s.type_name?.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Serviços</h2>
          <p className="text-slate-500 font-medium">{filteredServices.length} registros encontrados</p>
          <p className="text-[10px] text-blue-600/60 uppercase tracking-widest mt-1 font-bold">Visualize e gerencie seu histórico detalhado de escalas</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por tipo ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-8 text-slate-900 focus:border-blue-500 outline-none transition-all appearance-none shadow-sm"
          >
            <option value="all">Todos os Tipos</option>
            <option value="ordinário">Ordinário</option>
            <option value="pjes">PJES</option>
            <option value="diária">Diária</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div key={service.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-200 transition-all group shadow-sm hover:shadow-md">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg"
                    style={{ backgroundColor: service.type_color }}
                  >
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-slate-900">{service.type_name}</h4>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                        {service.date}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-blue-600" />
                        {service.start_time} - {service.end_time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign size={14} className="text-green-600" />
                        R$ {(service.value || 0).toFixed(2)}
                      </span>
                    </div>
                    {service.notes && (
                      <p className="mt-2 text-sm text-slate-500 italic">"{service.notes}"</p>
                    )}
                  </div>
                </div>
                
                <div className="flex sm:flex-col justify-between items-end gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEdit(service)}
                      className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-slate-400 transition-all border border-slate-100"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(service.id)}
                      className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-all border border-slate-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900">R$ {(service.value || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum serviço encontrado</h3>
            <p className="text-slate-500 text-sm font-medium">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
