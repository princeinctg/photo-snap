import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "./mongodb";
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
  EmployeeModel,
  ProjectModel,
  UserModel,
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

export interface LocalStore {
  clients: Client[];
  bookings: Booking[];
  invoices: Invoice[];
  payments: Payment[];
  incomes: Income[];
  expenses: Expense[];
  packages: PhotographyPackage[];
  galleries: Gallery[];
  settings: StudioSettings;
  users?: any[];
  studioSettingsMap?: Record<string, StudioSettings>;
}

export async function connectMongo(): Promise<boolean> {
  if (!process.env.MONGODB_URI) return false;

  try {
    await connectDB();
    return true;
  } catch {
    console.warn("MongoDB connection failed; using the local store for non-authentication data.");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Local Store Helpers
// ---------------------------------------------------------------------------
function ensureDataDir() {
  try {
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
        users: [],
        studioSettingsMap: {
          [DEFAULT_STUDIO_ID]: initialSettings,
        },
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    }
  } catch {}
}

export function readLocalStore(): LocalStore {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      clients: demoClients,
      bookings: demoBookings,
      invoices: demoInvoices,
      payments: demoPayments,
      incomes: demoIncomes,
      expenses: demoExpenses,
      packages: demoPackages,
      galleries: demoGalleries,
      settings: initialSettings,
      users: [],
      studioSettingsMap: {
        [DEFAULT_STUDIO_ID]: initialSettings,
      },
    };
  }
}

export function writeLocalStore(data: LocalStore) {
  try {
    ensureDataDir();
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

// ---------------------------------------------------------------------------
// ObjectId reference helpers (string ids are kept for UI compatibility)
// ---------------------------------------------------------------------------
async function resolveRef(Model: any, studioId: string, id?: string | null) {
  if (!id) return null;
  try {
    const doc = await Model.findOne({ id, studioId }).select("_id").lean();
    return doc?._id ?? null;
  } catch {
    return null;
  }
}

async function resolveRefs(Model: any, studioId: string, ids?: string[] | null) {
  if (!ids || ids.length === 0) return [];
  const docs = await Promise.all(ids.map((id) => resolveRef(Model, studioId, id)));
  return docs.filter(Boolean);
}

// ==========================================
// CLIENTS CRUD
// ==========================================

export async function getClients(studioId: string = DEFAULT_STUDIO_ID): Promise<Client[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await ClientModel.find({ studioId, isArchived: { $ne: true } })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map((d: any) => ({
        ...d,
        id: d.id || d._id.toString(),
      }));
    } catch (e) {
      console.warn("Mongoose getClients fallback", e);
    }
  }

  const store = readLocalStore();
  return store.clients.filter((c) => c.studioId === studioId && !c.isArchived);
}

