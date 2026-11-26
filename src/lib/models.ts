import mongoose, { Schema, type Model } from "mongoose";

/**
 * Central Mongoose model registry.
 *
 * Every business record is scoped by `studioId` so a single database can host
 * multiple studios safely. Legacy string `id` fields are kept for backwards
 * compatibility with the existing UI; new relationships also use real
 * ObjectId references (`client`, `assignedEmployees`, `invoice`, ...).
 */

const model = <T>(name: string, schema: Schema<T>): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

const baseOptions = { timestamps: true } as const;

// ---------------------------------------------------------------------------
// Users, sessions & auth tokens
// ---------------------------------------------------------------------------

export const USER_ROLES = ["super_admin", "admin", "manager", "employee", "client"] as const;
export const ACCOUNT_STATUSES = ["active", "pending", "suspended", "deactivated"] as const;

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "client", index: true },
    accountStatus: { type: String, enum: ACCOUNT_STATUSES, default: "active", index: true },
    emailVerified: { type: Boolean, default: false },
    studioId: { type: String, required: true, index: true },
    studioName: { type: String, default: "Photo Studio" },
    avatar: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    lastLogin: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
UserSchema.index({ studioId: 1, role: 1 });
UserSchema.index({ studioId: 1, accountStatus: 1 });
UserSchema.index({ studioId: 1, createdAt: -1 });

const SessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
  },
  baseOptions
);
SessionSchema.index({ userId: 1, revokedAt: 1 });

const PasswordResetTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  baseOptions
);

const EmailVerificationTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    verifiedAt: { type: Date, default: null },
  },
  baseOptions
);

// ---------------------------------------------------------------------------
// Studio settings
// ---------------------------------------------------------------------------

const StudioSettingsSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, unique: true, index: true },
    studioName: { type: String, required: true, default: "PhotoSnap Studio" },
    tagline: { type: String, default: "Premium Wedding & Commercial Photography" },
    email: { type: String, default: "contact@photostudio.com" },
    phone: { type: String, default: "+880 1712 345678" },
    address: { type: String, default: "Gulshan-1, Dhaka, Bangladesh" },
    website: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    currency: { type: String, default: "BDT" },
    currencySymbol: { type: String, default: "৳" },
    taxRate: { type: Number, default: 0 },
    invoicePrefix: { type: String, default: "INV-" },
    invoiceFooterNote: { type: String, default: "" },
    invoiceTerms: { type: String, default: "" },
    theme: {
      mode: { type: String, default: "dark" },
      primaryColor: { type: String, default: "emerald" },
      accentColor: { type: String, default: "amber" },
      borderRadius: { type: String, default: "md" },
      font: { type: String, default: "sans" },
    },
    dashboardWidgets: {
      revenueChart: { type: Boolean, default: true },
      expensePie: { type: Boolean, default: true },
      recentTransactions: { type: Boolean, default: true },
      upcomingShoots: { type: Boolean, default: true },
      cashFlowChart: { type: Boolean, default: true },
    },
    accountingMethod: { type: String, default: "cash" },
  },
  baseOptions
);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const ClientSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    clientCode: { type: String, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userId: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "vip"], default: "active", index: true },
    isArchived: { type: Boolean, default: false, index: true },
    bookingHistory: [{ type: Schema.Types.ObjectId, ref: "Booking" }],
    paymentHistory: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalSpending: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
