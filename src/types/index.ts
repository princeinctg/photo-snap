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

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'photographer' | 'client';
  studioId: string;
  avatar?: string;
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
  name: string;
  email: string;
  phone: string;
  address?: string;
  avatar?: string;
  notes?: string;
  isArchived?: boolean;
  totalBilled: number;
  totalPaid: number;
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
  caption?: string;
  isFavorite?: boolean;
  order: number;
  size?: number;
  createdAt: string;
}

export interface Gallery {
  id: string;
  studioId: string;
  clientId?: string;
  clientName?: string;
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