export async function saveClient(client: Partial<Client> & { name: string; phone: string; studioId?: string }): Promise<Client> {
  const studioId = client.studioId || DEFAULT_STUDIO_ID;
  const clientId = client.id || `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.clients.find((c) => c.id === clientId);

  const target: Client = {
    id: clientId,
    studioId,
    clientCode: client.clientCode || existing?.clientCode || `CL-${String(store.clients.length + 1).padStart(4, "0")}`,
    name: client.name,
    email: client.email || existing?.email || "",
    phone: client.phone,
    address: client.address ?? existing?.address ?? "",
    avatar: client.avatar ?? existing?.avatar ?? "",
    dateOfBirth: client.dateOfBirth ?? existing?.dateOfBirth ?? "",
    gender: client.gender ?? existing?.gender ?? "",
    notes: client.notes ?? existing?.notes ?? "",
    status: client.status ?? existing?.status ?? "active",
    userId: client.userId ?? existing?.userId ?? "",
    isArchived: client.isArchived ?? existing?.isArchived ?? false,
    totalBilled: client.totalBilled ?? existing?.totalBilled ?? 0,
    totalPaid: client.totalPaid ?? existing?.totalPaid ?? 0,
    totalSpending: client.totalSpending ?? existing?.totalSpending ?? 0,
    balance: client.balance ?? existing?.balance ?? 0,
    createdAt: existing?.createdAt || client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Sync to MongoDB
  const connected = await connectMongo();
  if (connected) {
    try {
      const userRef = await resolveRef(UserModel, studioId, target.userId);
      await ClientModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: { ...target, user: userRef } },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveClient error", e);
    }
  }

  // Sync to local store
  const idx = store.clients.findIndex((c) => c.id === clientId);
  if (idx !== -1) {
    store.clients[idx] = target;
  } else {
    store.clients.unshift(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deleteClient(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await ClientModel.findOneAndDelete({ id, studioId });
    } catch (e) {
      console.warn("Mongo deleteClient error", e);
    }
  }

  const store = readLocalStore();
  const initialLen = store.clients.length;
  store.clients = store.clients.filter((c) => c.id !== id);
  writeLocalStore(store);

  return store.clients.length < initialLen;
}

// ==========================================
// PACKAGES CRUD
// ==========================================

export async function getPackages(studioId: string = DEFAULT_STUDIO_ID): Promise<PhotographyPackage[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await PackageModel.find({ studioId, isActive: { $ne: false } })
        .sort({ price: 1 })
        .lean();
      return docs.map((d: any) => ({
        ...d,
        id: d.id || d._id.toString(),
      }));
    } catch (e) {
      console.warn("Mongoose getPackages fallback", e);
    }
  }

  const store = readLocalStore();
  return store.packages.filter((p) => p.studioId === studioId && p.isActive !== false);
}

export async function savePackage(pkg: Partial<PhotographyPackage> & { name: string; price: number; studioId?: string }): Promise<PhotographyPackage> {
  const studioId = pkg.studioId || DEFAULT_STUDIO_ID;
  const pkgId = pkg.id || `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.packages.find((p) => p.id === pkgId);

  const target: PhotographyPackage = {
    id: pkgId,
    studioId,
    name: pkg.name,
    description: pkg.description ?? existing?.description ?? "",
    price: Number(pkg.price) || 0,
    coverImage: pkg.coverImage ?? existing?.coverImage ?? "",
    includedServices: pkg.includedServices || existing?.includedServices || [],
    photographyHours: Number(pkg.photographyHours) || existing?.photographyHours || 6,
    editedPhotosCount: Number(pkg.editedPhotosCount) || existing?.editedPhotosCount || 100,
    albumOptions: pkg.albumOptions ?? existing?.albumOptions ?? "",
    deliveryTimeline: pkg.deliveryTimeline ?? existing?.deliveryTimeline ?? "21 Days",
    addOns: pkg.addOns || existing?.addOns || [],
    isActive: pkg.isActive ?? existing?.isActive ?? true,
    createdAt: existing?.createdAt || pkg.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      await PackageModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: target },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo savePackage error", e);
    }
  }

  const idx = store.packages.findIndex((p) => p.id === pkgId);
  if (idx !== -1) {
    store.packages[idx] = target;
  } else {
    store.packages.push(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deletePackage(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await PackageModel.findOneAndDelete({ id, studioId });
    } catch {}
  }

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
      return docs.map((d: any) => ({
        ...d,
        id: d.id || d._id.toString(),
      }));
    } catch (e) {
      console.warn("Mongoose getBookings fallback", e);
    }
  }

  const store = readLocalStore();
  return store.bookings.filter((b) => b.studioId === studioId);
}