ClientSchema.index({ studioId: 1, phone: 1 });
ClientSchema.index({ studioId: 1, email: 1 });
ClientSchema.index({ studioId: 1, name: 1 });
ClientSchema.index({ studioId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

const EmployeeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userId: { type: String, default: "" },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profilePhoto: { type: String, default: "" },
    address: { type: String, default: "" },
    jobPosition: { type: String, required: true, default: "Photographer" },
    department: { type: String, required: true, default: "Photography" },
    salary: { type: Number, default: 0, min: 0 },
    joiningDate: { type: String, required: true },
    employmentStatus: {
      type: String,
      enum: ["active", "probation", "on_leave", "resigned", "terminated"],
      default: "active",
      index: true,
    },
    assignedProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    performanceRecords: [
      {
        date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
        rating: { type: Number, min: 1, max: 5, default: 3 },
        reviewer: { type: String, default: "" },
        notes: { type: String, default: "" },
      },
    ],
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relationship: { type: String, default: "" },
    },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
EmployeeSchema.index({ studioId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.index({ studioId: 1, email: 1 });
EmployeeSchema.index({ studioId: 1, department: 1 });
EmployeeSchema.index({ studioId: 1, employmentStatus: 1 });
EmployeeSchema.index({ studioId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

const ProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    studioId: { type: String, required: true, index: true },
    displayName: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 2000 },
    contact: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      x: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      currency: { type: String, default: "BDT" },
    },
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      bookingReminders: { type: Boolean, default: true },
      invoiceReminders: { type: Boolean, default: true },
    },
  },
  baseOptions
);

// ---------------------------------------------------------------------------
// Packages, services, projects, galleries
// ---------------------------------------------------------------------------

const PackageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    coverImage: { type: String, default: "" },
    includedServices: [{ type: String }],
    serviceRefs: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    photographyHours: { type: Number, default: 6 },
    editedPhotosCount: { type: Number, default: 100 },
    albumOptions: { type: String, default: "Premium Bound Leather Album" },
    deliveryTimeline: { type: String, default: "21 Days" },
    addOns: [
      {
        name: { type: String },
        price: { type: Number },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);

const ServiceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    serviceId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "photography", index: true },
    description: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 60, min: 0 },
    imageUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
ServiceSchema.index({ studioId: 1, serviceId: 1 }, { unique: true });

const ProjectSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    projectId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientId: { type: String, default: "", index: true },
    clientName: { type: String, default: "" },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    bookingId: { type: String, default: "" },
    eventType: { type: String, default: "wedding" },
    status: {
      type: String,
      enum: ["planning", "scheduled", "in_progress", "editing", "delivered", "completed", "cancelled"],
      default: "planning",
      index: true,
    },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    galleryIds: [{ type: Schema.Types.ObjectId, ref: "Gallery" }],
    coverImage: { type: String, default: "" },
    budget: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
ProjectSchema.index({ studioId: 1, projectId: 1 }, { unique: true });
ProjectSchema.index({ studioId: 1, status: 1 });
ProjectSchema.index({ studioId: 1, createdAt: -1 });

const GallerySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientId: { type: String, default: "" },
    clientName: { type: String, default: "" },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", default: null, index: true },
    employeeId: { type: String, default: "" },
    employeeName: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    projectId: { type: String, default: "" },
    projectTitle: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    eventType: { type: String, default: "wedding" },
    shootDate: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    isPasswordProtected: { type: Boolean, default: false },
    accessPassword: { type: String, default: "" },
    shareUrlToken: { type: String, required: true, index: true },
    downloadEnabled: { type: Boolean, default: true },
    images: [
      {
        id: { type: String },
        url: { type: String, required: true },
        publicId: { type: String, default: "" },
        thumbnailUrl: { type: String, default: "" },
        fileName: { type: String, default: "" },
        format: { type: String, default: "" },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        caption: { type: String, default: "" },
        isFavorite: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        size: { type: Number, default: 0 },
        client: { type: Schema.Types.ObjectId, ref: "Client", default: null },
        clientId: { type: String, default: "" },
        employee: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
        employeeId: { type: String, default: "" },
        project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
        projectId: { type: String, default: "" },
        createdAt: { type: String, default: () => new Date().toISOString() },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
GallerySchema.index({ studioId: 1, createdAt: -1 });
GallerySchema.index({ studioId: 1, shareUrlToken: 1 });

// ---------------------------------------------------------------------------
// Bookings, invoices, payments, income & expenses
// ---------------------------------------------------------------------------

const BookingSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    packageId: { type: String, default: "" },
    packageName: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    projectId: { type: String, default: "" },
    title: { type: String, required: true },
    eventType: { type: String, required: true, default: "wedding" },
    shootDate: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, default: "" },
    venue: { type: String, required: true },
    locationAddress: { type: String, default: "" },
    assignedPhotographer: { type: String, default: "" },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    notes: { type: String, default: "" },
    totalPrice: { type: Number, required: true, default: 0 },
    advancePayment: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    status: { type: String, default: "confirmed", index: true },
    invoiceId: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
BookingSchema.index({ studioId: 1, shootDate: 1 });
BookingSchema.index({ studioId: 1, status: 1 });
BookingSchema.index({ studioId: 1, createdAt: -1 });

const InvoiceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientAddress: { type: String, default: "" },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    bookingId: { type: String, default: "" },
    bookingTitle: { type: String, default: "" },
    issueDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    items: [
      {
        id: { type: String },
        description: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true, default: 0 },
        amount: { type: Number, required: true, default: 0 },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: { type: String, default: "unpaid", index: true },
    paymentMethod: { type: String, default: "bank_transfer" },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
    shareToken: { type: String, required: true, index: true },
    payments: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
InvoiceSchema.index({ studioId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ studioId: 1, status: 1 });
InvoiceSchema.index({ studioId: 1, issueDate: -1 });

const PaymentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, default: "" },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null, index: true },
    clientId: { type: String, required: true },
    clientName: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, default: "cash" },
    referenceNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
