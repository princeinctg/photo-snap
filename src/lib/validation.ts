import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");
const phone = z.string().trim().min(5, "Enter a valid phone number").max(30);
const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format");
const optionalDate = z.union([dateString, z.literal("")]).optional();
const money = z.coerce.number().finite().min(0, "Amount cannot be negative").max(1_000_000_000);
const shortText = z.string().trim().max(500).optional().default("");
const longText = z.string().trim().max(5000).optional().default("");
const urlOrEmpty = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/"), "Enter a valid URL")
  .optional()
  .default("");

const roleEnum = z.enum(["super_admin", "admin", "manager", "employee", "client"]);
const accountStatusEnum = z.enum(["active", "pending", "suspended", "deactivated"]);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email,
  password,
  phone: z.string().trim().max(30).optional().default(""),
  studioName: z.string().trim().max(120).optional().default(""),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Invalid reset token").max(500),
  password,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20, "Invalid verification token").max(500),
});

export const resendVerificationSchema = z.object({ email });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password,
  phone: z.string().trim().max(30).optional().default(""),
  role: roleEnum.default("employee"),
  accountStatus: accountStatusEnum.default("active"),
  emailVerified: z.boolean().optional().default(true),
  avatar: urlOrEmpty,
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: email.optional(),
  phone: z.string().trim().max(30).optional(),
  password: password.optional(),
  role: roleEnum.optional(),
  accountStatus: accountStatusEnum.optional(),
  emailVerified: z.boolean().optional(),
  avatar: urlOrEmpty,
  profileImage: urlOrEmpty,
});

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clientCreateSchema = z.object({
  name: z.string().trim().min(2, "Client name is required").max(160),
  phone,
  email: z.union([email, z.literal("")]).optional().default(""),
  address: shortText,
  avatar: urlOrEmpty,
  dateOfBirth: optionalDate,
  gender: z.enum(["male", "female", "other", ""]).optional().default(""),
  notes: longText,
  status: z.enum(["active", "inactive", "vip"]).optional().default("active"),
  userId: z.string().trim().max(80).optional().default(""),
});

