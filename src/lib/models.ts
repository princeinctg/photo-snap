import mongoose, { Schema, Document } from "mongoose";

// --- User Schema ---
const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "owner" },
    studioId: { type: String, required: true, index: true },
    avatar: { type: String },
  },
  { timestamps: true }
);

// --- Studio Settings Schema ---
const StudioSettingsSchema = new Schema(
  {
    studioId: { type: String, required: true, unique: true, index: true },
    studioName: { type: String, required: true, default: "PhotoSnap Studio" },
    tagline: { type: String, default: "Premium Wedding & Commercial Photography" },
    email: { type: String, default: "contact@photostudio.com" },
    phone: { type: String, default: "+880 1712 345678" },
    address: { type: String, default: "Gulshan-1, Dhaka, Bangladesh" },
    website: { type: String, default: "https://photosnapbd.vercel.app" },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    signatureUrl: { type: String, default: "" },
    currency: { type: String, default: "BDT" },
    currencySymbol: { type: String, default: "৳" },
    taxRate: { type: Number, default: 0 },
    invoicePrefix: { type: String, default: "INV-" },
    invoiceFooterNote: {
      type: String,
      default: "Thank you for choosing us for your special memories. All deliveries are made within the agreed timeline.",
    },
    invoiceTerms: {
      type: String,
      default: "50% advance to confirm booking date. Remaining 50% payable upon raw deliverables or preview selection.",
    },
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
  { timestamps: true }
);

// --- Client Schema ---
const ClientSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, required: true },
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    notes: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// --- Photography Package Schema ---
const PackageSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    coverImage: { type: String, default: "" },
    includedServices: [{ type: String }],
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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// --- Booking Schema ---
const BookingSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    packageId: { type: String, default: "" },
    packageName: { type: String, default: "" },
    title: { type: String, required: true },
    eventType: { type: String, required: true, default: "wedding" },
    shootDate: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, default: "" },
    venue: { type: String, required: true },
    locationAddress: { type: String, default: "" },
    assignedPhotographer: { type: String, default: "" },
    notes: { type: String, default: "" },
    totalPrice: { type: Number, required: true, default: 0 },
    advancePayment: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 },
    status: { type: String, default: "confirmed", index: true },
    invoiceId: { type: String, default: "" },
  },
  { timestamps: true }
);

// --- Invoice Schema ---
const InvoiceSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, default: "" },
    clientPhone: { type: String, default: "" },
    clientAddress: { type: String, default: "" },
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
  },
  { timestamps: true }
);

// --- Payment Schema ---
const PaymentSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, default: "" },
    clientId: { type: String, required: true },
    clientName: { type: String, default: "" },
    amount: { type: Number, required: true },
    paymentDate: { type: String, required: true },
    paymentMethod: { type: String, required: true, default: "cash" },
    referenceNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// --- Income Schema ---
const IncomeSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

// --- Expense Schema ---
const ExpenseSchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true, default: "equipment" },
    date: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, default: "cash" },
    vendor: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// --- Gallery Schema ---
const GallerySchema = new Schema(
  {
    studioId: { type: String, required: true, index: true },
    clientId: { type: String, default: "" },
    clientName: { type: String, default: "" },
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
        caption: { type: String, default: "" },
        isFavorite: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        size: { type: Number, default: 0 },
        createdAt: { type: String, default: () => new Date().toISOString() },
      },
    ],
  },
  { timestamps: true }
);

// Avoid recompiling models if already compiled in hot-reloading
export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export const StudioSettingsModel =
  mongoose.models.StudioSettings || mongoose.model("StudioSettings", StudioSettingsSchema);
export const ClientModel = mongoose.models.Client || mongoose.model("Client", ClientSchema);
export const PackageModel = mongoose.models.Package || mongoose.model("Package", PackageSchema);
export const BookingModel = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
export const InvoiceModel = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const IncomeModel = mongoose.models.Income || mongoose.model("Income", IncomeSchema);
export const ExpenseModel = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const GalleryModel = mongoose.models.Gallery || mongoose.model("Gallery", GallerySchema);