PaymentSchema.index({ studioId: 1, paymentDate: -1 });

const IncomeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true, default: "wedding_shoot" },
    date: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, default: "cash" },
    invoiceId: { type: String, default: "", index: true },
    bookingId: { type: String, default: "" },
    clientId: { type: String, default: "" },
    clientName: { type: String, default: "" },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
IncomeSchema.index({ studioId: 1, date: -1 });

const ExpenseSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, default: "equipment" },
    date: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, default: "cash" },
    vendor: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
ExpenseSchema.index({ studioId: 1, date: -1 });
ExpenseSchema.index({ studioId: 1, category: 1 });

// ---------------------------------------------------------------------------
// Attendance, notifications & audit logs
// ---------------------------------------------------------------------------

const AttendanceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, default: "" },
    date: { type: String, required: true, index: true },
    checkIn: { type: String, default: "" },
    checkOut: { type: String, default: "" },
    status: {
      type: String,
      enum: ["present", "late", "absent", "half_day", "leave"],
      default: "present",
      index: true,
    },
    notes: { type: String, default: "" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  baseOptions
);
AttendanceSchema.index({ studioId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ studioId: 1, date: -1 });

const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "booking", "payment"],
      default: "info",
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String, default: "" },
  },
  baseOptions
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const ActivityLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studioId: { type: String, required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  baseOptions
);
ActivityLogSchema.index({ studioId: 1, createdAt: -1 });
ActivityLogSchema.index({ studioId: 1, entityType: 1, entityId: 1 });

// ---------------------------------------------------------------------------
// Model exports
// ---------------------------------------------------------------------------

export const UserModel = model("User", UserSchema);
export const SessionModel = model("Session", SessionSchema);
export const PasswordResetTokenModel = model("PasswordResetToken", PasswordResetTokenSchema);
export const EmailVerificationTokenModel = model(
  "EmailVerificationToken",
  EmailVerificationTokenSchema
);
export const StudioSettingsModel = model("StudioSettings", StudioSettingsSchema);
export const ClientModel = model("Client", ClientSchema);
export const EmployeeModel = model("Employee", EmployeeSchema);
export const ProfileModel = model("Profile", ProfileSchema);
export const PackageModel = model("Package", PackageSchema);
export const ServiceModel = model("Service", ServiceSchema);
export const ProjectModel = model("Project", ProjectSchema);
export const GalleryModel = model("Gallery", GallerySchema);
export const BookingModel = model("Booking", BookingSchema);
export const InvoiceModel = model("Invoice", InvoiceSchema);
export const PaymentModel = model("Payment", PaymentSchema);
export const IncomeModel = model("Income", IncomeSchema);
export const ExpenseModel = model("Expense", ExpenseSchema);
export const AttendanceModel = model("Attendance", AttendanceSchema);
export const NotificationModel = model("Notification", NotificationSchema);
export const ActivityLogModel = model("ActivityLog", ActivityLogSchema);