export const clientUpdateSchema = clientCreateSchema.partial();

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export const employeeCreateSchema = z.object({
  employeeId: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(2, "Employee name is required").max(160),
  email: z.union([email, z.literal("")]).optional().default(""),
  phone,
  profilePhoto: urlOrEmpty,
  address: shortText,
  jobPosition: z.string().trim().min(1).max(100).default("Photographer"),
  department: z.string().trim().min(1).max(100).default("Photography"),
  salary: money.optional().default(0),
  joiningDate: dateString,
  employmentStatus: z
    .enum(["active", "probation", "on_leave", "resigned", "terminated"])
    .optional()
    .default("active"),
  emergencyContact: z
    .object({
      name: z.string().trim().max(120).optional().default(""),
      phone: z.string().trim().max(30).optional().default(""),
      relationship: z.string().trim().max(80).optional().default(""),
    })
    .optional(),
  notes: longText,
  userId: z.string().trim().max(80).optional().default(""),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().max(120).optional(),
  profilePhoto: urlOrEmpty,
  bio: z.string().trim().max(2000).optional(),
  contact: z
    .object({
      phone: z.string().trim().max(30).optional(),
      email: z.string().trim().max(254).optional(),
      address: z.string().trim().max(500).optional(),
      website: z.string().trim().max(500).optional(),
    })
    .optional(),
  socialLinks: z
    .object({
      facebook: z.string().trim().max(500).optional(),
      instagram: z.string().trim().max(500).optional(),
      linkedin: z.string().trim().max(500).optional(),
      x: z.string().trim().max(500).optional(),
      youtube: z.string().trim().max(500).optional(),
    })
    .optional(),
  preferences: z
    .object({
      language: z.string().trim().max(20).optional(),
      timezone: z.string().trim().max(60).optional(),
      currency: z.string().trim().max(10).optional(),
    })
    .optional(),
  notificationSettings: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      bookingReminders: z.boolean().optional(),
      invoiceReminders: z.boolean().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Projects & services
// ---------------------------------------------------------------------------

const projectStatusEnum = z.enum([
  "planning",
  "scheduled",
  "in_progress",
  "editing",
  "delivered",
  "completed",
  "cancelled",
]);

export const projectCreateSchema = z.object({
  projectId: z.string().trim().max(60).optional(),
  title: z.string().trim().min(2, "Project title is required").max(200),
  description: longText,
  clientId: z.string().trim().max(80).optional().default(""),
  bookingId: z.string().trim().max(80).optional().default(""),
  eventType: z.string().trim().max(40).optional().default("wedding"),
  status: projectStatusEnum.optional().default("planning"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  startDate: optionalDate,
  endDate: optionalDate,
  assignedEmployees: z.array(z.string().trim().max(80)).optional().default([]),
  coverImage: urlOrEmpty,
  budget: money.optional().default(0),
  spent: money.optional().default(0),
  progress: z.coerce.number().min(0).max(100).optional().default(0),
  tags: z.array(z.string().trim().max(40)).optional().default([]),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const serviceCreateSchema = z.object({
  serviceId: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2, "Service name is required").max(160),
  category: z.string().trim().max(80).optional().default("photography"),
  description: longText,
  price: money.optional().default(0),
  durationMinutes: z.coerce.number().int().min(0).max(10080).optional().default(60),
  imageUrl: urlOrEmpty,
  isActive: z.boolean().optional().default(true),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

// ---------------------------------------------------------------------------
// Packages, bookings & galleries
// ---------------------------------------------------------------------------

export const packageCreateSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: longText,
  price: money,
  coverImage: urlOrEmpty,
  includedServices: z.array(z.string().trim().max(300)).optional().default([]),
  photographyHours: z.coerce.number().min(0).max(72).optional().default(6),
  editedPhotosCount: z.coerce.number().int().min(0).max(100000).optional().default(100),
  albumOptions: z.string().trim().max(300).optional().default(""),
  deliveryTimeline: z.string().trim().max(100).optional().default("21 Days"),
  addOns: z
    .array(
      z.object({
        name: z.string().trim().max(160),
        price: money,
      })
    )
    .optional()
    .default([]),
  isActive: z.boolean().optional().default(true),
});

export const packageUpdateSchema = packageCreateSchema.partial();

export const bookingCreateSchema = z.object({
  title: z.string().trim().min(2, "Booking title is required").max(200),
  clientId: z.string().trim().min(1, "Client is required").max(80),
  packageId: z.string().trim().max(80).optional().default(""),
  packageName: z.string().trim().max(200).optional().default(""),
  eventType: z.string().trim().max(40).optional().default("wedding"),
  shootDate: dateString,
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/, "Use HH:MM time format"),
  endTime: z.string().trim().max(10).optional().default(""),
  venue: z.string().trim().min(1, "Venue is required").max(300),
  locationAddress: shortText,
  assignedPhotographer: z.string().trim().max(160).optional().default(""),
  assignedEmployees: z.array(z.string().trim().max(80)).optional().default([]),
  notes: longText,
  totalPrice: money.optional().default(0),
  advancePayment: money.optional().default(0),
  status: z.enum(["inquiry", "confirmed", "in_progress", "completed", "cancelled"]).optional().default("confirmed"),
  projectId: z.string().trim().max(80).optional().default(""),
});

export const bookingUpdateSchema = bookingCreateSchema.partial();

export const galleryCreateSchema = z.object({
  title: z.string().trim().min(2, "Gallery title is required").max(200),
  description: longText,
  clientId: z.string().trim().max(80).optional().default(""),
  projectId: z.string().trim().max(80).optional().default(""),
  coverImage: urlOrEmpty,
  eventType: z.string().trim().max(40).optional().default("wedding"),
  shootDate: optionalDate,
  isPublic: z.boolean().optional().default(false),
  isPasswordProtected: z.boolean().optional().default(false),
  accessPassword: z.string().max(200).optional().default(""),
  downloadEnabled: z.boolean().optional().default(true),
});

export const galleryUpdateSchema = galleryCreateSchema.partial();

export const galleryImageSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  caption: z.string().trim().max(500).optional().default(""),
  publicId: z.string().trim().max(300).optional().default(""),
});

// ---------------------------------------------------------------------------
// Invoices & payments
// ---------------------------------------------------------------------------

export const invoiceItemSchema = z.object({
  id: z.string().trim().max(80).optional(),
  description: z.string().trim().min(1, "Item description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be greater than 0").max(100000),
  unitPrice: money,
});

export const invoiceCreateSchema = z.object({
  clientId: z.string().trim().min(1, "Client is required").max(80),
  bookingId: z.string().trim().max(80).optional().default(""),
  issueDate: dateString.optional(),
  dueDate: dateString.optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required").max(100),
  discount: money.optional().default(0),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  paymentMethod: z.string().trim().max(40).optional().default("bank_transfer"),
  notes: longText,
  terms: longText,
  status: z.enum(["draft", "unpaid", "partially_paid", "paid", "overdue", "cancelled"]).optional(),
});

export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const paymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0").max(1_000_000_000),
  paymentDate: dateString.optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "bkash", "nagad", "card", "other"]).optional().default("cash"),
  referenceNumber: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

