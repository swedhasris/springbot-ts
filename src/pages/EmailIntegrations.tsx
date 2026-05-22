// EmailIntegrations page copied from tis version
import React, { useState, useEffect } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Settings,
  Shield,
  Send,
  RefreshCw,
  MoreVertical,
  Check,
  Building2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

interface EmailConfig {
  id: string;
  company_name: string;
  email_address: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  imap_pass: string;
  encryption: string;
  is_active: number;
  is_default: number;
  created_at: string;
}

export function EmailIntegrations() {
  const { profile } = useAuth();
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  // Premium Wizard States
  const [currentStep, setCurrentStep] = useState(1);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showImapPass, setShowImapPass] = useState(false);

  // Reset wizard states when opening the modal
  useEffect(() => {
    if (showModal) {
      setCurrentStep(1);
      setShowSmtpPass(false);
      setShowImapPass(false);
      setTestResult(null);
    }
  }, [showModal]);

  const [form, setForm] = useState<Partial<EmailConfig>>({
    company_name: "",
    email_address: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    smtp_user: "",
    smtp_pass: "",
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_user: "",
    imap_pass: "",
    encryption: "TLS",
    is_active: 1,
    is_default: 0
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email-configs");
      const data = await res.json();
      setConfigs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/email-configs/${editingId}` : "/api/email-configs";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setShowModal(false);
        fetchConfigs();
        setForm({
          company_name: "",
          email_address: "",
          smtp_host: "smtp.gmail.com",
          smtp_port: 587,
          smtp_user: "",
          smtp_pass: "",
          imap_host: "imap.gmail.com",
          imap_port: 993,
          imap_user: "",
          imap_pass: "",
          encryption: "TLS",
          is_active: 1,
          is_default: 0
        });
        setEditingId(null);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email-configs/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.detail || data.message || data.error });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
    }
    setTesting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) return;
    try {
      await fetch(`/api/email-configs/${id}`, { method: "DELETE" });
      fetchConfigs();
    } catch (e) { console.error(e); }
  };

  if (profile?.role !== 'ultra_super_admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">Only Ultra Super Admins can manage email integrations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Email Integration Management</h1>
          <p className="text-muted-foreground">Manage multi-company SMTP and IMAP configurations for automated support ticketing.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowModal(true); }} className="bg-sn-green text-sn-dark font-bold gap-2">
          <Plus className="w-4 h-4" /> Add Integration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.map(config => (
          <div key={config.id} className="sn-card p-6 flex flex-col space-y-4 relative group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sn-green/10 flex items-center justify-center text-sn-green">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sn-dark">{config.company_name}</h3>
                  <p className="text-xs text-muted-foreground">{config.email_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {config.is_default === 1 && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Default</span>
                )}
                {config.is_active === 1 ? (
                  <CheckCircle className="w-4 h-4 text-sn-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Status</p>
                <div className="flex items-center gap-1.5 text-xs text-sn-dark">
                  <Send className="w-3.5 h-3.5" /> {config.smtp_host}:{config.smtp_port}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">IMAP Status</p>
                <div className="flex items-center gap-1.5 text-xs text-sn-dark">
                  <RefreshCw className="w-3.5 h-3.5" /> {config.imap_host}:{config.imap_port}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(config.id); setForm(config); setShowModal(true); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(config.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {configs.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center sn-card bg-muted/20">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-lg text-sn-dark">No Integrations Configured</h3>
            <p className="text-muted-foreground text-sm">Add your first company email configuration to start polling tickets.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[1000px] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sn-green/10 flex items-center justify-center text-sn-green shadow-sm">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{editingId ? "Edit Integration" : "Add New Integration"}</h2>
                  <p className="text-sm text-slate-500 mt-1">Configure company-specific email connection settings.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 focus:outline-none">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Step Header */}
            <div className="px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                {[{ step: 1, label: 'Company Details' }, { step: 2, label: 'Security' }, { step: 3, label: 'Email Configuration' }].map((s) => {
                  const isActive = currentStep === s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCurrentStep(s.step)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 ${isActive ? 'bg-white shadow-sm ring-1 ring-slate-200 text-sn-green font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 font-medium'}`}
                    >
                      <span>Step {s.step} → {s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden bg-slate-50/30">
              <div className="p-8 overflow-y-auto space-y-8 flex-grow custom-scrollbar min-h-[400px]">
                {/* STEP 1 */}
                {currentStep === 1 && (
                  <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-8 space-y-6">
                      <div>
                        <label htmlFor="company_name" className="text-sm font-semibold text-slate-700 block mb-2">Company Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input id="company_name" required placeholder="e.g. Technosprint" value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Enter the display or registered name of the customer company.</p>
                      </div>
                      <div>
                        <label htmlFor="email_address" className="text-sm font-semibold text-slate-700 block mb-2">Support Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input id="email_address" required type="email" placeholder="e.g. support@technosprint.net" value={form.email_address} onChange={e => setForm(f => ({...f, email_address: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">The primary inbox used for processing ticketing and support issues.</p>
                      </div>
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-8 flex flex-col sm:flex-row gap-8 justify-between">
                        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1">
                          <div>
                            <label htmlFor="toggle_active" className="text-sm font-semibold text-slate-700 block mb-1">Active Integration</label>
                            <span className="text-xs text-slate-500">Enable background polling</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">{form.is_active === 1 ? 'ON' : 'OFF'}</span>
                            <button id="toggle_active" type="button" onClick={() => setForm(f => ({...f, is_active: f.is_active === 1 ? 0 : 1}))} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner ${form.is_active === 1 ? 'bg-sn-green' : 'bg-slate-200'}`}>
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.is_active === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>
                        <div className="hidden sm:block w-px bg-slate-100" />
                        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1">
                          <div>
                            <label htmlFor="toggle_default" className="text-sm font-semibold text-slate-700 block mb-1">Set as Default</label>
                            <span className="text-xs text-slate-500">Fallback for unmatched domains</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">{form.is_default === 1 ? 'ON' : 'OFF'}</span>
                            <button id="toggle_default" type="button" onClick={() => setForm(f => ({...f, is_default: f.is_default === 1 ? 0 : 1}))} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner ${form.is_default === 1 ? 'bg-blue-500' : 'bg-slate-200'}`}>
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.is_default === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* STEP 2 */}
                {currentStep === 2 && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[{ id: 'TLS', label: '🔒 TLS', desc: 'Recommended for secure email transmission' }, { id: 'SSL', label: '🔐 SSL', desc: 'Alternative secure connection' }, { id: 'None', label: '⚪ None', desc: 'No encryption' }].map(opt => {
                        const isSelected = form.encryption === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => setForm(f => ({...f, encryption: opt.id}))} className={`bg-white p-6 rounded-2xl border-2 text-left transition-all duration-300 focus:outline-none flex flex-col justify-between min-h-[160px] ${isSelected ? 'border-sn-green shadow-md shadow-sn-green/20 ring-2 ring-sn-green/50' : 'border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md'}`}>
                            <div className="flex items-start justify-between w-full">
                              <span className="text-xl font-bold text-slate-800">{opt.label}</span>
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-sn-green flex items-center justify-center text-white shadow-sm">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <div className="mt-4"><span className="text-sm text-slate-500 block">{opt.desc}</span></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* STEP 3 */}
                {currentStep === 3 && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* SMTP */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-8 space-y-6">
                        <h4 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-3">
                          <span className="text-2xl">📤</span> SMTP Settings (Outbound)
                        </h4>
                        <div className="space-y-6">
                          <div>
                            <label htmlFor="smtp_host" className="text-sm font-semibold text-slate-700 block mb-2">SMTP Host</label>
                            <div className="relative">
                              <Globe className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="smtp_host" required placeholder="smtp.gmail.com" value={form.smtp_host} onChange={e => setForm(f => ({...f, smtp_host: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Used for sending outgoing emails</p>
                          </div>
                          <div>
                            <label htmlFor="smtp_port" className="text-sm font-semibold text-slate-700 block mb-2">Port</label>
                            <input id="smtp_port" required type="number" placeholder="587" value={form.smtp_port} onChange={e => setForm(f => ({...f, smtp_port: parseInt(e.target.value)}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            <p className="text-xs text-slate-500 mt-2">Recommended port for TLS</p>
                          </div>
                          <div>
                            <label htmlFor="smtp_user" className="text-sm font-semibold text-slate-700 block mb-2">Username</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="smtp_user" required placeholder="e.g. user@gmail.com" value={form.smtp_user} onChange={e => setForm(f => ({...f, smtp_user: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Outgoing SMTP authentication username.</p>
                          </div>
                          <div>
                            <label htmlFor="smtp_pass" className="text-sm font-semibold text-slate-700 block mb-2">Password / App Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="smtp_pass" required type={showSmtpPass ? "text" : "password"} placeholder="••••••••••••" value={form.smtp_pass} onChange={e => setForm(f => ({...f, smtp_pass: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-12 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                              <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                                {showSmtpPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Authentication credentials or service key.</p>
                          </div>
                        </div>
                      </div>
                      {/* IMAP */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-8 space-y-6">
                        <h4 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 flex items-center gap-3">
                          <span className="text-2xl">📥</span> IMAP Settings (Inbound)
                        </h4>
                        <div className="space-y-6">
                          <div>
                            <label htmlFor="imap_host" className="text-sm font-semibold text-slate-700 block mb-2">IMAP Host</label>
                            <div className="relative">
                              <Globe className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="imap_host" required placeholder="imap.gmail.com" value={form.imap_host} onChange={e => setForm(f => ({...f, imap_host: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Used for reading incoming emails</p>
                          </div>
                          <div>
                            <label htmlFor="imap_port" className="text-sm font-semibold text-slate-700 block mb-2">Port</label>
                            <input id="imap_port" required type="number" placeholder="993" value={form.imap_port} onChange={e => setForm(f => ({...f, imap_port: parseInt(e.target.value)}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            <p className="text-xs text-slate-500 mt-2">Recommended port: 993 (SSL/TLS)</p>
                          </div>
                          <div>
                            <label htmlFor="imap_user" className="text-sm font-semibold text-slate-700 block mb-2">Username</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="imap_user" required placeholder="e.g. user@gmail.com" value={form.imap_user} onChange={e => setForm(f => ({...f, imap_user: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Incoming IMAP authentication username.</p>
                          </div>
                          <div>
                            <label htmlFor="imap_pass" className="text-sm font-semibold text-slate-700 block mb-2">Password / App Password</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                              <input id="imap_pass" required type={showImapPass ? "text" : "password"} placeholder="••••••••••••" value={form.imap_pass} onChange={e => setForm(f => ({...f, imap_pass: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-12 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green transition-all" />
                              <button type="button" onClick={() => setShowImapPass(!showImapPass)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                                {showImapPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Authentication credentials or service key.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-200/60 mt-4">
                      <h4 className="text-sm font-bold text-slate-800 mb-4">Connection Status</h4>
                      {testing && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 animate-pulse w-fit">
                          <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                          <span className="text-sm font-bold">🟡 Testing Connection</span>
                        </div>
                      )}
                      {!testing && testResult && (
                        <div className={`p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 w-full sm:w-fit ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                          {testResult.success ? (
                            <div className="flex items-center gap-3"><span className="text-sm font-bold">🟢 Connected Successfully</span></div>
                          ) : (
                            <div className="space-y-2"><div className="flex items-center gap-3"><span className="text-sm font-bold">🔴 Authentication Failed</span></div><p className="text-sm opacity-90 pl-6">{testResult.message}</p></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="w-full sm:w-auto text-slate-700 border-slate-300 hover:bg-slate-50 font-bold h-11 px-6 rounded-xl transition-all shadow-sm">
                  <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="w-full sm:w-auto text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-semibold h-11 px-6 rounded-xl transition-all">
                    Cancel
                  </Button>
                  {currentStep > 1 && (
                    <Button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold h-11 px-6 rounded-xl transition-all shadow-sm">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  )}
                  {currentStep < 3 ? (
                    <Button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="w-full sm:w-auto bg-slate-800 text-white hover:bg-slate-700 font-bold h-11 px-8 rounded-xl transition-all shadow-sm">
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-sn-green text-sn-dark font-bold hover:bg-sn-green/90 h-11 px-8 rounded-xl transition-transform hover:scale-[1.02] shadow-sm">
                      {saving ? "Saving..." : editingId ? "Update Integration" : "Save Integration"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
