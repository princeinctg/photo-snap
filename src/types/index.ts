export type EventType =
  | 'wedding'
  | 'portrait'
  | 'product'
  | 'fashion'
  | 'birthday'
  | 'corporate'
  | 'cinematography'
  | 'custom';

export type BookingStatus =
  | 'inquiry'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type InvoiceStatus =
  | 'draft'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'bkash'
  | 'nagad'
  | 'card'
  | 'other';

export type ExpenseCategory =
  | 'equipment'
  | 'camera_accessories'
  | 'lighting'
  | 'travel'
  | 'rent'
  | 'salary'
  | 'editing'
  | 'marketing'
  | 'utilities'
  | 'software'
  | 'maintenance'
  | 'custom';

export type IncomeCategory =
  | 'wedding_shoot'
  | 'portrait_session'
  | 'commercial'
  | 'cinematography'
  | 'studio_rental'
  | 'album_sales'
  | 'workshop'
  | 'other';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'employee' | 'client';

export type AccountStatus = 'active' | 'pending' | 'suspended' | 'deactivated';

export type EmploymentStatus = 'active' | 'probation' | 'on_leave' | 'resigned' | 'terminated';

export type ProjectStatus =
  | 'planning'
  | 'scheduled'
  | 'in_progress'
  | 'editing'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'leave';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  studioId: string;
  studioName?: string;
  avatar?: string;
  profileImage?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SessionInfo {
  id: string;
  userAgent?: string;
  ip?: string;
  lastActiveAt?: string;
  createdAt: string;
  expiresAt: string;
  current?: boolean;
}

export interface Employee {
  id: string;
  studioId: string;
  employeeId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  address?: string;
  jobPosition: string;
  department: string;
  salary: number;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  assignedProjects?: string[];
  performanceRecords?: Array<{
    date: string;
    rating: number;
    reviewer?: string;
    notes?: string;
  }>;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  profilePhoto?: string;
  bio?: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    x?: string;
    youtube?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    currency?: string;
  };
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    bookingReminders?: boolean;
    invoiceReminders?: boolean;
  };
  updatedAt: string;
}

export interface Project {
  id: string;
  studioId: string;
  projectId: string;
  title: string;
  description?: string;
  clientId?: string;
  clientName?: string;
  bookingId?: string;
  eventType: EventType;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  endDate?: string;
  assignedEmployees?: string[];
  assignedEmployeeNames?: string[];
  galleryIds?: string[];
  coverImage?: string;
  budget?: number;
  spent?: number;
  progress?: number;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  studioId: string;
  serviceId: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  studioId: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  studioId: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityLogRecord {
  id: string;
  studioId: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface StudioSettings {
  id: string;
  studioId: string;
  studioName: string;
  tagline?: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  logoUrl?: string;
  faviconUrl?: string;
  signatureUrl?: string;
  currency: string;
  currencySymbol: string;
  taxRate: number; // percentage, e.g. 5 for 5%
  invoicePrefix: string;
  invoiceFooterNote?: string;
  invoiceTerms?: string;
  theme: {
    mode: 'dark' | 'light' | 'system';
    primaryColor: string; // e.g., 'emerald' | 'indigo' | 'amber' | 'rose' | 'sky' | 'violet'
    accentColor: string;
    borderRadius: 'sm' | 'md' | 'lg' | 'full';
    font: 'sans' | 'serif' | 'mono';
  };
  dashboardWidgets: {
    revenueChart: boolean;
    expensePie: boolean;
    recentTransactions: boolean;
    upcomingShoots: boolean;
    cashFlowChart: boolean;
  };
  accountingMethod: 'cash' | 'accrual';
  updatedAt: string;
}

export interface Client {
  id: string;
  studioId: string;
  clientCode?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | '';
  notes?: string;
  isArchived?: boolean;
  status?: 'active' | 'inactive' | 'vip';
  userId?: string;
  bookingHistory?: string[];
  paymentHistory?: string[];
  totalBilled: number;
  totalPaid: number;
  totalSpending?: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotographyPackage {
  id: string;
  studioId: string;
  name: string;
  description: string;
  price: number;
  coverImage?: string;
  includedServices: string[];
  photographyHours: number;
  editedPhotosCount: number;
  albumOptions?: string;
  deliveryTimeline: string;
  addOns?: Array<{ name: string; price: number }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  studioId: string;
  clientId: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  packageId?: string;
  packageName?: string;
  title: string;
  eventType: EventType;
  shootDate: string; // ISO date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  venue: string;
  locationAddress?: string;
  assignedPhotographer?: string;
  assignedEmployees?: string[];
  projectId?: string;
  notes?: string;
  totalPrice: number;
  advancePayment: number;
  remainingBalance: number;
  status: BookingStatus;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  studioId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  bookingId?: string;
  bookingTitle?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number; // flat amount
  taxRate: number; // percentage
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  terms?: string;
  shareToken: string; // for public client invoice link
  payments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  studioId: string;
  invoiceId: string;
  invoiceNumber?: string;
  clientId: string;
  clientName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Income {
  id: string;
  studioId: string;
  title: string;
  amount: number;
  category: IncomeCategory;
  date: string;
  paymentMethod: PaymentMethod;
  invoiceId?: string;
  bookingId?: string;
  clientId?: string;
  clientName?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  studioId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  vendor?: string;
  receiptUrl?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
  fileName?: string;
  format?: string;
  width?: number;
  height?: number;
  caption?: string;
  isFavorite?: boolean;
  order: number;
  size?: number;
  clientId?: string;
  employeeId?: string;
  projectId?: string;
  createdAt: string;
}

export interface Gallery {
  id: string;
  studioId: string;
  clientId?: string;
  clientName?: string;
  employeeId?: string;
  employeeName?: string;
  projectId?: string;
  projectTitle?: string;
  title: string;
  description?: string;
  coverImage?: string;
  eventType: EventType;
  shootDate?: string;
  isPublic: boolean;
  isPasswordProtected: boolean;
  accessPassword?: string;
  shareUrlToken: string;
  images: GalleryImage[];
  downloadEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  totalRevenue: number; // total recognized income
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  totalBookings: number;
  upcomingShoots: number;
  completedProjects: number;
  totalClients: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    netProfit: number;
  }>;
  categoryExpenses: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  categoryIncome: Array<{
    name: string;
    value: number;
  }>;
  cashFlow: Array<{
    date: string;
    cashIn: number;
    cashOut: number;
    netCash: number;
  }>;
}
