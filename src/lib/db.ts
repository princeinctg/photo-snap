import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import {
  demoClients,
  demoBookings,
  demoInvoices,
  demoPayments,
  demoIncomes,
  demoExpenses,
  demoPackages,
  demoGalleries,
  initialSettings,
  DEFAULT_STUDIO_ID,
} from "./demo-data";
import {
  ClientModel,
  BookingModel,
  InvoiceModel,
  PaymentModel,
  IncomeModel,
  ExpenseModel,
  PackageModel,
  GalleryModel,
  StudioSettingsModel,
} from "./models";
import type {
  Client,
  Booking,
  Invoice,
  Payment,
  Income,
  Expense,
  PhotographyPackage,
  Gallery,
  StudioSettings,
} from "@/types";
import { roundToTwoDecimals } from "./utils";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "studio-store.json");

interface LocalStore {
  clients: Client[];
  bookings: Booking[];
  invoices: Invoice[];
  payments: Payment[];
  incomes: Income[];
  expenses: Expense[];
  packages: PhotographyPackage[];
  galleries: Gallery[];
  settings: StudioSettings;
}

let isMongooseConnected = false;

// Check if MongoDB URI is configured
const MONGODB_URI = process.env.MONGODB_URI;

export async function connectMongo() {
  if (isMongooseConnected) return true;
  if (!MONGODB_URI || MONGODB_URI.includes("localhost:27017")) {
    // If it's default localhost or empty, try quick check or use local store
    try {
      if (mongoose.connection.readyState >= 1) {
        isMongooseConnected = true;
        return true;
      }
      if (MONGODB_URI) {
        await mongoose.connect(MONGODB_URI, {
          serverSelectionTimeoutMS: 2000,
        });
        isMongooseConnected = true;
        return true;
      }
    } catch {
      isMongooseConnected = false;
      return false;
    }
  } else {
    // Atlas or remote production connection
    try {
      if (mongoose.connection.readyState >= 1) {
        isMongooseConnected = true;
        return true;
      }
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      isMongooseConnected = true;
      return true;
    } catch (err) {
      console.warn("MongoDB connection failed, falling back to persistent JSON store:", err);
      isMongooseConnected = false;
      return false;
    }
  }
  return false;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initialData: LocalStore = {
      clients: demoClients,
      bookings: demoBookings,
      invoices: demoInvoices,
      payments: demoPayments,
      incomes: demoIncomes,
      expenses: demoExpenses,
      packages: demoPackages,
      galleries: demoGalleries,
      settings: initialSettings,
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

function readLocalStore(): LocalStore {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    const fallback: LocalStore = {
      clients: demoClients,
      bookings: demoBookings,
      invoices: demoInvoices,
      payments: demoPayments,
      incomes: demoIncomes,
      expenses: demoExpenses,
      packages: demoPackages,
      galleries: demoGalleries,
      settings: initialSettings,
    };
    return fallback;
  }
}

function writeLocalStore(data: LocalStore) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ==========================================
// CLIENTS CRUD
// ==========================================

export async function getClients(studioId: string = DEFAULT_STUDIO_ID): Promise<Client[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await ClientModel.find({ studioId }).sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    } catch (e) {
      console.warn("Mongoose getClients fallback", e);
    }
  }
  const store = readLocalStore();
  return store.clients.filter((c) => c.studioId === studioId);
}

