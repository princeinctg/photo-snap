"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Upload,
  Download,
  Trash2,
  Check,
  Palette,
  Camera,
  DollarSign,
  Receipt,
  Database,
  Building,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/ThemeProvider";
import type { StudioSettings } from "@/types";

export default function SettingsPage() {
  const {
    mode,
    setMode,
    primaryColor,
    setPrimaryColor,
    borderRadius,
    setBorderRadius,
    refreshSettings,
  } = useTheme();

  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        ...settings,
        theme: {
          mode,
          primaryColor,
          accentColor: "amber",
          borderRadius,
          font: "sans",
        },
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess(true);
        refreshSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Export Full JSON Backup
  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data.backup, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `photo_studio_os_backup_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import", backupData: json }),
        });
        if (res.ok) {
          setBackupMsg("Database restored successfully from JSON backup! Reloading...");
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        alert("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  // Reset / Seed Demo Data
  const handleSeedDemoData = async () => {
    if (!confirm("Seed realistic photography studio demo data? Existing records will be refreshed.")) return;
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      if (res.ok) {
        alert("Demo data successfully seeded!");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear All Demo Data
  const handleClearData = async () => {
    if (!confirm("Clear all sample data and start with an empty studio database?")) return;
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      if (res.ok) {
        alert("Studio cleared successfully.");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
        Loading studio settings...
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SettingsIcon className="h-7 w-7 text-primary" />
            <span>Studio Settings & Branding</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Customize your photography studio branding, invoice terms, theme palette, and database backups.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30 animate-in fade-in">
            <Check className="h-4 w-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Studio Identity Card */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span>Studio Profile & Contact Information</span>
            </CardTitle>
            <CardDescription>Displayed on your invoices, emails, and client delivery galleries</CardDescription>
          </CardHeader>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Studio Business Name *</label>
              <Input
                required
                value={settings.studioName}
                onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Studio Tagline / Slogan</label>
              <Input
                value={settings.tagline || ""}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Studio Phone *</label>
              <Input
                required
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Studio Email *</label>
              <Input
                type="email"
                required
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Studio Physical Address</label>
              <Input
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Studio Website URL</label>
              <Input
                value={settings.website || ""}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Studio Logo Image URL</label>
              <div className="flex gap-3 items-center">
                <Input
                  value={settings.logoUrl || ""}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://..."
                />
                {settings.logoUrl && (
                  <div className="h-10 w-10 rounded border bg-card p-1 shrink-0 overflow-hidden">
                    <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Authorized Signature Image URL</label>
              <Input
                value={settings.signatureUrl || ""}
                onChange={(e) => setSettings({ ...settings, signatureUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </Card>

        {/* Currency & Invoice Configuration */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Currency, Tax & Invoicing Rules</span>
            </CardTitle>
            <CardDescription>Configure numbering prefixes, default VAT/tax rates, and currency formats</CardDescription>
          </CardHeader>

          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Currency Code</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="BDT">BDT (Bangladeshi Taka)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Currency Symbol</label>
              <Input
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Default Tax / VAT (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Invoice Number Prefix</label>
              <Input
                placeholder="e.g. PSB- or INV-"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Default Invoice Footer Note</label>
              <Input
                value={settings.invoiceFooterNote || ""}
                onChange={(e) => setSettings({ ...settings, invoiceFooterNote: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground">Default Invoice Terms & Conditions</label>
              <Textarea
                value={settings.invoiceTerms || ""}
                onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Theme and Appearance Customizer */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span>Design System & Theme Customizer</span>
            </CardTitle>
            <CardDescription>Tailor the visual aesthetic, dark/light mode, and primary accent palette</CardDescription>
          </CardHeader>

          <div className="space-y-5 pt-2">
            {/* Mode: Dark / Light / System */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Display Mode</label>
              <div className="flex gap-2">
                {[
                  { id: "dark", label: "Dark Mode" },
                  { id: "light", label: "Light Mode" },
                  { id: "system", label: "System Auto" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      mode === item.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Accent Color Picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">
                Primary Brand Accent Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { id: "emerald", label: "Emerald Green", hex: "#10b981" },
                  { id: "indigo", label: "Indigo Royal", hex: "#6366f1" },
                  { id: "amber", label: "Amber Gold", hex: "#f59e0b" },
                  { id: "violet", label: "Violet Iris", hex: "#8b5cf6" },
                  { id: "rose", label: "Rose Crimson", hex: "#f43f5e" },
                  { id: "sky", label: "Sky Ocean", hex: "#0ea5e9" },
                ].map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setPrimaryColor(col.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      primaryColor === col.id
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.hex }} />
                    <span>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">
                Corner Rounding (Border Radius)
              </label>
              <div className="flex gap-2">
                {[
                  { id: "sm", label: "Subtle (Small)" },
                  { id: "md", label: "Standard (Medium)" },
                  { id: "lg", label: "Modern (Large)" },
                  { id: "full", label: "Pill (Rounded)" },
                ].map((rad) => (
                  <button
                    key={rad.id}
                    type="button"
                    onClick={() => setBorderRadius(rad.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      borderRadius === rad.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Database Management & Backups */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>Data Export, Backups & Demo Reset</span>
            </CardTitle>
            <CardDescription>Export your entire studio database as portable JSON, restore backups, or reset demo data</CardDescription>
          </CardHeader>

          {backupMsg && (
            <div className="p-3 my-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {backupMsg}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="p-4 rounded-xl border bg-card/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="font-semibold text-sm text-foreground">Export Portable JSON Backup</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Download clients, invoices, bookings, expenses, and packages as a self-contained JSON file.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleExportBackup} className="gap-1.5 text-xs self-start">
                <Download className="h-3.5 w-3.5" />
                <span>Export Backup File</span>
              </Button>
            </div>

            <div className="p-4 rounded-xl border bg-card/60 flex flex-col justify-between space-y-3">
              <div>
                <div className="font-semibold text-sm text-foreground">Restore JSON Backup</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Import a previously exported JSON file to recover all studio data.
                </p>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium bg-secondary hover:bg-secondary/80">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Backup File</span>
                </span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>

            <div className="p-4 rounded-xl border bg-card/60 flex flex-col justify-between space-y-3 sm:col-span-2">
              <div>
                <div className="font-semibold text-sm text-foreground">Realistic Demo Data Controls</div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Photo Studio OS includes PhotoSnap BD style realistic wedding and commercial demo data. You can re-seed sample data for evaluation or clear everything to start with an empty studio.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSeedDemoData} className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Re-Seed Demo Data</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearData} className="gap-1.5 text-xs text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All Demo Data</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4 p-4 rounded-xl bg-card/90 backdrop-blur border shadow-xl z-20">
          <Button type="submit" size="lg" disabled={saving} className="gap-2 px-8 shadow-md">
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
