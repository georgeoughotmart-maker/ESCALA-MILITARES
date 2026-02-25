import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './lib/api';
import { User, Service, ServiceType, DashboardStats } from './types';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import ServiceList from './components/ServiceList';
import Settings from './components/Settings';
import ServiceForm from './components/ServiceForm';
import { requestNotificationPermission, checkReminders } from './lib/notifications';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      fetchData(selectedMonth);
    } else {
      setLoading(false);
    }
    
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData(selectedMonth);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (services.length > 0) {
      const interval = setInterval(() => {
        checkReminders(services);
      }, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [services]);

  const fetchData = async (month?: string) => {
    try {
      const [servicesRes, typesRes, statsRes] = await Promise.all([
        api.services.getAll(),
        api.serviceTypes.getAll(),
        api.stats.get(month)
      ]);
      setServices(servicesRes);
      setServiceTypes(typesRes);
      setStats(statsRes);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    setUser(user);
    fetchData(selectedMonth);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      await api.user.updateProfile(data);
      const updatedUser = { ...user!, ...data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar perfil');
    }
  };

  const handleSaveService = async (data: any) => {
    try {
      if (editingService) {
        await api.services.update(editingService.id, data);
      } else {
        await api.services.create(data);
      }
      setIsFormOpen(false);
      setEditingService(null);
      fetchData(selectedMonth);
    } catch (error) {
      alert('Erro ao salvar serviço');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (confirm('Deseja realmente excluir este serviço?')) {
      try {
        await api.services.delete(id);
        setIsFormOpen(false);
        setEditingService(null);
        fetchData(selectedMonth);
      } catch (error) {
        alert('Erro ao excluir serviço');
      }
    }
  };

  const handleAddType = async (data: any) => {
    try {
      await api.serviceTypes.create(data);
      fetchData(selectedMonth);
    } catch (error) {
      alert('Erro ao criar tipo de serviço');
    }
  };

  const handleUpdateType = async (id: number, data: any) => {
    try {
      await api.serviceTypes.update(id, data);
      fetchData(selectedMonth);
    } catch (error) {
      alert('Erro ao atualizar tipo de serviço');
    }
  };

  const handleDeleteType = async (id: number) => {
    if (confirm('Deseja excluir este tipo? Isso não afetará serviços já registrados.')) {
      try {
        await api.serviceTypes.delete(id);
        fetchData(selectedMonth);
      } catch (error) {
        alert('Erro ao excluir tipo de serviço');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout 
        user={user} 
        onLogout={handleLogout} 
        onAddService={() => { setEditingService(null); setInitialDate(undefined); setIsFormOpen(true); }}
      >
        <Routes>
          <Route path="/" element={stats ? <Dashboard stats={stats} recentServices={services} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} /> : null} />
          <Route path="/calendar" element={
            <Calendar 
              services={services} 
              onAddService={(date) => { setInitialDate(date); setEditingService(null); setIsFormOpen(true); }} 
              onEditService={(service) => { setEditingService(service); setIsFormOpen(true); }}
              onDeleteService={handleDeleteService}
            />
          } />
          <Route path="/services" element={
            <ServiceList 
              services={services} 
              onEdit={(service) => { setEditingService(service); setIsFormOpen(true); }}
              onDelete={handleDeleteService}
            />
          } />
          <Route path="/settings" element={
            <Settings 
              user={user}
              serviceTypes={serviceTypes} 
              onAddType={handleAddType}
              onUpdateType={handleUpdateType}
              onDeleteType={handleDeleteType}
              onUpdateProfile={handleUpdateProfile}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {isFormOpen && (
          <ServiceForm
            service={editingService}
            serviceTypes={serviceTypes}
            initialDate={initialDate}
            onClose={() => setIsFormOpen(false)}
            onSave={handleSaveService}
            onDelete={handleDeleteService}
          />
        )}
      </Layout>
    </BrowserRouter>
  );
}
