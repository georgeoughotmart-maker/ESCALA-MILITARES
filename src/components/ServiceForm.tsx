import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, DollarSign, FileText, Bell, Trash2 } from 'lucide-react';
import { Service, ServiceType } from '../types';
import { format } from 'date-fns';

interface ServiceFormProps {
  service?: Service | null;
  serviceTypes: ServiceType[];
  initialDate?: Date;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: number) => void;
}

export default function ServiceForm({ service, serviceTypes, initialDate, onClose, onSave, onDelete }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    type_id: service?.type_id || (serviceTypes.length > 0 ? serviceTypes[0].id : 0),
    date: service?.date || format(initialDate || new Date(), 'yyyy-MM-dd'),
    start_time: service?.start_time || '08:00',
    end_time: service?.end_time || '08:00',
    value: service?.value || 0,
    notes: service?.notes || '',
    reminder_enabled: service?.reminder_enabled || false,
    reminder_before_hours: service?.reminder_before_hours || 1,
  });

  useEffect(() => {
    if (!service && formData.type_id) {
      const type = serviceTypes.find(t => t.id === Number(formData.type_id));
      if (type) {
        setFormData(prev => ({ ...prev, value: type.default_value }));
        
        // Auto-calculate end time based on workload
        if (type.default_workload === '24h') {
          setFormData(prev => ({ ...prev, end_time: prev.start_time }));
        } else if (type.default_workload.includes('h')) {
          const hours = parseInt(type.default_workload);
          const [h, m] = formData.start_time.split(':').map(Number);
          const endH = (h + hours) % 24;
          setFormData(prev => ({ ...prev, end_time: `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` }));
        }
      }
    }
  }, [formData.type_id, serviceTypes, service]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, type_id: Number(formData.type_id) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#171717] border border-[#262626] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-[#262626] flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{service ? 'Editar Serviço' : 'Novo Serviço'}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tipo de Serviço</label>
            <select
              value={formData.type_id}
              onChange={(e) => setFormData({ ...formData, type_id: Number(e.target.value) })}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none transition-all"
            >
              {serviceTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Data</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Início</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Fim</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Observações</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-neutral-500" size={18} />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all min-h-[80px]"
                placeholder="Detalhes adicionais..."
              />
            </div>
          </div>

          <div className="p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-500" />
                <span className="text-sm font-medium text-white">Ativar Lembrete</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.reminder_enabled} 
                  onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {formData.reminder_enabled && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Antecedência</label>
                <select
                  value={formData.reminder_before_hours}
                  onChange={(e) => setFormData({ ...formData, reminder_before_hours: Number(e.target.value) })}
                  className="w-full bg-[#171717] border border-[#262626] rounded-lg py-2 px-3 text-sm text-white outline-none"
                >
                  <option value={1}>1 hora antes</option>
                  <option value={6}>6 horas antes</option>
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            {service && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(service.id)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Excluir
              </button>
            )}
            <button
              type="submit"
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              {service ? 'Salvar Alterações' : 'Adicionar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
