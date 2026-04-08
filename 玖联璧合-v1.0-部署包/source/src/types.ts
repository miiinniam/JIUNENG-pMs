export type UserRole = 'admin' | 'supplier' | 'main' | 'sub';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'Direct' | 'Agent';
  contact: string;
  phone: string;
  status: 'Active' | 'Inactive';
  lastOrderDate: string;
  region: string;
}

export interface Agent {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  auditStatus: 'Pending' | 'Approved' | 'Rejected';
  submitDate: string;
  documents: string[];
}

export interface Project {
  id: string;
  name: string;
  route: string;
  status: 'In Transit' | 'Delivered' | 'Delayed' | 'Pending';
  progress: number;
  eta: string;
}

export interface TenderOrder {
  id: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weight: number;
  deadline: string;
  status: 'Open' | 'Closed' | 'Awarded';
}