export async function saveBooking(booking: Partial<Booking> & { title: string; shootDate: string; clientId: string; studioId?: string }): Promise<Booking> {
  const studioId = booking.studioId || DEFAULT_STUDIO_ID;
  const bookingId = booking.id || `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.bookings.find((b) => b.id === bookingId);
  const client = store.clients.find((c) => c.id === booking.clientId);

  const clientName = booking.clientName || existing?.clientName || client?.name || "Client";
  const clientPhone = booking.clientPhone || existing?.clientPhone || client?.phone || "";
  const clientEmail = booking.clientEmail || existing?.clientEmail || client?.email || "";

  const totalPrice = Number(booking.totalPrice ?? existing?.totalPrice ?? 0);
  const advancePayment = Number(booking.advancePayment ?? existing?.advancePayment ?? 0);
  const remainingBalance = Math.max(0, totalPrice - advancePayment);

  const target: Booking = {
    id: bookingId,
    studioId,
    clientId: booking.clientId,
    clientName,
    clientPhone,
    clientEmail,
    packageId: booking.packageId ?? existing?.packageId ?? "",
    packageName: booking.packageName ?? existing?.packageName ?? "",
    title: booking.title,
    eventType: booking.eventType || existing?.eventType || "wedding",
    shootDate: booking.shootDate,
    startTime: booking.startTime || existing?.startTime || "10:00",
    endTime: booking.endTime ?? existing?.endTime ?? "16:00",
    venue: booking.venue || existing?.venue || "Studio",
    locationAddress: booking.locationAddress ?? existing?.locationAddress ?? "",
    assignedPhotographer: booking.assignedPhotographer ?? existing?.assignedPhotographer ?? "",
    assignedEmployees: booking.assignedEmployees ?? existing?.assignedEmployees ?? [],
    projectId: booking.projectId ?? existing?.projectId ?? "",
    notes: booking.notes ?? existing?.notes ?? "",
    totalPrice,
    advancePayment,
    remainingBalance,
    status: booking.status || existing?.status || "confirmed",
    invoiceId: booking.invoiceId ?? existing?.invoiceId ?? "",
    createdAt: existing?.createdAt || booking.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      const [clientRef, projectRef, employeeRefs] = await Promise.all([
        resolveRef(ClientModel, studioId, target.clientId),
        resolveRef(ProjectModel, studioId, target.projectId),
        resolveRefs(EmployeeModel, studioId, target.assignedEmployees),
      ]);
      const savedBooking = await BookingModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: { ...target, client: clientRef, project: projectRef, assignedEmployees: employeeRefs } },
        { upsert: true, new: true }
      );
      if (clientRef) {
        await ClientModel.updateOne(
          { id: target.clientId, studioId },
          { $addToSet: { bookingHistory: savedBooking._id } }
        );
      }
    } catch (e) {
      console.warn("Mongo saveBooking error", e);
    }
  }

  const idx = store.bookings.findIndex((b) => b.id === bookingId);
  if (idx !== -1) {
    store.bookings[idx] = target;
  } else {
    store.bookings.unshift(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deleteBooking(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await BookingModel.findOneAndDelete({ id, studioId });
    } catch {}
  }

  const store = readLocalStore();
  store.bookings = store.bookings.filter((b) => b.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// INVOICES CRUD
// ==========================================

export async function getInvoices(studioId: string = DEFAULT_STUDIO_ID): Promise<Invoice[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await InvoiceModel.find({ studioId }).sort({ issueDate: -1 }).lean();
      return docs.map((d: any) => ({
        ...d,
        id: d.id || d._id.toString(),
      }));
    } catch (e) {
      console.warn("Mongoose getInvoices fallback", e);
    }
  }

  const store = readLocalStore();
  return store.invoices.filter((i) => i.studioId === studioId);
}

export async function getInvoiceById(id: string, studioId?: string): Promise<Invoice | null> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const query: any = { $or: [{ id }, { shareToken: id }] };
      if (studioId) query.studioId = studioId;
      const doc: any = await InvoiceModel.findOne(query).lean();
      if (doc) {
        return { ...doc, id: doc.id || doc._id.toString() } as Invoice;
      }
    } catch (e) {
      console.warn("Mongoose getInvoiceById fallback", e);
    }
  }

  const store = readLocalStore();
  return store.invoices.find((inv) => inv.id === id || inv.shareToken === id) || null;
}

export async function saveInvoice(invoiceData: Partial<Invoice> & { clientId: string; items: any[]; studioId?: string }): Promise<Invoice> {
  const studioId = invoiceData.studioId || DEFAULT_STUDIO_ID;
  const invoiceId = invoiceData.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.invoices.find((i) => i.id === invoiceId);
  const client = store.clients.find((c) => c.id === invoiceData.clientId);

  const clientName = invoiceData.clientName || existing?.clientName || client?.name || "Client";
  const clientEmail = invoiceData.clientEmail ?? existing?.clientEmail ?? client?.email ?? "";
  const clientPhone = invoiceData.clientPhone ?? existing?.clientPhone ?? client?.phone ?? "";
  const clientAddress = invoiceData.clientAddress ?? existing?.clientAddress ?? client?.address ?? "";

  const items = (invoiceData.items || existing?.items || []).map((it, idx) => ({
    id: it.id || `item_${idx + 1}`,
    description: it.description || "Photography Service",
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unitPrice) || 0,
    amount: roundToTwoDecimals((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
  }));

  const subtotal = roundToTwoDecimals(items.reduce((acc, it) => acc + it.amount, 0));
  const discount = roundToTwoDecimals(Number(invoiceData.discount ?? existing?.discount ?? 0));
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxRate = Number(invoiceData.taxRate ?? existing?.taxRate ?? 0);
  const taxAmount = roundToTwoDecimals((taxableAmount * taxRate) / 100);
  const totalAmount = roundToTwoDecimals(taxableAmount + taxAmount);
  const paidAmount = roundToTwoDecimals(Number(invoiceData.paidAmount ?? existing?.paidAmount ?? 0));
  const balanceDue = roundToTwoDecimals(Math.max(0, totalAmount - paidAmount));

  let status = invoiceData.status || existing?.status || "unpaid";
  if (paidAmount >= totalAmount && totalAmount > 0) {
    status = "paid";
  } else if (paidAmount > 0 && paidAmount < totalAmount) {
    status = "partially_paid";
  } else if (paidAmount === 0 && status !== "draft" && status !== "cancelled") {
    status = "unpaid";
  }

  let invoiceNumber = invoiceData.invoiceNumber || existing?.invoiceNumber;
  if (!invoiceNumber) {
    const prefix = store.settings.invoicePrefix || "PSB-";
    const nextNum = (store.invoices.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();
    invoiceNumber = `${prefix}${year}-${nextNum}`;
  }

  const shareToken = invoiceData.shareToken || existing?.shareToken || `tok_${Math.random().toString(36).substring(2, 12)}`;

  const target: Invoice = {
    id: invoiceId,
    studioId,
    invoiceNumber,
    clientId: invoiceData.clientId,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    bookingId: invoiceData.bookingId ?? existing?.bookingId ?? "",
    bookingTitle: invoiceData.bookingTitle ?? existing?.bookingTitle ?? "",
    issueDate: invoiceData.issueDate || existing?.issueDate || new Date().toISOString().split("T")[0],
    dueDate: invoiceData.dueDate || existing?.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    items,
    subtotal,
    discount,
    taxRate,
    taxAmount,
    totalAmount,
    paidAmount,
    balanceDue,
    status,
    paymentMethod: invoiceData.paymentMethod || existing?.paymentMethod || "bank_transfer",
    notes: invoiceData.notes ?? existing?.notes ?? "",
    terms: invoiceData.terms ?? existing?.terms ?? store.settings.invoiceTerms ?? "",
    shareToken,
    payments: invoiceData.payments ?? existing?.payments ?? [],
    createdAt: existing?.createdAt || invoiceData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      const [clientRef, bookingRef] = await Promise.all([
        resolveRef(ClientModel, studioId, target.clientId),
        resolveRef(BookingModel, studioId, target.bookingId),
      ]);
      await InvoiceModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: { ...target, client: clientRef, booking: bookingRef } },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveInvoice error", e);
    }
  }

  const idx = store.invoices.findIndex((i) => i.id === invoiceId);
  if (idx !== -1) {
    store.invoices[idx] = target;
  } else {
    store.invoices.unshift(target);
  }
  recalculateClientTotals(target.clientId, store, studioId);
  writeLocalStore(store);

  return target;
}

export async function deleteInvoice(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const store = readLocalStore();
  const inv = store.invoices.find((i) => i.id === id);

  const connected = await connectMongo();
  if (connected) {
    try {
      await InvoiceModel.findOneAndDelete({ id, studioId });
      await PaymentModel.deleteMany({ invoiceId: id, studioId });
      await IncomeModel.deleteMany({ invoiceId: id, studioId });
    } catch {}
  }

  store.invoices = store.invoices.filter((i) => i.id !== id);
  store.payments = store.payments.filter((p) => p.invoiceId !== id);
  store.incomes = store.incomes.filter((inc) => inc.invoiceId !== id);

  if (inv) {
    recalculateClientTotals(inv.clientId, store, studioId);
  }
  writeLocalStore(store);

  return true;
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  studioId?: string;
}): Promise<{ payment: Payment; invoice: Invoice }> {
  const studioId = params.studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();

  let invoice = store.invoices.find((i) => i.id === params.invoiceId);
  const connected = await connectMongo();
  if (connected) {
    const doc = await InvoiceModel.findOne({ id: params.invoiceId, studioId }).lean<any>();
    if (doc) {
      invoice = { ...doc, id: doc.id || doc._id.toString() } as unknown as Invoice;
    }
  }

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const paymentAmount = roundToTwoDecimals(Number(params.amount) || 0);
  const newPaidAmount = roundToTwoDecimals((Number(invoice.paidAmount) || 0) + paymentAmount);
  const newBalance = roundToTwoDecimals(Math.max(0, invoice.totalAmount - newPaidAmount));

  let newStatus = invoice.status;
  if (newPaidAmount >= invoice.totalAmount && invoice.totalAmount > 0) {
    newStatus = "paid";
  } else if (newPaidAmount > 0) {
    newStatus = "partially_paid";
  }

  const updatedInvoice: Invoice = {
    ...invoice,
    paidAmount: newPaidAmount,
    balanceDue: newBalance,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  const payment: Payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studioId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    amount: paymentAmount,
    paymentDate: params.paymentDate || new Date().toISOString().split("T")[0],
    paymentMethod: (params.paymentMethod as any) || "cash",
    referenceNumber: params.referenceNumber || "",
    notes: params.notes || `Payment for Invoice #${invoice.invoiceNumber}`,
    createdAt: new Date().toISOString(),
  };

  const income: Income = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studioId,
    title: `Payment: ${invoice.clientName} (Inv #${invoice.invoiceNumber})`,
    amount: paymentAmount,
    category: "wedding_shoot",
    date: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    invoiceId: invoice.id,
    bookingId: invoice.bookingId,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    reference: payment.referenceNumber,
    notes: payment.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (connected) {
    try {
      const [invoiceRef, clientRef] = await Promise.all([
        resolveRef(InvoiceModel, studioId, invoice.id),
        resolveRef(ClientModel, studioId, invoice.clientId),
      ]);
      const paymentDoc = await PaymentModel.create({
        ...payment,
        invoice: invoiceRef,
        client: clientRef,
      });
      await InvoiceModel.findOneAndUpdate(
        { id: invoice.id, studioId },
        {
          $set: updatedInvoice,
          $push: { payments: paymentDoc._id },
        }
      );
      await IncomeModel.create(income);
      if (clientRef) {
        await ClientModel.updateOne(
          { id: invoice.clientId, studioId },
          { $push: { paymentHistory: paymentDoc._id } }
        );
      }
    } catch (e) {
      console.warn("Mongo recordInvoicePayment error", e);
    }
  }

  const invIdx = store.invoices.findIndex((i) => i.id === invoice?.id);
  if (invIdx !== -1) {
    store.invoices[invIdx] = updatedInvoice;
  }
  store.payments.unshift(payment);
  store.incomes.unshift(income);

  recalculateClientTotals(invoice.clientId, store, studioId);
  writeLocalStore(store);

  return { payment, invoice: updatedInvoice };
}

