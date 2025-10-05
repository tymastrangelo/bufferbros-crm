// src/lib/types.ts

// ENUM types based on your schema's CHECK constraints
export type JobStatus = 'new' | 'quoted' | 'scheduled' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';
export type ContactMethod = 'phone' | 'email' | 'text';

// Table interfaces
export interface Client {
  id: number;
  created_at: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  preferred_contact_method?: ContactMethod | null;
  notes?: string | null;
}

export interface Vehicle {
  id: number;
  created_at: string;
  client_id: number;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  type?: string | null; // e.g., Sedan, SUV
  color?: string | null;
  license_plate?: string | null;
  notes?: string | null;
}

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  base_price: number;
  duration_estimate_minutes?: number | null;
}

export interface Addon {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  duration_estimate_minutes?: number | null;
}

export interface Job {
  id: number;
  created_at: string;
  client_id?: number | null;
  vehicle_id?: number | null;
  service_id?: number | null;
  status: JobStatus;
  scheduled_date?: string | null;
  total_price?: number | null;
  notes?: string | null;
}

export interface Expense {
  id: number;
  created_at: string;
  date: string;
  description: string;
  amount: number;
  category?: string | null;
}

export interface FinancialStats {
  runningBalance: number;
  businessShare: number;
  totalExpenses: number;
  paidJobsCount: number;
}

// This is a "joined" type for displaying job information easily
export interface JobWithDetails extends Job {
  clients: { full_name: string } | null;
  vehicles: { make: string | null, model: string | null } | null;
  services: { name: string } | null;
}
