import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Palette, Clock, DollarSign, Save, X, Upload, User as UserIcon, Music, Play, Volume2 } from 'lucide-react';
import { ServiceType, User } from '../types';

interface SettingsProps {
  user: User;
  serviceTypes: ServiceType[];
  onAddType: (data: any) => void;
  onUpdateType: (id: number, data: any) => void;
  onDeleteType: (id: number) => void;
  onUpdateProfile: (data: any) => void;
}

export default function Settings({ user, serviceTypes, onAddType, onUpdateType, onDeleteType, onUpdateProfile }: SettingsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: user.phone || '',
    coat_of_arms: user.coat_of_arms || ''
  });
  const [alertSound, setAlertSound] = useState<string | null>(localStorage.getItem('alert_sound'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const soundInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    default_value: 0,
    color: '#3b82f6',
    default_workload: '24h'
  });

  useEffect(() => {
    setProfileData({
      name: user.name,
      phone: user.phone || '',
      coat_of_arms: user.coat_of_arms || ''
    });
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('A imagem é muito grande. Escolha uma imagem de até 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, coat_of_arms: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo é muito grande. Escolha um MP3 de até 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Sound = reader.result as string;
        localStorage.setItem('alert_sound', base64Sound);
        setAlertSound(base64Sound);
        alert('Som de alerta atualizado!');
      };
      reader.readAsDataURL(file);
    }
  };

  const testSound = () => {
    const defaultSound = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    const audio = new Audio(alertSound || defaultSound);
    audio.play().catch(e => alert('Erro ao reproduzir som. Verifique se o arquivo é um MP3 válido.'));
  };

  const resetSound = () => {
    localStorage.removeItem('alert_sound');
    setAlertSound(null);
    alert('Som de alerta restaurado para o padrão.');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await onUpdateProfile(profileData);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (type: ServiceType) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      default_value: type.default_value,
      color: type.color,
      default_workload: type.default_workload
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await onUpdateType(editingId, formData);
        setEditingId(null);
      } else {
        await onAddType(formData);
        setIsAdding(false);
      }
      setFormData({ name: '', default_value: 0, color: '#3b82f6', default_workload: '24h' });
    } catch (e) {
      // Error is already handled with alert in App.tsx
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-neutral-500">Personalize seus tipos de serviço e preferências</p>
      </header>

      <section className="bg-[#171717] border border-[#262626] rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserIcon size={18} className="text-blue-500" />
          Perfil e Identidade
        </h3>
        <p className="text-xs text-neutral-500 -mt-4">Defina seu nome de guerra e o brasão da sua corporação para personalizar o app.</p>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 bg-[#0a0a0a] border border-[#262626] rounded-2xl flex items-center justify-center overflow-hidden relative group">
              {profileData.coat_of_arms ? (
                <img src={profileData.coat_of_arms} alt="Brasão" className="w-full h-full object-contain p-2" />
              ) : (
                <Palette size={40} className="text-neutral-700" />
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              >
                <Upload size={24} />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Brasão da Corporação</p>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nome de Guerra / Completo</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Celular para Alertas</label>
              <input 
                type="tel" 
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-3 px-4 text-white focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: 5511999999999"
              />
              <p className="text-[10px] text-neutral-500">Insira o número com DDD (apenas números). Ex: 5511999999999</p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </div>
        </div>
      </section>
      
      <section className="bg-[#171717] border border-[#262626] rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Volume2 size={18} className="text-blue-500" />
          Notificações e Alertas
        </h3>
        <p className="text-xs text-neutral-500 -mt-4">Escolha o som que será reproduzido nos lembretes de serviço.</p>
        
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-[#0a0a0a] border border-[#262626] rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                <Music size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Som do Alerta</p>
                <p className="text-xs text-neutral-500">
                  {alertSound ? 'Personalizado (MP3)' : 'Padrão do Sistema'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={testSound}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold py-2 px-4 rounded-lg transition-all"
              >
                <Play size={16} /> Testar
              </button>
              
              <button
                onClick={() => soundInputRef.current?.click()}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded-lg transition-all"
              >
                <Upload size={16} /> Alterar MP3
              </button>
              
              {alertSound && (
                <button
                  onClick={resetSound}
                  className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                  title="Restaurar Padrão"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
          
          <input 
            type="file" 
            ref={soundInputRef} 
            onChange={handleSoundUpload} 
            accept="audio/mpeg,audio/mp3" 
            className="hidden" 
          />
          
          <p className="text-[10px] text-neutral-500 text-center md:text-left">
            * O som será reproduzido quando um lembrete de serviço for ativado. 
            Certifique-se de que as notificações do navegador estão permitidas.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Tipos de Serviço</h3>
            <p className="text-xs text-neutral-500">Gerencie as categorias de serviço (ex: Ordinário, PJES, Diária).</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            <Plus size={18} />
            Novo Tipo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(isAdding || editingId !== null) && (
            <div className="bg-[#171717] border border-blue-500/50 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-white">{editingId ? 'Editar Tipo' : 'Novo Tipo'}</h4>
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="text-neutral-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-2 px-3 text-white focus:border-blue-500 outline-none"
                    placeholder="Ex: Gratificação"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Valor Padrão</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                      <input
                        type="number"
                        value={formData.default_value}
                        onChange={(e) => setFormData({ ...formData, default_value: Number(e.target.value) })}
                        className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-2 pl-7 pr-3 text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Carga Horária</label>
                    <select
                      value={formData.default_workload}
                      onChange={(e) => setFormData({ ...formData, default_workload: e.target.value })}
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl py-2 px-3 text-white focus:border-blue-500 outline-none"
                    >
                      <option value="24h">24h</option>
                      <option value="12h">12h</option>
                      <option value="8h">8h</option>
                      <option value="6h">6h</option>
                      <option value="4h">4h</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Cor</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                    <span className="text-xs text-neutral-400 font-mono">{formData.color}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Salvando...' : 'Salvar Tipo'}
              </button>
            </div>
          )}

          {serviceTypes.map((type) => (
            <div key={type.id} className="bg-[#171717] border border-[#262626] rounded-2xl p-6 flex items-center justify-between group hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: type.color }}
                >
                  <Palette size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">{type.name}</h4>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> R$ {(type.default_value || 0).toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {type.default_workload}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(type)}
                  className="p-2 bg-neutral-800 hover:bg-blue-600/20 hover:text-blue-500 rounded-lg text-neutral-400 transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => onDeleteType(type.id)}
                  className="p-2 bg-neutral-800 hover:bg-red-600/20 hover:text-red-500 rounded-lg text-neutral-400 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#171717] border border-[#262626] rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Sobre o App</h3>
        <p className="text-sm text-neutral-400 leading-relaxed">
          O <strong>Escala Militar Pro</strong> foi desenvolvido para facilitar a vida do militar, 
          proporcionando um controle rigoroso sobre seus serviços e ganhos financeiros. 
          Todos os dados são armazenados de forma segura e individual.
        </p>
        <div className="pt-4 flex justify-between items-center text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
          <span>Versão 1.0.0</span>
          <span>© 2024 Militar Tech</span>
        </div>
      </section>
    </div>
  );
}