// ==========================================
// PAYMENTS & INCOMES CRUD
// ==========================================

export async function getPayments(studioId: string = DEFAULT_STUDIO_ID): Promise<Payment[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await PaymentModel.find({ studioId }).sort({ paymentDate: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d.id || d._id.toString() }));
    } catch {}
  }
  const store = readLocalStore();
  return store.payments.filter((p) => p.studioId === studioId);
}

export async function getIncomes(studioId: string = DEFAULT_STUDIO_ID): Promise<Income[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await IncomeModel.find({ studioId }).sort({ date: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d.id || d._id.toString() }));
    } catch {}
  }
  const store = readLocalStore();
  return store.incomes.filter((i) => i.studioId === studioId);
}

export async function saveIncome(income: Partial<Income> & { title: string; amount: number; date: string; studioId?: string }): Promise<Income> {
  const studioId = income.studioId || DEFAULT_STUDIO_ID;
  const incomeId = income.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.incomes.find((i) => i.id === incomeId);

  const target: Income = {
    id: incomeId,
    studioId,
    title: income.title,
    amount: roundToTwoDecimals(Number(income.amount) || 0),
    category: income.category || existing?.category || "wedding_shoot",
    date: income.date || existing?.date || new Date().toISOString().split("T")[0],
    paymentMethod: income.paymentMethod || existing?.paymentMethod || "cash",
    invoiceId: income.invoiceId ?? existing?.invoiceId ?? "",
    bookingId: income.bookingId ?? existing?.bookingId ?? "",
    clientId: income.clientId ?? existing?.clientId ?? "",
    clientName: income.clientName ?? existing?.clientName ?? "",
    reference: income.reference ?? existing?.reference ?? "",
    notes: income.notes ?? existing?.notes ?? "",
    createdAt: existing?.createdAt || income.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      await IncomeModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: target },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveIncome error", e);
    }
  }

  const idx = store.incomes.findIndex((i) => i.id === incomeId);
  if (idx !== -1) {
    store.incomes[idx] = target;
  } else {
    store.incomes.unshift(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deleteIncome(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await IncomeModel.findOneAndDelete({ id, studioId });
    } catch {}
  }
  const store = readLocalStore();
  store.incomes = store.incomes.filter((i) => i.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// EXPENSES CRUD
// ==========================================

export async function getExpenses(studioId: string = DEFAULT_STUDIO_ID): Promise<Expense[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await ExpenseModel.find({ studioId }).sort({ date: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d.id || d._id.toString() }));
    } catch {}
  }
  const store = readLocalStore();
  return store.expenses.filter((e) => e.studioId === studioId);
}

