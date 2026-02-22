import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, Download, Calendar as CalendarIcon, DollarSign, Clock, MoreVertical, Edit2, Trash2, FileDown } from 'lucide-react';
import { Service } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.text('Relatório de Escala de Serviço', 14, 15);
    
    const tableData = filteredServices.map(s => [
      format(parseISO(s.date), 'dd/MM/yyyy'),
      s.type_name,
      `${s.start_time} - ${s.end_time}`,
      `R$ ${(s.value || 0).toFixed(2)}`,
      s.notes || ''
    ]);

    doc.autoTable({
      head: [['Data', 'Tipo', 'Horário', 'Valor', 'Observações']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    const total = filteredServices.reduce((acc, s) => acc + (s.value || 0), 0);
    doc.text(`Total Acumulado: R$ ${(total || 0).toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    
    doc.save('relatorio-escala.pdf');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Serviços</h2>
          <p className="text-neutral-500">{filteredServices.length} registros encontrados</p>
        </div>
        <button 
          onClick={exportToPDF}
          className="bg-[#171717] border border-[#262626] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          <FileDown size={18} />
          Exportar PDF
        </button>
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
            className="w-full bg-[#171717] border border-[#262626] rounded-xl py-2.5 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#171717] border border-[#262626] rounded-xl py-2.5 pl-10 pr-8 text-white focus:border-blue-500 outline-none transition-all appearance-none"
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
            <div key={service.id} className="bg-[#171717] border border-[#262626] rounded-2xl p-5 hover:border-neutral-700 transition-all group">
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
                      <h4 className="text-lg font-bold text-white">{service.type_name}</h4>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase tracking-wider">
                        {service.date}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-blue-500" />
                        {service.start_time} - {service.end_time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign size={14} className="text-green-500" />
                        R$ {(service.value || 0).toFixed(2)}
                      </span>
                    </div>
                    {service.notes && (
                      <p className="mt-2 text-sm text-neutral-400 italic">"{service.notes}"</p>
                    )}
                  </div>
                </div>
                
                <div className="flex sm:flex-col justify-between items-end gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onEdit(service)}
                      className="p-2 bg-neutral-800 hover:bg-blue-600/20 hover:text-blue-500 rounded-xl text-neutral-400 transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(service.id)}
                      className="p-2 bg-neutral-800 hover:bg-red-600/20 hover:text-red-500 rounded-xl text-neutral-400 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white">R$ {(service.value || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-[#171717] rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-700">
              <Search size={40} />
            </div>
            <h3 className="text-lg font-medium text-neutral-400">Nenhum serviço encontrado</h3>
            <p className="text-neutral-600 text-sm">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
