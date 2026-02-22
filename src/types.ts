export interface User {
  id: number;
  name: string;
  email: string;
  coat_of_arms?: string;
}

export interface ServiceType {
  id: number;
  user_id: number;
  name: string;
  default_value: number;
  color: string;
  default_workload: string;
}

export interface Service {
  id: number;
  user_id: number;
  type_id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  value: number;
  notes: string | null;
  reminder_enabled: boolean;
  reminder_before_hours: number;
  type_name?: string;
  type_color?: string;
}

export interface DashboardStats {
  monthly: {
    total_services: number;
    total_value: number;
    total_hours: number;
  };
  nextService: Service | null;
}