export async function saveExpense(expense: Partial<Expense> & { title: string; amount: number; date: string; studioId?: string }): Promise<Expense> {
  const studioId = expense.studioId || DEFAULT_STUDIO_ID;
  const expenseId = expense.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.expenses.find((e) => e.id === expenseId);

  const target: Expense = {
    id: expenseId,
    studioId,
    title: expense.title,
    amount: roundToTwoDecimals(Number(expense.amount) || 0),
    category: expense.category || existing?.category || "equipment",
    date: expense.date || existing?.date || new Date().toISOString().split("T")[0],
    paymentMethod: expense.paymentMethod || existing?.paymentMethod || "cash",
    vendor: expense.vendor ?? existing?.vendor ?? "",
    receiptUrl: expense.receiptUrl ?? existing?.receiptUrl ?? "",
    referenceNumber: expense.referenceNumber ?? existing?.referenceNumber ?? "",
    notes: expense.notes ?? existing?.notes ?? "",
    createdAt: existing?.createdAt || expense.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      await ExpenseModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: target },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveExpense error", e);
    }
  }

  const idx = store.expenses.findIndex((e) => e.id === expenseId);
  if (idx !== -1) {
    store.expenses[idx] = target;
  } else {
    store.expenses.unshift(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deleteExpense(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await ExpenseModel.findOneAndDelete({ id, studioId });
    } catch {}
  }
  const store = readLocalStore();
  store.expenses = store.expenses.filter((e) => e.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// GALLERIES CRUD
// ==========================================

export async function getGalleries(studioId: string = DEFAULT_STUDIO_ID): Promise<Gallery[]> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const docs = await GalleryModel.find({ studioId }).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({ ...d, id: d.id || d._id.toString() }));
    } catch {}
  }
  const store = readLocalStore();
  return store.galleries.filter((g) => g.studioId === studioId);
}