// ---------------------------------------------------------------------------
// Finances
// ---------------------------------------------------------------------------

export const incomeCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  amount: z.coerce.number().positive().max(1_000_000_000),
  category: z.string().trim().max(60).optional().default("wedding_shoot"),
  date: dateString,
  paymentMethod: z.enum(["cash", "bank_transfer", "bkash", "nagad", "card", "other"]).optional().default("cash"),
  invoiceId: z.string().trim().max(80).optional().default(""),
  bookingId: z.string().trim().max(80).optional().default(""),
  clientId: z.string().trim().max(80).optional().default(""),
  clientName: z.string().trim().max(160).optional().default(""),
  reference: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const incomeUpdateSchema = incomeCreateSchema.partial();

export const expenseCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  amount: z.coerce.number().positive().max(1_000_000_000),
  category: z.string().trim().max(60).optional().default("equipment"),
  date: dateString,
  paymentMethod: z.enum(["cash", "bank_transfer", "bkash", "nagad", "card", "other"]).optional().default("cash"),
  vendor: z.string().trim().max(200).optional().default(""),
  receiptUrl: urlOrEmpty,
  referenceNumber: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

// ---------------------------------------------------------------------------
// Attendance, notifications & settings
// ---------------------------------------------------------------------------

export const attendanceCreateSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required").max(80),
  date: dateString,
  checkIn: z.string().trim().max(10).optional().default(""),
  checkOut: z.string().trim().max(10).optional().default(""),
  status: z.enum(["present", "late", "absent", "half_day", "leave"]).optional().default("present"),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const attendanceUpdateSchema = attendanceCreateSchema.partial();

export const notificationCreateSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  type: z.enum(["info", "success", "warning", "error", "booking", "payment"]).optional().default("info"),
  link: z.string().trim().max(500).optional().default(""),
});

export const settingsUpdateSchema = z.object({
  studioName: z.string().trim().min(1).max(160).optional(),
  tagline: z.string().trim().max(300).optional(),
  email: z.string().trim().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  website: z.string().trim().max(500).optional(),
  logoUrl: urlOrEmpty,
  faviconUrl: urlOrEmpty,
  signatureUrl: urlOrEmpty,
  currency: z.string().trim().max(10).optional(),
  currencySymbol: z.string().trim().max(5).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  invoicePrefix: z.string().trim().max(20).optional(),
  invoiceFooterNote: z.string().trim().max(1000).optional(),
  invoiceTerms: z.string().trim().max(2000).optional(),
  theme: z
    .object({
      mode: z.enum(["dark", "light", "system"]).optional(),
      primaryColor: z.string().trim().max(30).optional(),
      accentColor: z.string().trim().max(30).optional(),
      borderRadius: z.enum(["sm", "md", "lg", "full"]).optional(),
      font: z.enum(["sans", "serif", "mono"]).optional(),
    })
    .optional(),
  dashboardWidgets: z
    .object({
      revenueChart: z.boolean().optional(),
      expensePie: z.boolean().optional(),
      recentTransactions: z.boolean().optional(),
      upcomingShoots: z.boolean().optional(),
      cashFlowChart: z.boolean().optional(),
    })
    .optional(),
  accountingMethod: z.enum(["cash", "accrual"]).optional(),
});