export async function saveClient(client: Partial<Client> & { name: string; phone: string; studioId?: string }): Promise<Client> {
  const studioId = client.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let target: Client;
  if (client.id) {
    const idx = store.clients.findIndex((c) => c.id === client.id);
    if (idx !== -1) {
      target = {
        ...store.clients[idx],
        ...client,
        updatedAt: new Date().toISOString(),
      };
      store.clients[idx] = target;
    } else {
      target = {
        id: client.id,
        studioId,
        name: client.name,
        email: client.email || "",
        phone: client.phone,
        address: client.address || "",
        avatar: client.avatar || "",
        notes: client.notes || "",
        isArchived: false,
        totalBilled: client.totalBilled || 0,
        totalPaid: client.totalPaid || 0,
        balance: client.balance || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.clients.unshift(target);
    }
  } else {
    target = {
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      name: client.name,
      email: client.email || "",
      phone: client.phone,
      address: client.address || "",
      avatar: client.avatar || "",
      notes: client.notes || "",
      isArchived: false,
      totalBilled: 0,
      totalPaid: 0,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.clients.unshift(target);
  }

  writeLocalStore(store);

  const connected = await connectMongo();
  if (connected) {
    try {
      if (client.id) {
        await ClientModel.findByIdAndUpdate(client.id, target, { upsert: true });
      } else {
        await ClientModel.create(target);
      }
    } catch (e) {
      console.warn("Mongo saveClient error", e);
    }
  }

  return target;
}

export async function deleteClient(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const store = readLocalStore();
  const initialLen = store.clients.length;
  store.clients = store.clients.filter((c) => c.id !== id);
  writeLocalStore(store);

  const connected = await connectMongo();
  if (connected) {
    try {
      await ClientModel.findOneAndDelete({ _id: id, studioId });
    } catch {}
  }
  return store.clients.length < initialLen;
}

// ==========================================
// PACKAGES CRUD
// ==========================================

export async function getPackages(studioId: string = DEFAULT_STUDIO_ID): Promise<PhotographyPackage[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await PackageModel.find({ studioId }).sort({ price: 1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    } catch {}
  }
  const store = readLocalStore();
  return store.packages.filter((p) => p.studioId === studioId);
}

export async function savePackage(pkg: Partial<PhotographyPackage> & { name: string; price: number }): Promise<PhotographyPackage> {
  const studioId = pkg.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let target: PhotographyPackage;
  if (pkg.id) {
    const idx = store.packages.findIndex((p) => p.id === pkg.id);
    if (idx !== -1) {
      target = { ...store.packages[idx], ...pkg, updatedAt: new Date().toISOString() };
      store.packages[idx] = target;
    } else {
      target = {
        id: pkg.id,
        studioId,
        name: pkg.name,
        description: pkg.description || "",
        price: Number(pkg.price) || 0,
        coverImage: pkg.coverImage || "",
        includedServices: pkg.includedServices || [],
        photographyHours: Number(pkg.photographyHours) || 6,
        editedPhotosCount: Number(pkg.editedPhotosCount) || 100,
        albumOptions: pkg.albumOptions || "",
        deliveryTimeline: pkg.deliveryTimeline || "21 Days",
        addOns: pkg.addOns || [],
        isActive: pkg.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.packages.push(target);
    }
  } else {
    target = {
      id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      name: pkg.name,
      description: pkg.description || "",
      price: Number(pkg.price) || 0,
      coverImage: pkg.coverImage || "",
      includedServices: pkg.includedServices || [],
      photographyHours: Number(pkg.photographyHours) || 6,
      editedPhotosCount: Number(pkg.editedPhotosCount) || 100,
      albumOptions: pkg.albumOptions || "",
      deliveryTimeline: pkg.deliveryTimeline || "21 Days",
      addOns: pkg.addOns || [],
      isActive: pkg.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.packages.push(target);
  }

  writeLocalStore(store);
  return target;
}

export async function deletePackage(id: string): Promise<boolean> {
  const store = readLocalStore();
  store.packages = store.packages.filter((p) => p.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// BOOKINGS CRUD
// ==========================================

export async function getBookings(studioId: string = DEFAULT_STUDIO_ID): Promise<Booking[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await BookingModel.find({ studioId }).sort({ shootDate: 1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    } catch {}
  }
  const store = readLocalStore();
  return store.bookings.filter((b) => b.studioId === studioId);
}

export async function saveBooking(booking: Partial<Booking> & { title: string; shootDate: string; clientId: string }): Promise<Booking> {
  const studioId = booking.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  const client = store.clients.find((c) => c.id === booking.clientId);
  const clientName = booking.clientName || client?.name || "Client";
  const clientPhone = booking.clientPhone || client?.phone || "";
  const clientEmail = booking.clientEmail || client?.email || "";

  const totalPrice = Number(booking.totalPrice) || 0;
  const advancePayment = Number(booking.advancePayment) || 0;
  const remainingBalance = Math.max(0, totalPrice - advancePayment);

  let target: Booking;
  if (booking.id) {
    const idx = store.bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      target = {
        ...store.bookings[idx],
        ...booking,
        clientName,
        clientPhone,
        clientEmail,
        totalPrice,
        advancePayment,
        remainingBalance,
        updatedAt: new Date().toISOString(),
      };
      store.bookings[idx] = target;
    } else {
      target = {
        id: booking.id,
        studioId,
        clientId: booking.clientId,
        clientName,
        clientPhone,
        clientEmail,
        packageId: booking.packageId || "",
        packageName: booking.packageName || "",
        title: booking.title,
        eventType: booking.eventType || "wedding",
        shootDate: booking.shootDate,
        startTime: booking.startTime || "10:00",
        endTime: booking.endTime || "16:00",
        venue: booking.venue || "Studio",
        locationAddress: booking.locationAddress || "",
        assignedPhotographer: booking.assignedPhotographer || "",
        notes: booking.notes || "",
        totalPrice,
        advancePayment,
        remainingBalance,
        status: booking.status || "confirmed",
        invoiceId: booking.invoiceId || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.bookings.unshift(target);
    }
  } else {
    target = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      clientId: booking.clientId,
      clientName,
      clientPhone,
      clientEmail,
      packageId: booking.packageId || "",
      packageName: booking.packageName || "",
      title: booking.title,
      eventType: booking.eventType || "wedding",
      shootDate: booking.shootDate,
      startTime: booking.startTime || "10:00",
      endTime: booking.endTime || "16:00",
      venue: booking.venue || "Studio",
      locationAddress: booking.locationAddress || "",
      assignedPhotographer: booking.assignedPhotographer || "",
      notes: booking.notes || "",
      totalPrice,
      advancePayment,
      remainingBalance,
      status: booking.status || "confirmed",
      invoiceId: booking.invoiceId || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.bookings.unshift(target);
  }

  writeLocalStore(store);
  return target;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const store = readLocalStore();
  store.bookings = store.bookings.filter((b) => b.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// INVOICES & PAYMENTS CRUD
// ==========================================

export async function getInvoices(studioId: string = DEFAULT_STUDIO_ID): Promise<Invoice[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await InvoiceModel.find({ studioId }).sort({ issueDate: -1 }).lean();
      if (docs && docs.length > 0) {
        return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
      }
    } catch {}
  }
  const store = readLocalStore();
  return store.invoices.filter((inv) => inv.studioId === studioId);
}

export async function getInvoiceById(id: string, studioId?: string): Promise<Invoice | null> {
  const invoices = await getInvoices(studioId || DEFAULT_STUDIO_ID);
  return invoices.find((inv) => inv.id === id || inv.shareToken === id) || null;
}

export async function saveInvoice(invoiceData: Partial<Invoice> & { clientId: string; items: any[] }): Promise<Invoice> {
  const studioId = invoiceData.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  const client = store.clients.find((c) => c.id === invoiceData.clientId);
  const clientName = invoiceData.clientName || client?.name || "Client";
  const clientEmail = invoiceData.clientEmail || client?.email || "";
  const clientPhone = invoiceData.clientPhone || client?.phone || "";
  const clientAddress = invoiceData.clientAddress || client?.address || "";

  // Calculate items
  const items = (invoiceData.items || []).map((it, idx) => ({
    id: it.id || `item_${idx + 1}`,
    description: it.description || "Photography Service",
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unitPrice) || 0,
    amount: roundToTwoDecimals((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
  }));

  const subtotal = roundToTwoDecimals(items.reduce((acc, it) => acc + it.amount, 0));
  const discount = roundToTwoDecimals(Number(invoiceData.discount) || 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxRate = Number(invoiceData.taxRate) || 0;
  const taxAmount = roundToTwoDecimals((taxableAmount * taxRate) / 100);
  const totalAmount = roundToTwoDecimals(taxableAmount + taxAmount);
  const paidAmount = roundToTwoDecimals(Number(invoiceData.paidAmount) || 0);
  const balanceDue = roundToTwoDecimals(Math.max(0, totalAmount - paidAmount));

  let status = invoiceData.status || "unpaid";
  if (paidAmount >= totalAmount && totalAmount > 0) {
    status = "paid";
  } else if (paidAmount > 0 && paidAmount < totalAmount) {
    status = "partially_paid";
  } else if (paidAmount === 0 && status !== "draft" && status !== "cancelled") {
    status = "unpaid";
  }

  // Generate unique invoice number if not provided
  let invoiceNumber = invoiceData.invoiceNumber;
  if (!invoiceNumber) {
    const prefix = store.settings.invoicePrefix || "PSB-";
    const nextNum = (store.invoices.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();
    invoiceNumber = `${prefix}${year}-${nextNum}`;
  }

  const shareToken = invoiceData.shareToken || `tok_${Math.random().toString(36).substring(2, 12)}`;

  let target: Invoice;
  if (invoiceData.id) {
    const idx = store.invoices.findIndex((i) => i.id === invoiceData.id);
    if (idx !== -1) {
      target = {
        ...store.invoices[idx],
        ...invoiceData,
        invoiceNumber,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        items,
        subtotal,
        discount,
        taxRate,
        taxAmount,
        totalAmount,
        paidAmount,
        balanceDue,
        status,
        shareToken,
        updatedAt: new Date().toISOString(),
      };
      store.invoices[idx] = target;
    } else {
      target = {
        id: invoiceData.id,
        studioId,
        invoiceNumber,
        clientId: invoiceData.clientId,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        bookingId: invoiceData.bookingId || "",
        bookingTitle: invoiceData.bookingTitle || "",
        issueDate: invoiceData.issueDate || new Date().toISOString().split("T")[0],
        dueDate: invoiceData.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        items,
        subtotal,
        discount,
        taxRate,
        taxAmount,
        totalAmount,
        paidAmount,
        balanceDue,
        status,
        paymentMethod: invoiceData.paymentMethod || "bank_transfer",
        notes: invoiceData.notes || "",
        terms: invoiceData.terms || store.settings.invoiceTerms || "",
        shareToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.invoices.unshift(target);
    }
  } else {
    target = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      invoiceNumber,
      clientId: invoiceData.clientId,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      bookingId: invoiceData.bookingId || "",
      bookingTitle: invoiceData.bookingTitle || "",
      issueDate: invoiceData.issueDate || new Date().toISOString().split("T")[0],
      dueDate: invoiceData.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      items,
      subtotal,
      discount,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount,
      balanceDue,
      status,
      paymentMethod: invoiceData.paymentMethod || "bank_transfer",
      notes: invoiceData.notes || "",
      terms: invoiceData.terms || store.settings.invoiceTerms || "",
      shareToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.invoices.unshift(target);
  }

  // Update client totals
  recalculateClientTotals(target.clientId, store);

  writeLocalStore(store);
  return target;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const store = readLocalStore();
  const invoice = store.invoices.find((i) => i.id === id);
  store.invoices = store.invoices.filter((i) => i.id !== id);
  if (invoice) {
    recalculateClientTotals(invoice.clientId, store);
  }
  writeLocalStore(store);
  return true;
}

/**
 * Records a payment against an invoice:
 * 1. Creates Payment record
 * 2. Updates Invoice paidAmount, balanceDue, and status
 * 3. Records Recognized Income transaction (prevents duplicate income!)
 * 4. Recalculates Client totals
 */
export async function recordInvoicePayment(params: {
  studioId?: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: any;
  referenceNumber?: string;
  notes?: string;
}): Promise<{ payment: Payment; invoice: Invoice; income: Income }> {
  const studioId = params.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  const invoiceIdx = store.invoices.findIndex((i) => i.id === params.invoiceId);
  if (invoiceIdx === -1) {
    throw new Error("Invoice not found");
  }

  const invoice = store.invoices[invoiceIdx];
  const paymentAmount = roundToTwoDecimals(Number(params.amount) || 0);

  // 1. Create Payment
  const newPayment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studioId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    amount: paymentAmount,
    paymentDate: params.paymentDate || new Date().toISOString().split("T")[0],
    paymentMethod: params.paymentMethod,
    referenceNumber: params.referenceNumber || "",
    notes: params.notes || "",
    createdAt: new Date().toISOString(),
  };
  store.payments.unshift(newPayment);

  // 2. Update Invoice
  const newPaidAmount = roundToTwoDecimals(invoice.paidAmount + paymentAmount);
  const newBalanceDue = roundToTwoDecimals(Math.max(0, invoice.totalAmount - newPaidAmount));
  const newStatus = newBalanceDue <= 0 ? "paid" : "partially_paid";

  const updatedInvoice: Invoice = {
    ...invoice,
    paidAmount: newPaidAmount,
    balanceDue: newBalanceDue,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  store.invoices[invoiceIdx] = updatedInvoice;

  // 3. Record Recognized Income transaction (Cash-basis accounting: income is recorded upon receipt of payment)
  const newIncome: Income = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studioId,
    title: `Payment for Invoice ${invoice.invoiceNumber} (${invoice.clientName})`,
    amount: paymentAmount,
    category: "wedding_shoot", // default or inferred
    date: params.paymentDate || new Date().toISOString().split("T")[0],
    paymentMethod: params.paymentMethod,
    invoiceId: invoice.id,
    bookingId: invoice.bookingId,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    reference: params.referenceNumber || "",
    notes: params.notes || `Received payment for ${invoice.invoiceNumber}`,
    createdAt: new Date().toISOString(),
  };
  store.incomes.unshift(newIncome);

  // 4. Update Client totals
  recalculateClientTotals(invoice.clientId, store);

  writeLocalStore(store);

  return { payment: newPayment, invoice: updatedInvoice, income: newIncome };
}

export async function getPayments(studioId: string = DEFAULT_STUDIO_ID): Promise<Payment[]> {
  const store = readLocalStore();
  return store.payments.filter((p) => p.studioId === studioId);
}

// ==========================================
// INCOME & EXPENSES CRUD
// ==========================================

export async function getIncomes(studioId: string = DEFAULT_STUDIO_ID): Promise<Income[]> {
  const store = readLocalStore();
  return store.incomes.filter((i) => i.studioId === studioId);
}

export async function saveIncome(income: Partial<Income> & { title: string; amount: number; date: string }): Promise<Income> {
  const studioId = income.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let target: Income;
  if (income.id) {
    const idx = store.incomes.findIndex((i) => i.id === income.id);
    if (idx !== -1) {
      target = { ...store.incomes[idx], ...income, amount: roundToTwoDecimals(Number(income.amount)) };
      store.incomes[idx] = target;
    } else {
      target = {
        id: income.id,
        studioId,
        title: income.title,
        amount: roundToTwoDecimals(Number(income.amount)),
        category: income.category || "wedding_shoot",
        date: income.date,
        paymentMethod: income.paymentMethod || "cash",
        reference: income.reference || "",
        notes: income.notes || "",
        createdAt: new Date().toISOString(),
      };
      store.incomes.unshift(target);
    }
  } else {
    target = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      title: income.title,
      amount: roundToTwoDecimals(Number(income.amount)),
      category: income.category || "wedding_shoot",
      date: income.date,
      paymentMethod: income.paymentMethod || "cash",
      reference: income.reference || "",
      notes: income.notes || "",
      createdAt: new Date().toISOString(),
    };
    store.incomes.unshift(target);
  }

  writeLocalStore(store);
  return target;
}

export async function deleteIncome(id: string): Promise<boolean> {
  const store = readLocalStore();
  store.incomes = store.incomes.filter((i) => i.id !== id);
  writeLocalStore(store);
  return true;
}

export async function getExpenses(studioId: string = DEFAULT_STUDIO_ID): Promise<Expense[]> {
  const store = readLocalStore();
  return store.expenses.filter((e) => e.studioId === studioId);
}

export async function saveExpense(expense: Partial<Expense> & { title: string; amount: number; date: string }): Promise<Expense> {
  const studioId = expense.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let target: Expense;
  if (expense.id) {
    const idx = store.expenses.findIndex((e) => e.id === expense.id);
    if (idx !== -1) {
      target = {
        ...store.expenses[idx],
        ...expense,
        amount: roundToTwoDecimals(Number(expense.amount)),
        updatedAt: new Date().toISOString(),
      };
      store.expenses[idx] = target;
    } else {
      target = {
        id: expense.id,
        studioId,
        title: expense.title,
        amount: roundToTwoDecimals(Number(expense.amount)),
        category: expense.category || "equipment",
        date: expense.date,
        paymentMethod: expense.paymentMethod || "cash",
        vendor: expense.vendor || "",
        receiptUrl: expense.receiptUrl || "",
        referenceNumber: expense.referenceNumber || "",
        notes: expense.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.expenses.unshift(target);
    }
  } else {
    target = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      title: expense.title,
      amount: roundToTwoDecimals(Number(expense.amount)),
      category: expense.category || "equipment",
      date: expense.date,
      paymentMethod: expense.paymentMethod || "cash",
      vendor: expense.vendor || "",
      receiptUrl: expense.receiptUrl || "",
      referenceNumber: expense.referenceNumber || "",
      notes: expense.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.expenses.unshift(target);
  }

  writeLocalStore(store);
  return target;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const store = readLocalStore();
  store.expenses = store.expenses.filter((e) => e.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// GALLERIES CRUD
// ==========================================

export async function getGalleries(studioId: string = DEFAULT_STUDIO_ID): Promise<Gallery[]> {
  const store = readLocalStore();
  return store.galleries.filter((g) => g.studioId === studioId);
}

export async function getGalleryById(id: string): Promise<Gallery | null> {
  const store = readLocalStore();
  return store.galleries.find((g) => g.id === id || g.shareUrlToken === id) || null;
}

export async function saveGallery(gallery: Partial<Gallery> & { title: string }): Promise<Gallery> {
  const studioId = gallery.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let target: Gallery;
  const shareUrlToken = gallery.shareUrlToken || `gal_${Math.random().toString(36).substring(2, 10)}`;

  if (gallery.id) {
    const idx = store.galleries.findIndex((g) => g.id === gallery.id);
    if (idx !== -1) {
      target = {
        ...store.galleries[idx],
        ...gallery,
        images: gallery.images || store.galleries[idx].images,
        updatedAt: new Date().toISOString(),
      };
      store.galleries[idx] = target;
    } else {
      target = {
        id: gallery.id,
        studioId,
        title: gallery.title,
        clientId: gallery.clientId || "",
        clientName: gallery.clientName || "",
        description: gallery.description || "",
        coverImage: gallery.coverImage || "",
        eventType: gallery.eventType || "wedding",
        shootDate: gallery.shootDate || "",
        isPublic: gallery.isPublic ?? false,
        isPasswordProtected: gallery.isPasswordProtected ?? false,
        accessPassword: gallery.accessPassword || "",
        shareUrlToken,
        downloadEnabled: gallery.downloadEnabled ?? true,
        images: gallery.images || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.galleries.unshift(target);
    }
  } else {
    target = {
      id: `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      title: gallery.title,
      clientId: gallery.clientId || "",
      clientName: gallery.clientName || "",
      description: gallery.description || "",
      coverImage: gallery.coverImage || "",
      eventType: gallery.eventType || "wedding",
      shootDate: gallery.shootDate || "",
      isPublic: gallery.isPublic ?? false,
      isPasswordProtected: gallery.isPasswordProtected ?? false,
      accessPassword: gallery.accessPassword || "",
      shareUrlToken,
      downloadEnabled: gallery.downloadEnabled ?? true,
      images: gallery.images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.galleries.unshift(target);
  }

  writeLocalStore(store);
  return target;
}

export async function deleteGallery(id: string): Promise<boolean> {
  const store = readLocalStore();
  store.galleries = store.galleries.filter((g) => g.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// SETTINGS
// ==========================================

export async function getSettings(studioId: string = DEFAULT_STUDIO_ID): Promise<StudioSettings> {
  const store = readLocalStore();
  return store.settings || initialSettings;
}

export async function saveSettings(settings: Partial<StudioSettings>): Promise<StudioSettings> {
  const store = readLocalStore();
  const updated: StudioSettings = {
    ...store.settings,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  store.settings = updated;
  writeLocalStore(store);
  return updated;
}

// ==========================================
// RESET & SEED
// ==========================================

export async function resetAndSeedData(): Promise<LocalStore> {
  const freshData: LocalStore = {
    clients: demoClients,
    bookings: demoBookings,
    invoices: demoInvoices,
    payments: demoPayments,
    incomes: demoIncomes,
    expenses: demoExpenses,
    packages: demoPackages,
    galleries: demoGalleries,
    settings: initialSettings,
  };
  writeLocalStore(freshData);
  return freshData;
}

// ==========================================
// HELPER: RECALCULATE CLIENT TOTALS
// ==========================================

function recalculateClientTotals(clientId: string, store: LocalStore) {
  const clientIdx = store.clients.findIndex((c) => c.id === clientId);
  if (clientIdx === -1) return;

  const clientInvoices = store.invoices.filter((i) => i.clientId === clientId && i.status !== "cancelled");
  const totalBilled = clientInvoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);
  const totalPaid = clientInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
  const balance = Math.max(0, totalBilled - totalPaid);

  store.clients[clientIdx].totalBilled = roundToTwoDecimals(totalBilled);
  store.clients[clientIdx].totalPaid = roundToTwoDecimals(totalPaid);
  store.clients[clientIdx].balance = roundToTwoDecimals(balance);
}