export async function getGalleryById(id: string): Promise<Gallery | null> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const doc: any = await GalleryModel.findOne({ $or: [{ id }, { shareUrlToken: id }] }).lean();
      if (doc) {
        return { ...doc, id: doc.id || doc._id.toString() } as Gallery;
      }
    } catch {}
  }
  const store = readLocalStore();
  return store.galleries.find((g) => g.id === id || g.shareUrlToken === id) || null;
}

export async function saveGallery(gallery: Partial<Gallery> & { title: string; studioId?: string }): Promise<Gallery> {
  const studioId = gallery.studioId || DEFAULT_STUDIO_ID;
  const galleryId = gallery.id || `gal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const store = readLocalStore();
  const existing = store.galleries.find((g) => g.id === galleryId);

  const target: Gallery = {
    id: galleryId,
    studioId,
    clientId: gallery.clientId ?? existing?.clientId ?? "",
    clientName: gallery.clientName ?? existing?.clientName ?? "",
    employeeId: gallery.employeeId ?? existing?.employeeId ?? "",
    employeeName: gallery.employeeName ?? existing?.employeeName ?? "",
    projectId: gallery.projectId ?? existing?.projectId ?? "",
    projectTitle: gallery.projectTitle ?? existing?.projectTitle ?? "",
    title: gallery.title,
    description: gallery.description ?? existing?.description ?? "",
    coverImage: gallery.coverImage ?? existing?.coverImage ?? "",
    eventType: gallery.eventType || existing?.eventType || "wedding",
    shootDate: gallery.shootDate ?? existing?.shootDate ?? "",
    isPublic: gallery.isPublic ?? existing?.isPublic ?? false,
    isPasswordProtected: gallery.isPasswordProtected ?? existing?.isPasswordProtected ?? false,
    accessPassword: gallery.accessPassword ?? existing?.accessPassword ?? "",
    shareUrlToken: gallery.shareUrlToken || existing?.shareUrlToken || `sh_${Math.random().toString(36).substring(2, 12)}`,
    downloadEnabled: gallery.downloadEnabled ?? existing?.downloadEnabled ?? true,
    images: gallery.images || existing?.images || [],
    createdAt: existing?.createdAt || gallery.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      const [clientRef, projectRef, employeeRef] = await Promise.all([
        resolveRef(ClientModel, studioId, target.clientId),
        resolveRef(ProjectModel, studioId, target.projectId),
        resolveRef(EmployeeModel, studioId, target.employeeId),
      ]);
      await GalleryModel.findOneAndUpdate(
        { id: target.id, studioId },
        { $set: { ...target, client: clientRef, project: projectRef, employee: employeeRef } },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveGallery error", e);
    }
  }

  const idx = store.galleries.findIndex((g) => g.id === galleryId);
  if (idx !== -1) {
    store.galleries[idx] = target;
  } else {
    store.galleries.unshift(target);
  }
  writeLocalStore(store);

  return target;
}

export async function deleteGallery(id: string, studioId: string = DEFAULT_STUDIO_ID): Promise<boolean> {
  const connected = await connectMongo();
  if (connected) {
    try {
      await GalleryModel.findOneAndDelete({ id, studioId });
    } catch {}
  }
  const store = readLocalStore();
  store.galleries = store.galleries.filter((g) => g.id !== id);
  writeLocalStore(store);
  return true;
}

// ==========================================
// SETTINGS
// ==========================================

export async function getSettings(studioId: string = DEFAULT_STUDIO_ID): Promise<StudioSettings> {
  const connected = await connectMongo();
  if (connected) {
    try {
      const doc: any = await StudioSettingsModel.findOne({ studioId }).lean();
      if (doc) {
        return { ...doc, id: doc.id || doc._id.toString() } as StudioSettings;
      }

      // If settings don't exist yet for this studioId, initialize them in Mongo
      const newSettings: StudioSettings = {
        ...initialSettings,
        id: `set_${studioId}`,
        studioId,
      };
      await StudioSettingsModel.create(newSettings);
      return newSettings;
    } catch (e) {
      console.warn("Mongoose getSettings fallback", e);
    }
  }

  const store = readLocalStore();
  if (store.studioSettingsMap && store.studioSettingsMap[studioId]) {
    return store.studioSettingsMap[studioId];
  }
  return store.settings || initialSettings;
}

export async function saveSettings(settings: Partial<StudioSettings>, studioId?: string): Promise<StudioSettings> {
  const targetStudioId = settings.studioId || studioId || DEFAULT_STUDIO_ID;
  const store = readLocalStore();
  const current = (store.studioSettingsMap && store.studioSettingsMap[targetStudioId]) || store.settings || initialSettings;

  const updated: StudioSettings = {
    ...current,
    ...settings,
    studioId: targetStudioId,
    id: current.id || `set_${targetStudioId}`,
    updatedAt: new Date().toISOString(),
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      await StudioSettingsModel.findOneAndUpdate(
        { studioId: targetStudioId },
        { $set: updated },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Mongo saveSettings error", e);
    }
  }

  if (!store.studioSettingsMap) store.studioSettingsMap = {};
  store.studioSettingsMap[targetStudioId] = updated;
  if (targetStudioId === DEFAULT_STUDIO_ID) {
    store.settings = updated;
  }
  writeLocalStore(store);

  return updated;
}

// ==========================================
// RESET & SEED
// ==========================================

export async function resetAndSeedData(studioId: string = DEFAULT_STUDIO_ID): Promise<LocalStore> {
  const freshData: LocalStore = {
    clients: demoClients.map((c) => ({ ...c, studioId })),
    bookings: demoBookings.map((b) => ({ ...b, studioId })),
    invoices: demoInvoices.map((i) => ({ ...i, studioId })),
    payments: demoPayments.map((p) => ({ ...p, studioId })),
    incomes: demoIncomes.map((inc) => ({ ...inc, studioId })),
    expenses: demoExpenses.map((e) => ({ ...e, studioId })),
    packages: demoPackages.map((p) => ({ ...p, studioId })),
    galleries: demoGalleries.map((g) => ({ ...g, studioId })),
    settings: { ...initialSettings, studioId },
    studioSettingsMap: {
      [studioId]: { ...initialSettings, studioId },
    },
  };

  const connected = await connectMongo();
  if (connected) {
    try {
      await Promise.all([
        ClientModel.deleteMany({ studioId }),
        BookingModel.deleteMany({ studioId }),
        InvoiceModel.deleteMany({ studioId }),
        PaymentModel.deleteMany({ studioId }),
        IncomeModel.deleteMany({ studioId }),
        ExpenseModel.deleteMany({ studioId }),
        PackageModel.deleteMany({ studioId }),
        GalleryModel.deleteMany({ studioId }),
      ]);

      await Promise.all([
        ClientModel.insertMany(freshData.clients),
        BookingModel.insertMany(freshData.bookings),
        InvoiceModel.insertMany(freshData.invoices),
        PaymentModel.insertMany(freshData.payments),
        IncomeModel.insertMany(freshData.incomes),
        ExpenseModel.insertMany(freshData.expenses),
        PackageModel.insertMany(freshData.packages),
        GalleryModel.insertMany(freshData.galleries),
        StudioSettingsModel.findOneAndUpdate({ studioId }, { $set: freshData.settings }, { upsert: true }),
      ]);
    } catch (e) {
      console.warn("Mongo seed error", e);
    }
  }

  writeLocalStore(freshData);
  return freshData;
}

// ==========================================
// HELPER: RECALCULATE CLIENT TOTALS
// ==========================================

async function recalculateClientTotals(clientId: string, store: LocalStore, studioId: string = DEFAULT_STUDIO_ID) {
  const clientInvoices = store.invoices.filter((i) => i.clientId === clientId && i.status !== "cancelled");
  const totalBilled = roundToTwoDecimals(clientInvoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0));
  const totalPaid = roundToTwoDecimals(clientInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0));
  const balance = roundToTwoDecimals(Math.max(0, totalBilled - totalPaid));

  const clientIdx = store.clients.findIndex((c) => c.id === clientId);
  if (clientIdx !== -1) {
    store.clients[clientIdx].totalBilled = totalBilled;
    store.clients[clientIdx].totalPaid = totalPaid;
    store.clients[clientIdx].totalSpending = totalPaid;
    store.clients[clientIdx].balance = balance;
  }

  const connected = await connectMongo();
  if (connected) {
    try {
      await ClientModel.findOneAndUpdate(
        { id: clientId, studioId },
        { $set: { totalBilled, totalPaid, totalSpending: totalPaid, balance } }
      );
    } catch {}
  }
}
