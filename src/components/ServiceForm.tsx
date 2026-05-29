import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, DollarSign, FileText, Bell, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { Service, ServiceType } from '../types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

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

  const hasTypes = serviceTypes.length > 0;

  useEffect(() => {
    if (!service && !formData.type_id && serviceTypes.length > 0) {
      setFormData(prev => ({ ...prev, type_id: serviceTypes[0].id }));
    }
  }, [serviceTypes, service, formData.type_id]);

  useEffect(() => {
    if (formData.type_id) {
      const type = serviceTypes.find(t => t.id === Number(formData.type_id));
      if (type) {
        // Only auto-set value if we're creating a new service
        if (!service) {
          setFormData(prev => ({ ...prev, value: type.default_value }));
        }
        
        // Auto-calculate end time based on workload
        if (type.default_workload === '24h') {
          setFormData(prev => ({ ...prev, end_time: formData.start_time }));
        } else if (type.default_workload.includes('h')) {
          const hours = parseInt(type.default_workload);
          const [h, m] = formData.start_time.split(':').map(Number);
          const endH = (h + hours) % 24;
          setFormData(prev => ({ ...prev, end_time: `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` }));
        }
      }
    }
  }, [formData.type_id, serviceTypes, service, formData.start_time]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, type_id: Number(formData.type_id) });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900">{service ? 'Editar Serviço' : 'Novo Serviço'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Serviço</label>
            <p className="text-[10px] text-slate-500 mb-2 font-medium">Selecione a categoria da sua escala ou serviço</p>
            {hasTypes ? (
              <select
                value={formData.type_id}
                onChange={(e) => setFormData({ ...formData, type_id: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:border-blue-500 outline-none transition-all font-medium"
              >
                {serviceTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-red-600 font-bold">Nenhum tipo de serviço cadastrado.</p>
                <Link 
                  to="/settings" 
                  onClick={onClose}
                  className="flex items-center gap-2 text-xs font-black text-white bg-red-600 hover:bg-red-500 px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <SettingsIcon size={14} />
                  Configurar Tipos
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="0,00"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Valor que você receberá por este serviço</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Início</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fim</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Observações</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-blue-500 outline-none transition-all min-h-[80px] font-medium"
                placeholder="Detalhes adicionais..."
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Ativar Lembrete</span>
                  <span className="text-[10px] text-slate-500 font-medium">Receba um alerta antes do serviço</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.reminder_enabled} 
                  onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
              </label>
            </div>
            
            {formData.reminder_enabled && (
              <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antecedência</label>
                <select
                  value={formData.reminder_before_hours}
                  onChange={(e) => setFormData({ ...formData, reminder_before_hours: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 outline-none font-bold shadow-sm"
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
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-100 shadow-sm active:scale-95"
              >
                <Trash2 size={18} />
                Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={!hasTypes}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {service ? 'Salvar Alterações' : 'Adicionar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
