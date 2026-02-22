export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações desktop');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/pwa-192x192.png',
      ...options
    });
    
    // Play sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Erro ao tocar som:', e));
  }
};

export const checkReminders = (services: any[]) => {
  const now = new Date();
  
  services.forEach(service => {
    if (!service.reminder_enabled) return;
    
    const serviceDate = new Date(`${service.date}T${service.start_time || '00:00'}`);
    const reminderTime = new Date(serviceDate.getTime() - (service.reminder_before_hours * 60 * 60 * 1000));
    
    // If reminder time is within the last minute and hasn't been shown
    const diff = now.getTime() - reminderTime.getTime();
    if (diff > 0 && diff < 60000) {
      const shownKey = `reminder_shown_${service.id}`;
      if (!localStorage.getItem(shownKey)) {
        sendNotification(`Lembrete de Serviço: ${service.type_name}`, {
          body: `Seu serviço começa às ${service.start_time} em ${service.date}.`,
        });
        localStorage.setItem(shownKey, 'true');
      }
    }
  });
};
