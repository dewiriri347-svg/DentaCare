/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  Bell, 
  ChevronRight, 
  Activity,
  Stethoscope,
  BookOpen,
  History,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  UserCircle,
  FileDigit,
  Upload,
  Printer,
  Edit,
  Trash2,
  Save,
  CreditCard,
  GraduationCap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { DIAGNOSIS_NEEDS } from './constants/diagnosisData';
import { GoogleGenAI } from "@google/genai";
import { 
  ADULT_TEETH_TOP, 
  ADULT_TEETH_BOTTOM, 
  CHILD_TEETH_TOP, 
  CHILD_TEETH_BOTTOM, 
  ToothStatus,
  ToothSurfaceData,
  SurfaceStatus
} from './constants/toothData';
import { HUMAN_NEEDS, TREATMENTS_2023 } from './constants/medicalData';
import SignatureCanvas from 'react-signature-canvas';
import { Auth } from './components/Auth';
import Markdown from 'react-markdown';

// --- Types ---
type Page = 'dashboard' | 'patients' | 'records' | 'appointments' | 'reports' | 'diagnosis-ref' | 'security' | 'billing' | 'education';

interface User {
  name: string;
  role: string;
}

interface Patient {
  id: string;
  name: string;
  nik: string;
  mrNumber: string;
  birthDate: string;
  gender: 'L' | 'P';
  address: string;
  phone: string;
  insurance: string;
  status: 'active' | 'inactive';
}

interface Appointment {
  id: number;
  patient: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending';
}

// --- Mock Data ---
const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'Ahmad Subarjo', nik: '3201012345678901', mrNumber: 'RM-001', birthDate: '1985-05-12', gender: 'L', address: 'Jl. Merdeka No. 10', phone: '08123456789', insurance: 'BPJS', status: 'active' },
  { id: '2', name: 'Siti Aminah', nik: '3201012345678902', mrNumber: 'RM-002', birthDate: '1992-08-24', gender: 'P', address: 'Jl. Mawar No. 5', phone: '08129876543', insurance: 'Mandiri Inhealth', status: 'active' },
  { id: '3', name: 'Budi Santoso', nik: '3201012345678903', mrNumber: 'RM-003', birthDate: '1978-11-02', gender: 'L', address: 'Jl. Melati No. 15', phone: '08131122334', insurance: 'Umum', status: 'active' },
];

const DASHBOARD_STATS = [
  { label: 'Total Pasien', value: '1,284', icon: Users, color: 'bg-blue-500' },
  { label: 'Kunjungan Hari Ini', value: '24', icon: Calendar, color: 'bg-emerald-500' },
  { label: 'Rata-rata DMF-T', value: '4.2', icon: Activity, color: 'bg-amber-500' },
  { label: 'OHI-S Baik', value: '68%', icon: CheckCircle2, color: 'bg-purple-500' },
];

const CHART_DATA = [
  { name: 'Jan', dmft: 4.1, ohis: 1.2 },
  { name: 'Feb', dmft: 4.3, ohis: 1.1 },
  { name: 'Mar', dmft: 4.2, ohis: 1.3 },
  { name: 'Apr', dmft: 4.0, ohis: 1.0 },
  { name: 'May', dmft: 3.8, ohis: 0.9 },
  { name: 'Jun', dmft: 3.9, ohis: 1.1 },
];

// --- Helpers ---
const calculateAge = (birthDate: string) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const generateMRNumber = (lastNumber: string) => {
  const num = parseInt(lastNumber.split('-')[1]) + 1;
  return `RM-${num.toString().padStart(3, '0')}`;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
    <span className="font-medium">{label}</span>
  </button>
);

const Tooth = ({ id, data, onSurfaceClick }: { 
  id: number, 
  data?: ToothSurfaceData, 
  onSurfaceClick: (id: number, surface: keyof ToothSurfaceData) => void 
}) => {
  const defaultData: ToothSurfaceData = {
    top: 'healthy',
    bottom: 'healthy',
    left: 'healthy',
    right: 'healthy',
    center: 'healthy'
  };

  const currentData = data || defaultData;

  const getStatusColor = (status: SurfaceStatus) => {
    switch (status) {
      case 'caries': return 'fill-red-500 stroke-red-700';
      case 'filled': return 'fill-blue-500 stroke-blue-700';
      case 'missing': return 'fill-slate-200 stroke-slate-400';
      case 'impacted': return 'fill-amber-500 stroke-amber-700';
      default: return 'fill-white stroke-slate-400';
    }
  };

  return (
    <div className="flex flex-col items-center group">
      <span className="text-[9px] font-bold text-slate-500 mb-1">{id}</span>
      <svg width="32" height="32" viewBox="0 0 40 40" className="transition-transform hover:scale-110">
        {/* Top Surface */}
        <path 
          d="M0 0 L40 0 L30 10 L10 10 Z" 
          className={cn("cursor-pointer transition-colors", getStatusColor(currentData.top))}
          onClick={() => onSurfaceClick(id, 'top')}
          strokeWidth="0.5"
        />
        {/* Bottom Surface */}
        <path 
          d="M0 40 L40 40 L30 30 L10 30 Z" 
          className={cn("cursor-pointer transition-colors", getStatusColor(currentData.bottom))}
          onClick={() => onSurfaceClick(id, 'bottom')}
          strokeWidth="0.5"
        />
        {/* Left Surface */}
        <path 
          d="M0 0 L0 40 L10 30 L10 10 Z" 
          className={cn("cursor-pointer transition-colors", getStatusColor(currentData.left))}
          onClick={() => onSurfaceClick(id, 'left')}
          strokeWidth="0.5"
        />
        {/* Right Surface */}
        <path 
          d="M40 0 L40 40 L30 30 L30 10 Z" 
          className={cn("cursor-pointer transition-colors", getStatusColor(currentData.right))}
          onClick={() => onSurfaceClick(id, 'right')}
          strokeWidth="0.5"
        />
        {/* Center Surface */}
        <rect 
          x="10" y="10" width="20" height="20"
          className={cn("cursor-pointer transition-colors", getStatusColor(currentData.center))}
          onClick={() => onSurfaceClick(id, 'center')}
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
};

// --- Pages ---

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={cn(
      "fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border font-bold",
      type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
    )}
  >
    {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
    <span>{message}</span>
    <button onClick={onClose} className="ml-4 p-1 hover:bg-black/5 rounded-lg transition-colors">
      <X size={16} />
    </button>
  </motion.div>
);

const Reports = ({ onSave }: { onSave: () => void }) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pelaporan & Analitik</h2>
        <p className="text-slate-500">Laporan performa klinik dan statistik kesehatan gigi</p>
      </div>
      <button 
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
      >
        <Printer size={16} />
        Cetak Laporan Bulanan
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: 'Kunjungan Baru', value: '124', trend: '+15%', color: 'bg-blue-500' },
        { label: 'Total Pendapatan', value: 'Rp 45.2M', trend: '+8%', color: 'bg-emerald-500' },
        { label: 'Pasien Selesai Perawatan', value: '89', trend: '+22%', color: 'bg-purple-500' },
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{stat.trend}</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", stat.color)} style={{ width: '70%' }} />
          </div>
        </div>
      ))}
    </div>

    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-8">Distribusi Diagnosa Terbanyak</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[
            { name: 'Karies Gigi', count: 45 },
            { name: 'Gingivitis', count: 32 },
            { name: 'Periodontitis', count: 18 },
            { name: 'Maloklusi', count: 25 },
            { name: 'Pulpitis', count: 12 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const Security = ({ onSave }: { onSave: () => void }) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Keamanan & Privasi Data</h2>
        <p className="text-slate-500">Kelola enkripsi, audit log, dan akses data pasien</p>
      </div>
      <button 
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
      >
        <ShieldCheck size={16} />
        Perbarui Keamanan
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Status Enkripsi</h3>
            <p className="text-xs text-slate-500">Data terenkripsi dengan AES-256</p>
          </div>
          <div className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">Aktif</div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Enkripsi Database</span>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Audit Log Otomatis</span>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Two-Factor Auth</span>
            <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
          <History size={20} className="text-blue-600" />
          Audit Log Terakhir
        </h3>
        <div className="space-y-4">
          {[
            { user: 'Dewi', action: 'Mengakses RM-001', time: '5 menit yang lalu', ip: '192.168.1.10' },
            { user: 'Admin', action: 'Login Berhasil', time: '1 jam yang lalu', ip: '192.168.1.1' },
            { user: 'Dewi', action: 'Mengubah Data RM-002', time: '2 jam yang lalu', ip: '192.168.1.10' },
            { user: 'System', action: 'Backup Otomatis', time: '3 jam yang lalu', ip: 'Local' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-slate-900">{log.action}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.user} • {log.ip}</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600">{log.time}</span>
            </div>
          ))}
        </div>
        <button className="w-full mt-6 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
          Lihat Semua Audit Log
        </button>
      </div>
    </div>
  </div>
);

const Dashboard = ({ onNavigate }: { onNavigate: (page: Page) => void }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {DASHBOARD_STATS.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-3 rounded-xl text-white", stat.color)}>
              <stat.icon size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
        </motion.div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Tren Kesehatan Gigi Populasi</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="dmft" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name="DMF-T" />
              <Line type="monotone" dataKey="ohis" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="OHI-S" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Notifikasi Follow-up</h3>
        <div className="space-y-4">
          {[
            { name: 'Ahmad Subarjo', task: 'Recall Scaling', time: '2 jam lagi', urgent: true },
            { name: 'Siti Aminah', task: 'Kontrol Ortho', time: 'Besok, 09:00', urgent: false },
            { name: 'Budi Santoso', task: 'Edukasi Diet', time: 'Besok, 11:30', urgent: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
              <div className={cn("mt-1 w-2 h-2 rounded-full shrink-0", item.urgent ? "bg-red-500" : "bg-blue-500")} />
              <div>
                <p className="text-sm font-bold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.task}</p>
                <p className="text-[10px] font-medium text-blue-600 mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => onNavigate('appointments')}
          className="w-full mt-6 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          Lihat Semua Jadwal
        </button>
      </div>
    </div>
  </div>
);

const PatientMaster = ({ 
  patients, 
  onAdd, 
  onUpdate, 
  onDelete,
  onOpenRecord,
  onSave
}: { 
  patients: Patient[], 
  onAdd: (p: Omit<Patient, 'id' | 'mrNumber' | 'status'>) => void,
  onUpdate: (p: Patient) => void,
  onDelete: (id: string) => void,
  onOpenRecord: (id: string) => void,
  onSave: () => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    birthDate: '',
    gender: 'L' as 'L' | 'P',
    address: '',
    phone: '',
    insurance: 'Umum'
  });

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.nik.includes(searchTerm) ||
    p.mrNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        name: patient.name,
        nik: patient.nik,
        birthDate: patient.birthDate,
        gender: patient.gender,
        address: patient.address,
        phone: patient.phone,
        insurance: patient.insurance
      });
    } else {
      setEditingPatient(null);
      setFormData({
        name: '',
        nik: '',
        birthDate: '',
        gender: 'L',
        address: '',
        phone: '',
        insurance: 'Umum'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPatient) {
      onUpdate({ ...editingPatient, ...formData });
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
  };

  const handlePrint = (patient: Patient) => {
    // Mock print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Kartu Pasien - ${patient.name}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .card { border: 2px solid #3b82f6; border-radius: 15px; padding: 20px; width: 350px; background: #f8fafc; }
              .header { border-bottom: 2px solid #3b82f6; margin-bottom: 15px; padding-bottom: 10px; }
              .title { font-size: 20px; font-weight: bold; color: #1e40af; }
              .info { margin-bottom: 8px; font-size: 14px; }
              .label { font-weight: bold; color: #64748b; width: 100px; display: inline-block; }
              .mr-number { font-size: 24px; font-weight: 900; color: #3b82f6; text-align: center; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div class="title">DentaCare RME</div>
                <div style="font-size: 10px; color: #64748b;">KARTU IDENTITAS PASIEN</div>
              </div>
              <div class="info"><span class="label">Nama:</span> ${patient.name}</div>
              <div class="info"><span class="label">NIK:</span> ${patient.nik}</div>
              <div class="info"><span class="label">Tgl Lahir:</span> ${patient.birthDate} (${calculateAge(patient.birthDate)} Thn)</div>
              <div class="info"><span class="label">Alamat:</span> ${patient.address}</div>
              <div class="mr-number">${patient.mrNumber}</div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Data Master Pasien</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari NIK atau Nama..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            <span>Pasien Baru</span>
          </button>
          <button 
            onClick={onSave}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Save size={18} />
            <span>Simpan Data</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">No. RM</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Pasien</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usia</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asuransi</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-bold text-blue-600">{patient.mrNumber}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{patient.name}</span>
                    <span className="text-xs text-slate-500">{patient.nik}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{calculateAge(patient.birthDate)} Thn</td>
                <td className="px-6 py-4 text-sm text-slate-600">{patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    patient.insurance === 'BPJS' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {patient.insurance}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onOpenRecord(patient.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Buka Rekam Medis"
                    >
                      <ClipboardList size={16} />
                    </button>
                    <button 
                      onClick={() => handlePrint(patient)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Cetak Kartu"
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenModal(patient)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Ubah Data"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Hapus data pasien ${patient.name}?`)) {
                          onDelete(patient.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus Pasien"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Patient Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingPatient ? 'Ubah Data Pasien' : 'Tambah Pasien Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                    <input 
                      type="text" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">NIK</label>
                    <input 
                      type="text" required maxLength={16}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.nik}
                      onChange={e => setFormData({...formData, nik: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Lahir</label>
                    <input 
                      type="date" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.birthDate}
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Kelamin</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value as 'L' | 'P'})}
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">No. HP</label>
                    <input 
                      type="text" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Asuransi</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.insurance}
                      onChange={e => setFormData({...formData, insurance: e.target.value})}
                    >
                      <option value="Umum">Umum</option>
                      <option value="BPJS">BPJS</option>
                      <option value="Mandiri Inhealth">Mandiri Inhealth</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Alamat</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    <Printer size={18} />
                    Cetak
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                  >
                    <Save size={18} />
                    {editingPatient ? 'Simpan Perubahan' : 'Simpan Pasien'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Education = ({ onSave }: { onSave: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const EDUCATIONS = [
    { id: 1, title: 'Cara Menyikat Gigi yang Benar', category: 'dasar', description: 'Panduan langkah demi langkah menyikat gigi dengan teknik Bass.', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50', videoId: 'v5oQeXrkWMA' },
    { id: 2, title: 'Pentingnya Flossing', category: 'dasar', description: 'Mengapa menyikat gigi saja tidak cukup untuk menjaga kebersihan sela gigi.', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', videoId: 'CXTrhbS5GL0' },
    { id: 3, title: 'Kesehatan Gigi Anak', category: 'anak', description: 'Tips menjaga gigi susu agar tetap sehat dan mencegah karies sejak dini.', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', videoId: 'c9KtZ0Z8ZQE' },
    { id: 4, title: 'Makanan yang Merusak Gigi', category: 'nutrisi', description: 'Daftar makanan dan minuman yang perlu dihindari untuk mencegah lubang gigi.', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', videoId: 'k5Kz3xQzqF0' },
    { id: 5, title: 'Prosedur Scaling Gigi', category: 'perawatan', description: 'Apa itu scaling dan mengapa Anda membutuhkannya setiap 6 bulan.', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 6, title: 'Gigi Sensitif: Penyebab & Solusi', category: 'perawatan', description: 'Memahami dentin yang terbuka dan cara mengatasinya.', icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const filtered = activeCategory === 'all' ? EDUCATIONS : EDUCATIONS.filter(e => e.category === activeCategory);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Edukasi Kesehatan Gigi</h2>
          <p className="text-slate-500">Materi edukasi untuk pasien dan tenaga medis</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {['all', 'dasar', 'anak', 'perawatan', 'nutrisi'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  activeCategory === cat 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <Save size={16} />
            Simpan Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((edu, i) => (
          <motion.div
            key={edu.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => edu.videoId && setSelectedVideo(edu.videoId)}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", edu.bg, edu.color)}>
              <edu.icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{edu.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">{edu.description}</p>
            <div className="flex items-center text-blue-600 text-xs font-bold uppercase tracking-widest gap-2">
              {edu.videoId ? 'Tonton Video' : 'Baca Selengkapnya'}
              <ChevronRight size={14} />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Video Edukasi</h3>
                <button onClick={() => setSelectedVideo(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${selectedVideo}`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-6 flex justify-end">
                <button onClick={() => setSelectedVideo(null)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Tutup</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface Invoice {
  id: string;
  patient: string;
  date: string;
  amount: number;
  status: string;
  method: string;
}

const Billing = ({ onSave }: { onSave: () => void }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'INV-001', patient: 'Ahmad Subarjo', date: '2026-04-05', amount: 450000, status: 'paid', method: 'Transfer Bank' },
    { id: 'INV-002', patient: 'Siti Aminah', date: '2026-04-06', amount: 1250000, status: 'unpaid', method: '-' },
    { id: 'INV-003', patient: 'Budi Santoso', date: '2026-04-06', amount: 350000, status: 'paid', method: 'Tunai' },
    { id: 'INV-004', patient: 'Dewi Lestari', date: '2026-04-07', amount: 2100000, status: 'pending', method: 'BPJS' },
  ]);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.patient.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (inv: Invoice) => {
    setPrintingInvoice(inv);
    setTimeout(() => {
      window.print();
      setPrintingInvoice(null);
    }, 500);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv));
    setEditingInvoice(null);
  };

  if (printingInvoice) {
    return (
      <div className="print-container bg-white p-12 max-w-2xl mx-auto border shadow-sm print:shadow-none print:border-none">
        <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Activity size={18} />
              </div>
              <h1 className="text-xl font-black text-slate-900">DentaCare</h1>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital RME & Billing System</p>
            <p className="text-[10px] text-slate-500 mt-1">Jl. Kesehatan No. 123, Jakarta Selatan</p>
            <p className="text-[10px] text-slate-500">Telp: (021) 1234-5678</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Kwitansi</h2>
            <p className="text-xs font-bold text-blue-600 mt-1">No: {printingInvoice.id}</p>
            <p className="text-[10px] text-slate-400 mt-1">{printingInvoice.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-10">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Pasien / Penerima:</p>
            <p className="text-lg font-bold text-slate-900">{printingInvoice.patient}</p>
            <p className="text-xs text-slate-500 mt-1 italic">ID Pasien: RM-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1 text-right">Detail Pembayaran:</p>
            <p className="text-sm font-bold text-slate-900">Metode: {printingInvoice.method}</p>
            <p className="text-xs text-slate-500 mt-1">Status: <span className="text-emerald-600 font-bold uppercase">{printingInvoice.status}</span></p>
          </div>
        </div>

        <div className="mb-12">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Layanan</th>
                <th className="py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-5">
                  <p className="text-sm font-bold text-slate-900">Biaya Tindakan Medis & Konsultasi</p>
                  <p className="text-[10px] text-slate-500 mt-1">Pemeriksaan rutin, pembersihan karang gigi, dan konsultasi dokter.</p>
                </td>
                <td className="py-5 text-right text-sm font-bold text-slate-900 align-top">Rp {printingInvoice.amount.toLocaleString()}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="py-8 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Total Bayar</td>
                <td className="py-8 text-right text-3xl font-black text-blue-600">Rp {printingInvoice.amount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-12 items-end">
          <div className="text-[9px] text-slate-400 leading-relaxed italic border-l-2 border-blue-100 pl-4">
            <p className="font-bold text-slate-500 mb-1 not-italic">Catatan:</p>
            <p>1. Kwitansi ini adalah bukti pembayaran yang sah.</p>
            <p>2. Pembayaran yang sudah dilakukan tidak dapat ditarik kembali.</p>
            <p>3. Terima kasih telah mempercayakan kesehatan gigi Anda kepada DentaCare.</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-16">Kasir / Administrasi</p>
            <div className="w-48 h-px bg-slate-900 mx-auto mb-2"></div>
            <p className="text-xs font-bold text-slate-900">DentaCare Digital System</p>
            <p className="text-[9px] text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center gap-4 print:hidden">
          <button 
            onClick={() => setPrintingInvoice(null)}
            className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <ChevronRight size={18} className="rotate-180" />
            Kembali
          </button>
          <button 
            onClick={() => window.print()}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Printer size={18} />
            Cetak Ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Keuangan</h2>
          <p className="text-slate-500">Kelola invoice dan pembayaran pasien</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <Save size={16} />
            Simpan Data
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Plus size={20} />
            Buat Invoice Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Pendapatan (Bulan Ini)</p>
          <p className="text-3xl font-black text-slate-900">Rp 42.500.000</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <Activity size={14} />
            +15.4% dari bulan lalu
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Belum Terbayar</p>
          <p className="text-3xl font-black text-red-600">12</p>
          <p className="mt-4 text-slate-400 text-xs font-medium">Total: Rp 8.450.000</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Metode Terpopuler</p>
          <p className="text-3xl font-black text-blue-600">QRIS</p>
          <p className="mt-4 text-slate-400 text-xs font-medium">65% dari total transaksi</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Riwayat Transaksi Terakhir</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Cari invoice..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Invoice</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasien</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-blue-600">{inv.id}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{inv.patient}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{inv.method}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td>
                <td className="px-6 py-4 text-sm font-black text-slate-900">Rp {inv.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    inv.status === 'paid' ? "bg-emerald-100 text-emerald-600" :
                    inv.status === 'unpaid' ? "bg-red-100 text-red-600" :
                    "bg-amber-100 text-amber-600"
                  )}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePrint(inv)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      onClick={() => setEditingInvoice(inv)}
                      className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingInvoice(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Ubah Invoice {editingInvoice.id}</h3>
                <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Status Pembayaran</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={editingInvoice.status}
                    onChange={e => setEditingInvoice({...editingInvoice, status: e.target.value})}
                  >
                    <option value="paid">Paid (Lunas)</option>
                    <option value="unpaid">Unpaid (Belum Bayar)</option>
                    <option value="pending">Pending (Menunggu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Metode Pembayaran</label>
                  <input 
                    type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={editingInvoice.method}
                    onChange={e => setEditingInvoice({...editingInvoice, method: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Jumlah (Rp)</label>
                  <input 
                    type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={editingInvoice.amount}
                    onChange={e => setEditingInvoice({...editingInvoice, amount: parseInt(e.target.value)})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Simpan Perubahan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MedicalRecord = ({ 
  patients, 
  selectedPatientId, 
  onSelectPatient,
  onAddAppointment,
  onSave
}: { 
  patients: Patient[], 
  selectedPatientId: string | null,
  onSelectPatient: (id: string) => void,
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void,
  onSave: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'anamnesis' | 'clinical' | 'odontogram' | 'diagnosis' | 'soapie' | 'treatment' | 'consent' | 'resume' | 'riwayat'>('anamnesis');
  const [toothData, setToothData] = useState<Record<number, ToothSurfaceData>>({});
  const [toothNotes, setToothNotes] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPreviousVisitModalOpen, setIsPreviousVisitModalOpen] = useState(false);
  
  // Mock History Data
  const [history] = useState([
    { date: '2026-03-15', diagnosis: 'Karies Dentin (K02.1)', treatment: 'Penambalan Komposit', doctor: 'Drg. Rizky' },
    { date: '2026-01-10', diagnosis: 'Gingivitis (K05.1)', treatment: 'Scaling & Root Planing', doctor: 'Drg. Rizky' },
  ]);

  const [appointmentForm, setAppointmentForm] = useState({
    date: '',
    time: '',
    type: 'Pemeriksaan Rutin'
  });

  const handleAddNextVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    onAddAppointment({
      patient: selectedPatient.name,
      date: appointmentForm.date,
      time: appointmentForm.time,
      type: appointmentForm.type
    });
    setIsAppointmentModalOpen(false);
    alert('Kunjungan selanjutnya berhasil dijadwalkan!');
  };
  
  // Anamnesis State
  const [anamnesis, setAnamnesis] = useState({
    keluhanUtama: '',
    riwayatSekarang: '',
    riwayatDahulu: '',
    riwayatAlergi: '',
    vitalSigns: {
      tensi: '',
      suhu: '',
      tb: '',
      bb: '',
      hr: '',
      rr: ''
    }
  });

  // Clinical Exam State
  const [clinical, setClinical] = useState({
    ekstraOral: { limfe: 'Normal', tmj: 'Normal', wajah: 'Simetris' },
    intraOral: { gingiva: '', mukosa: '', lidah: '', palatum: '' }
  });

  // Indices State
  const [indices, setIndices] = useState({
    di: [0, 0, 0, 0, 0, 0], // 6 index teeth
    ci: [0, 0, 0, 0, 0, 0]
  });

  // Diagnosis State
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  
  // SOAPIE State
  const [soapie, setSoapie] = useState({ s: '', o: '', a: '', p: '', i: '', e: '' });

  // Treatment State
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  // Signature Refs
  const sigDentist = useRef<SignatureCanvas>(null);
  const sigTherapist = useRef<SignatureCanvas>(null);
  const sigPatient = useRef<SignatureCanvas>(null);
  const sigGuardian = useRef<SignatureCanvas>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleSurfaceClick = (id: number, surface: keyof ToothSurfaceData) => {
    const statuses: SurfaceStatus[] = ['healthy', 'caries', 'filled', 'missing', 'impacted'];
    const currentTooth = toothData[id] || {
      top: 'healthy',
      bottom: 'healthy',
      left: 'healthy',
      right: 'healthy',
      center: 'healthy'
    };
    const currentStatus = currentTooth[surface];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    
    setToothData(prev => ({
      ...prev,
      [id]: {
        ...currentTooth,
        [surface]: nextStatus
      }
    }));
  };

  const calculateOHIS = () => {
    const avgDI = indices.di.reduce((a, b) => a + b, 0) / 6;
    const avgCI = indices.ci.reduce((a, b) => a + b, 0) / 6;
    return (avgDI + avgCI).toFixed(2);
  };

  const handleAIAnalysis = async () => {
    if (!anamnesis.keluhanUtama) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Sebagai asisten Dokter Gigi AI profesional, berikan analisis mendalam berdasarkan data pasien berikut:
        
        DATA PASIEN:
        Nama: ${selectedPatient?.name}
        Umur: ${calculateAge(selectedPatient?.birthDate || '')} tahun
        Jenis Kelamin: ${selectedPatient?.gender}
        
        ANAMNESIS:
        Keluhan Utama: ${anamnesis.keluhanUtama}
        Riwayat Penyakit Sekarang: ${anamnesis.riwayatSekarang}
        Riwayat Penyakit Dahulu: ${anamnesis.riwayatDahulu}
        Riwayat Alergi: ${anamnesis.riwayatAlergi}
        
        TANDA VITAL:
        Tensi: ${anamnesis.vitalSigns.tensi} mmHg
        Suhu: ${anamnesis.vitalSigns.suhu} °C
        HR: ${anamnesis.vitalSigns.hr} bpm
        RR: ${anamnesis.vitalSigns.rr} x/mnt
        
        PEMERIKSAAN KLINIS:
        Ekstra Oral: Limfe ${clinical.ekstraOral.limfe}, TMJ ${clinical.ekstraOral.tmj}, Wajah ${clinical.ekstraOral.wajah}
        Intra Oral: Gingiva ${clinical.intraOral.gingiva}, Mukosa ${clinical.intraOral.mukosa}, Lidah ${clinical.intraOral.lidah}, Palatum ${clinical.intraOral.palatum}
        
        Berikan output dalam format Markdown yang rapi dengan bagian-bagian berikut:
        1. **Analisis Keluhan & Diagnosis**: (Analisis keluhan utama dan kemungkinan diagnosis klinis)
        2. **Anjuran Tindakan & Pengobatan**: (Rencana tindakan medis di klinik dan obat-obatan jika diperlukan)
        3. **Cara Mencegah**: (Edukasi pasien untuk mencegah masalah serupa di masa depan)
        4. **Cara Mengobati (Instruksi Mandiri)**: (Instruksi perawatan mandiri di rumah untuk pasien)
        
        Gunakan bahasa Indonesia yang profesional namun mudah dimengerti pasien.`
      });
      setAiAnalysis(response.text || '');
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("Gagal melakukan analisis AI. Silakan pastikan koneksi internet stabil dan kunci API tersedia.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAIRecommendations = () => {
    if (!aiAnalysis) return;
    
    // Simple parsing of AI analysis to fill SOAPIE or Treatment
    // For now, we'll just append the analysis to the 'A' (Assessment) and 'P' (Planning) sections of SOAPIE
    setSoapie(prev => ({
      ...prev,
      a: prev.a + (prev.a ? '\n\n' : '') + '--- AI Assessment ---\n' + aiAnalysis.split('2.')[0].replace('1. **Analisis Keluhan & Diagnosis**:', '').trim(),
      p: prev.p + (prev.p ? '\n\n' : '') + '--- AI Planning ---\n' + (aiAnalysis.split('2.')[1] || '').split('3.')[0].replace('**Anjuran Tindakan & Pengobatan**:', '').trim()
    }));
    
    alert('Rekomendasi AI telah diterapkan ke bagian SOAPIE (Assessment & Planning).');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!selectedPatient) return;
    const text = `Resume Pemeriksaan Dental - ${selectedPatient.name}
    No RM: ${selectedPatient.mrNumber}
    Keluhan: ${anamnesis.keluhanUtama}
    OHI-S: ${calculateOHIS()}
    Tindakan: ${selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ')}
    Total Biaya: Rp ${selectedTreatments.reduce((sum, id) => sum + (TREATMENTS_2023.find(t => t.id === id)?.price || 0), 0).toLocaleString('id-ID')}`;
    
    const url = `https://wa.me/${selectedPatient.phone.replace(/^0/, '62')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!selectedPatient) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Pilih Pasien</h2>
          <p className="text-slate-500">Cari dan pilih pasien untuk membuka rekam medis dental</p>
        </div>

        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari Nama atau No. RM..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.mrNumber.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(patient => (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{patient.name}</h4>
                  <p className="text-xs text-slate-500">{patient.mrNumber} • {calculateAge(patient.birthDate)} Thn • {patient.gender}</p>
                </div>
                <ChevronRight className="ml-auto text-slate-300 group-hover:text-blue-600 transition-colors" size={20} />
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between print:border-none print:shadow-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
            {selectedPatient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{selectedPatient.name}</h2>
            <p className="text-sm text-slate-500">{selectedPatient.mrNumber} • {calculateAge(selectedPatient.birthDate)} Tahun • {selectedPatient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button 
            onClick={() => onSelectPatient('')}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="rotate-180" size={16} />
            Kembali
          </button>
          <button 
            onClick={() => setIsPreviousVisitModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <History size={16} />
            Kunjungan Sebelumnya
          </button>
          <button 
            onClick={() => setIsAppointmentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Calendar size={16} />
            Kunjungan Selanjutnya
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold transition-colors",
              activeTab === 'riwayat' ? "bg-blue-50 border-blue-600 text-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <History size={16} />
            Riwayat
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            <Printer size={16} />
            Cetak RME
          </button>
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Save size={16} />
            Simpan Data
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide print:hidden">
        {[
          { id: 'anamnesis', label: 'Anamnesis', icon: ClipboardList },
          { id: 'clinical', label: 'Pemeriksaan', icon: Stethoscope },
          { id: 'odontogram', label: 'Odontogram', icon: FileDigit },
          { id: 'diagnosis', label: 'Diagnosis', icon: AlertCircle },
          { id: 'soapie', label: 'SOAPIE', icon: BookOpen },
          { id: 'treatment', label: 'Tindakan', icon: CheckCircle2 },
          { id: 'consent', label: 'Informed Consent', icon: ShieldCheck },
          { id: 'resume', label: 'Resume', icon: FileText },
          { id: 'riwayat', label: 'Riwayat', icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shrink-0",
              activeTab === tab.id 
                ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] print:border-none print:shadow-none print:p-0">
        {activeTab === 'anamnesis' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Anamnesis</h3>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Keluhan Utama</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                    value={anamnesis.keluhanUtama}
                    onChange={e => setAnamnesis({...anamnesis, keluhanUtama: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Riwayat Penyakit Sekarang</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                    value={anamnesis.riwayatSekarang}
                    onChange={e => setAnamnesis({...anamnesis, riwayatSekarang: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Riwayat Penyakit Dahulu</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.riwayatDahulu}
                      onChange={e => setAnamnesis({...anamnesis, riwayatDahulu: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Riwayat Alergi</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.riwayatAlergi}
                      onChange={e => setAnamnesis({...anamnesis, riwayatAlergi: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Tanda-tanda Vital</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tensi Darah (mmHg)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.tensi}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, tensi: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Suhu (°C)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.suhu}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, suhu: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tinggi Badan (cm)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.tb}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, tb: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Berat Badan (kg)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.bb}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, bb: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Heart Rate (bpm)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.hr}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, hr: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Respiration Rate (x/mnt)</label>
                    <input 
                      type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.rr}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, rr: e.target.value}})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan anamnesis?')) { setAnamnesis({ keluhanUtama: '', riwayatSekarang: '', riwayatDahulu: '', riwayatAlergi: '', vitalSigns: { tensi: '', suhu: '', tb: '', bb: '', hr: '', rr: '' } }); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Anamnesis
              </button>
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Pemeriksaan Ekstra Oral</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kelenjar Limfe</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      value={clinical.ekstraOral.limfe}
                      onChange={e => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, limfe: e.target.value}})}
                    >
                      <option>Normal (Tidak Teraba)</option>
                      <option>Teraba, Lunak</option>
                      <option>Teraba, Keras/Sakit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">TMJ</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      value={clinical.ekstraOral.tmj}
                      onChange={e => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, tmj: e.target.value}})}
                    >
                      <option>Normal</option>
                      <option>Clicking</option>
                      <option>Crepitasi</option>
                      <option>Trismus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Wajah</label>
                    <select 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      value={clinical.ekstraOral.wajah}
                      onChange={e => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, wajah: e.target.value}})}
                    >
                      <option>Simetris</option>
                      <option>Asimetris</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Pemeriksaan Intra Oral</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Gingiva</label>
                    <input 
                      type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Warna, Bentuk, Konsistensi" 
                      value={clinical.intraOral.gingiva}
                      onChange={e => setClinical({...clinical, intraOral: {...clinical.intraOral, gingiva: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Mukosa</label>
                    <input 
                      type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Normal / Kelainan" 
                      value={clinical.intraOral.mukosa}
                      onChange={e => setClinical({...clinical, intraOral: {...clinical.intraOral, mukosa: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Lidah</label>
                    <input 
                      type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Normal / Kelainan" 
                      value={clinical.intraOral.lidah}
                      onChange={e => setClinical({...clinical, intraOral: {...clinical.intraOral, lidah: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Palatum</label>
                    <input 
                      type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Normal / Kelainan" 
                      value={clinical.intraOral.palatum}
                      onChange={e => setClinical({...clinical, intraOral: {...clinical.intraOral, palatum: e.target.value}})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan pemeriksaan klinis?')) { setClinical({ ekstraOral: { limfe: 'Normal', tmj: 'Normal', wajah: 'Simetris' }, intraOral: { gingiva: '', mukosa: '', lidah: '', palatum: '' } }); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Pemeriksaan
              </button>
            </div>
          </div>
        )}

        {activeTab === 'odontogram' && (
          <div className="space-y-8">
            <div className="flex flex-wrap justify-center gap-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              {[
                { status: 'healthy', label: 'Sehat', color: 'bg-white border-slate-400' },
                { status: 'caries', label: 'Karies', color: 'bg-red-500' },
                { status: 'filled', label: 'Tambalan', color: 'bg-blue-500' },
                { status: 'missing', label: 'Hilang', color: 'bg-slate-200' },
                { status: 'impacted', label: 'Impaksi', color: 'bg-amber-500' },
              ].map(item => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 rounded border", item.color)} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl overflow-x-auto">
              <div className="min-w-[800px] flex flex-col items-center gap-12">
                {/* Upper Adult */}
                <div className="flex flex-col items-center gap-4">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Atas (Dewasa)</span>
                  <div className="flex gap-2">
                    {ADULT_TEETH_TOP.map(id => (
                      <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                    ))}
                  </div>
                </div>

                {/* Upper Child */}
                <div className="flex flex-col items-center gap-4">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Atas (Anak)</span>
                  <div className="flex gap-2">
                    {CHILD_TEETH_TOP.map(id => (
                      <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100 relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Garis Median</div>
                </div>

                {/* Lower Child */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {CHILD_TEETH_BOTTOM.map(id => (
                      <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Bawah (Anak)</span>
                </div>

                {/* Lower Adult */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {ADULT_TEETH_BOTTOM.map(id => (
                      <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Bawah (Dewasa)</span>
                </div>
              </div>
            </div>

            {/* Tooth Findings Table (from PDF) */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Temuan Jaringan Keras (Kiri)</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[...ADULT_TEETH_TOP.slice(0, 8), ...ADULT_TEETH_BOTTOM.slice(8)].map(id => (
                    <div key={id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <span className="w-8 text-xs font-black text-blue-600">{id}</span>
                      <input 
                        type="text" placeholder="Temuan..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                        value={toothNotes[id] || ''}
                        onChange={e => setToothNotes(prev => ({ ...prev, [id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Temuan Jaringan Keras (Kanan)</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[...ADULT_TEETH_TOP.slice(8), ...ADULT_TEETH_BOTTOM.slice(0, 8)].map(id => (
                    <div key={id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <span className="w-8 text-xs font-black text-blue-600">{id}</span>
                      <input 
                        type="text" placeholder="Temuan..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                        value={toothNotes[id] || ''}
                        onChange={e => setToothNotes(prev => ({ ...prev, [id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity size={18} />
                Indeks Kesehatan Gigi (OHI-S)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500">Debris Index (DI)</p>
                  <div className="grid grid-cols-6 gap-2">
                    {indices.di.map((val, i) => (
                      <input 
                        key={i} type="number" min="0" max="3"
                        className="w-full p-2 text-center bg-white border border-slate-200 rounded-lg text-sm"
                        value={val}
                        onChange={e => {
                          const newDi = [...indices.di];
                          newDi[i] = parseInt(e.target.value) || 0;
                          setIndices({...indices, di: newDi});
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500">Calculus Index (CI)</p>
                  <div className="grid grid-cols-6 gap-2">
                    {indices.ci.map((val, i) => (
                      <input 
                        key={i} type="number" min="0" max="3"
                        className="w-full p-2 text-center bg-white border border-slate-200 rounded-lg text-sm"
                        value={val}
                        onChange={e => {
                          const newCi = [...indices.ci];
                          newCi[i] = parseInt(e.target.value) || 0;
                          setIndices({...indices, ci: newCi});
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-600 rounded-xl text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase opacity-80">Skor OHI-S Akhir</p>
                  <p className="text-2xl font-black">{calculateOHIS()}</p>
                </div>
                <div className="text-right text-[10px] font-medium opacity-80">
                  Rumus: (Total DI / 6) + (Total CI / 6)
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan odontogram?')) { setToothData({}); setToothNotes({}); setIndices({ di: [0, 0, 0, 0, 0, 0], ci: [0, 0, 0, 0, 0, 0] }); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Odontogram
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Diagnosa Terapis Gigi & Mulut (8 Kebutuhan Manusia)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HUMAN_NEEDS.map((need, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (selectedNeeds.includes(need)) {
                        setSelectedNeeds(selectedNeeds.filter(n => n !== need));
                      } else {
                        setSelectedNeeds([...selectedNeeds, need]);
                      }
                    }}
                    className={cn(
                      "p-4 text-left text-sm rounded-xl border transition-all",
                      selectedNeeds.includes(need)
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                        : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                    )}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-purple-900">Analisis Diagnosa AI</h4>
                    <p className="text-[10px] text-purple-500 font-medium">Berdasarkan Anamnesis & Pemeriksaan Klinis</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {aiAnalysis && (
                    <button 
                      onClick={applyAIRecommendations}
                      className="px-4 py-2 bg-white border border-purple-200 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all"
                    >
                      Terapkan ke SOAPIE
                    </button>
                  )}
                  <button 
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menganalisis...
                      </>
                    ) : (
                      <>
                        <Activity size={14} />
                        Mulai Analisis AI
                      </>
                    )}
                  </button>
                </div>
              </div>
              {aiAnalysis && (
                <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
                  <div className="prose prose-sm max-w-none prose-slate prose-headings:text-purple-900 prose-strong:text-purple-800">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan diagnosa?')) { setSelectedNeeds([]); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Diagnosa
              </button>
            </div>
          </div>
        )}

        {activeTab === 'soapie' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Catatan Perkembangan (SOAPIE)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 's', label: 'S (Subjektif)', placeholder: 'Keluhan pasien...' },
                { id: 'o', label: 'O (Objektif)', placeholder: 'Hasil pemeriksaan fisik/klinis...' },
                { id: 'a', label: 'A (Assessment)', placeholder: 'Kesimpulan diagnosa...' },
                { id: 'p', label: 'P (Planning)', placeholder: 'Rencana tindakan...' },
                { id: 'i', label: 'I (Intervensi)', placeholder: 'Tindakan yang dilakukan...' },
                { id: 'e', label: 'E (Evaluasi)', placeholder: 'Hasil setelah tindakan...' },
              ].map(item => (
                <div key={item.id}>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{item.label}</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                    placeholder={item.placeholder}
                    value={(soapie as any)[item.id]}
                    onChange={e => setSoapie({...soapie, [item.id]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan SOAPIE?')) { setSoapie({ s: '', o: '', a: '', p: '', i: '', e: '' }); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data SOAPIE
              </button>
            </div>
          </div>
        )}

        {activeTab === 'treatment' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tindakan & Biaya (Perda No. 10/2023)</h3>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Total Estimasi</p>
                <p className="text-2xl font-black text-blue-600">
                  Rp {selectedTreatments.reduce((sum, id) => sum + (TREATMENTS_2023.find(t => t.id === id)?.price || 0), 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TREATMENTS_2023.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (selectedTreatments.includes(t.id)) {
                      setSelectedTreatments(selectedTreatments.filter(id => id !== t.id));
                    } else {
                      setSelectedTreatments([...selectedTreatments, t.id]);
                    }
                  }}
                  className={cn(
                    "p-4 text-left rounded-xl border transition-all flex justify-between items-center group",
                    selectedTreatments.includes(t.id)
                      ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600"
                      : "bg-white border-slate-100 hover:border-blue-200"
                  )}
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.category}</p>
                    <p className="font-bold text-slate-800">{t.name}</p>
                  </div>
                  <p className="font-black text-blue-600">Rp {t.price.toLocaleString('id-ID')}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan tindakan?')) { setSelectedTreatments([]); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Tindakan
              </button>
            </div>
          </div>
        )}

        {activeTab === 'consent' && (
          <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 text-center">Persetujuan Tindakan Medik (Informed Consent)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Saya yang bertanda tangan di bawah ini menyatakan setuju untuk dilakukan tindakan medik dental sesuai dengan penjelasan yang telah diberikan oleh tenaga medis. Saya memahami risiko dan manfaat dari tindakan tersebut.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { ref: sigDentist, label: 'Dokter Gigi' },
                { ref: sigTherapist, label: 'Terapis Gigi' },
                { ref: sigPatient, label: 'Pasien' },
                { ref: sigGuardian, label: 'Wali/Orang Tua' },
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 text-center uppercase">{item.label}</p>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-32">
                    <SignatureCanvas 
                      ref={item.ref}
                      penColor="navy"
                      canvasProps={{ className: "w-full h-full" }}
                    />
                  </div>
                  <button 
                    onClick={() => item.ref.current?.clear()}
                    className="w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    Hapus Tanda Tangan
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan Informed Consent?')) { sigDentist.current?.clear(); sigTherapist.current?.clear(); sigPatient.current?.clear(); sigGuardian.current?.clear(); } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Informed Consent
              </button>
            </div>
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="space-y-8">
            <div className="p-8 border-2 border-slate-100 rounded-3xl space-y-8 bg-white shadow-sm">
              <div className="text-center border-b-2 border-slate-900 pb-6">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Resume Rekam Medis Dental</h2>
                <p className="text-sm font-bold text-blue-600">DentaCare Digital RME System</p>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Nama Pasien:</span><br/><span className="font-bold">{selectedPatient.name}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">No. RM:</span><br/><span className="font-bold">{selectedPatient.mrNumber}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Tanggal:</span><br/><span className="font-bold">{new Date().toLocaleDateString('id-ID')}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">OHI-S:</span><br/><span className="font-bold">{calculateOHIS()}</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase text-xs">Ringkasan Pemeriksaan</h4>
                <div className="grid grid-cols-1 gap-4 text-sm bg-slate-50 p-4 rounded-2xl">
                  <p><span className="font-bold">Keluhan:</span> {anamnesis.keluhanUtama || '-'}</p>
                  <p><span className="font-bold">Diagnosa:</span> {selectedNeeds.join(', ') || '-'}</p>
                  <p><span className="font-bold">Tindakan:</span> {selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') || '-'}</p>
                </div>
              </div>

              <div className="flex justify-between items-end pt-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-12">Petugas Pemeriksa</p>
                  <p className="font-bold text-slate-900 border-t border-slate-900 pt-1">Drg. Rizky Ramadhan</p>
                </div>
                <div className="text-right space-y-2">
                  <button 
                    onClick={handleWhatsApp}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Kirim WhatsApp
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan resume?')) { /* logic */ } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Resume
              </button>
            </div>
          </div>
        )}

        {activeTab === 'riwayat' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Riwayat Kunjungan Pasien</h3>
              <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Kunjungan: {history.length}</div>
                <button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  <Plus size={14} />
                  Tambah Kunjungan
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {history.map((item, i) => (
                <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-200 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600" />
                      <span className="text-sm font-black text-slate-900">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Diagnosa:</span> {item.diagnosis}</p>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Tindakan:</span> {item.treatment}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Dokter Pemeriksa</p>
                      <p className="text-sm font-bold text-slate-700">{item.doctor}</p>
                    </div>
                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { if(confirm('Batalkan perubahan riwayat?')) { /* logic */ } }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Printer size={18} />
                Cetak
              </button>
              <button 
                onClick={onSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Save size={18} />
                Simpan Data Riwayat
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPreviousVisitModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <History size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Detail Kunjungan Sebelumnya</h3>
                </div>
                <button onClick={() => setIsPreviousVisitModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {history.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tanggal Kunjungan</p>
                        <p className="font-bold text-slate-900">{new Date(history[0].date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dokter Pemeriksa</p>
                        <p className="font-bold text-slate-900">{history[0].doctor}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnosa Terakhir</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{history[0].diagnosis}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tindakan Dilakukan</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{history[0].treatment}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500">Belum ada data kunjungan sebelumnya.</p>
                  </div>
                )}
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsPreviousVisitModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Tutup</button>
                  <button 
                    onClick={() => {
                      setIsPreviousVisitModalOpen(false);
                      setActiveTab('riwayat');
                    }} 
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    Lihat Semua Riwayat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAppointmentModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Jadwalkan Kunjungan Berikutnya</h3>
                <button onClick={() => setIsAppointmentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddNextVisit} className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Pasien Terpilih</p>
                  <p className="font-black text-slate-900">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">{selectedPatient.mrNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Tanggal</label>
                    <input 
                      type="date" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={appointmentForm.date}
                      onChange={e => setAppointmentForm({...appointmentForm, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Jam</label>
                    <input 
                      type="time" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={appointmentForm.time}
                      onChange={e => setAppointmentForm({...appointmentForm, time: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Jenis Tindakan</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={appointmentForm.type}
                    onChange={e => setAppointmentForm({...appointmentForm, type: e.target.value})}
                  >
                    <option>Pemeriksaan Rutin</option>
                    <option>Scaling Gigi</option>
                    <option>Penambalan</option>
                    <option>Pencabutan</option>
                    <option>Konsultasi</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAppointmentModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Jadwalkan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
const Appointments = ({ 
  patients, 
  appointments, 
  onAddAppointment,
  onSave
}: { 
  patients: Patient[], 
  appointments: Appointment[],
  onAddAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => void,
  onSave: () => void
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    type: 'Pemeriksaan Rutin'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) return;

    onAddAppointment({
      patient: patient.name,
      date: formData.date,
      time: formData.time,
      type: formData.type
    });

    setIsModalOpen(false);
    setFormData({ patientId: '', date: '', time: '', type: 'Pemeriksaan Rutin' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Jadwal & Janji Temu</h2>
          <p className="text-slate-500">Kelola antrian dan jadwal kunjungan pasien</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <Save size={16} />
            Simpan Data
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            Tambah Jadwal Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <Calendar className="text-blue-600 mb-4" size={32} />
            <h3 className="font-bold text-slate-900 mb-2">Kalender Cepat</h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>)}
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className={cn(
                  "aspect-square flex items-center justify-center text-xs rounded-lg cursor-pointer hover:bg-blue-50",
                  i + 1 === 10 ? "bg-blue-600 text-white font-bold" : "text-slate-600"
                )}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Daftar Janji Temu</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" placeholder="Cari pasien..."
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {appointments
                .filter(a => a.patient.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(apt => (
                <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex flex-col items-center justify-center text-blue-600">
                      <span className="text-[10px] font-bold uppercase">{new Date(apt.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                      <span className="text-lg font-black leading-none">{new Date(apt.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{apt.patient}</p>
                      <p className="text-xs text-slate-500">{apt.type} • {apt.time} WIB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      apt.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {apt.status}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Tambah Jadwal Baru</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Pilih Pasien</label>
                  <select 
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={formData.patientId}
                    onChange={e => setFormData({...formData, patientId: e.target.value})}
                  >
                    <option value="">-- Pilih Pasien --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.mrNumber})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Tanggal</label>
                    <input 
                      type="date" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Jam</label>
                    <input 
                      type="time" required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Jenis Tindakan</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Pemeriksaan Rutin</option>
                    <option>Scaling Gigi</option>
                    <option>Penambalan</option>
                    <option>Pencabutan</option>
                    <option>Konsultasi</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">Simpan Jadwal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DiagnosisReference = ({ onSave }: { onSave: () => void }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Pedoman Diagnosa Asuhan Kesehatan Gigi</h2>
      <button 
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
      >
        <Save size={16} />
        Simpan Data
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {DIAGNOSIS_NEEDS.map((need, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
        >
          <h3 className="text-lg font-bold text-blue-600 mb-4">{need.title}</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Disebabkan Oleh:</h4>
              <ul className="space-y-1">
                {need.causes.map((cause, j) => (
                  <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tanda & Gejala:</h4>
              <ul className="space-y-1">
                {need.signs.map((sign, j) => (
                  <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {sign}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = (message: string) => {
    // Simulate saving
    showToast(message);
  };
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 1, patient: 'Ahmad Subarjo', date: '2026-04-10', time: '09:00', type: 'Pemeriksaan Rutin', status: 'confirmed' },
    { id: 2, patient: 'Siti Aminah', date: '2026-04-10', time: '10:30', type: 'Scaling Gigi', status: 'pending' },
    { id: 3, patient: 'Budi Santoso', date: '2026-04-11', time: '14:00', type: 'Penambalan', status: 'confirmed' },
  ]);

  const handleBack = () => {
    if (currentPage === 'records' && selectedPatientId) {
      setSelectedPatientId(null);
      setCurrentPage('patients');
    } else {
      setCurrentPage('dashboard');
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, selectedPatientId]);

  const handleAddAppointment = (apt: Omit<Appointment, 'id' | 'status'>) => {
    const newApt: Appointment = {
      ...apt,
      id: appointments.length + 1,
      status: 'confirmed'
    };
    setAppointments([...appointments, newApt]);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
  };

  const handleAddPatient = (data: Omit<Patient, 'id' | 'mrNumber' | 'status'>) => {
    const lastMR = patients.length > 0 ? patients[patients.length - 1].mrNumber : 'RM-000';
    const newPatient: Patient = {
      ...data,
      id: (patients.length + 1).toString(),
      mrNumber: generateMRNumber(lastMR),
      status: 'active'
    };
    setPatients([...patients, newPatient]);
  };

  const handleUpdatePatient = (updated: Patient) => {
    setPatients(patients.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeletePatient = (id: string) => {
    setPatients(patients.filter(p => p.id !== id));
  };

  if (!isLoggedIn) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'patients': return (
        <PatientMaster 
          patients={patients} 
          onAdd={handleAddPatient}
          onUpdate={handleUpdatePatient}
          onDelete={handleDeletePatient}
          onSave={() => handleSave('Data Pasien berhasil disimpan!')}
          onOpenRecord={(id) => {
            setSelectedPatientId(id);
            setCurrentPage('records');
          }}
        />
      );
      case 'records': return (
        <MedicalRecord 
          patients={patients} 
          selectedPatientId={selectedPatientId}
          onSelectPatient={setSelectedPatientId}
          onAddAppointment={handleAddAppointment}
          onSave={() => handleSave('Rekam Medis berhasil disimpan!')}
        />
      );
      case 'appointments': return (
        <Appointments 
          patients={patients} 
          appointments={appointments}
          onAddAppointment={handleAddAppointment}
          onSave={() => handleSave('Jadwal berhasil disimpan!')}
        />
      );
      case 'diagnosis-ref': return <DiagnosisReference onSave={() => handleSave('Pedoman Diagnosa berhasil disimpan!')} />;
      case 'billing': return <Billing onSave={() => handleSave('Data Billing berhasil disimpan!')} />;
      case 'education': return <Education onSave={() => handleSave('Data Edukasi berhasil disimpan!')} />;
      case 'reports': return <Reports onSave={() => handleSave('Laporan berhasil diperbarui!')} />;
      case 'security': return <Security onSave={() => handleSave('Pengaturan Keamanan berhasil disimpan!')} />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-72" : "w-20"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Activity size={24} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tight text-slate-900">DentaCare</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Digital RME</span>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
            <SidebarItem icon={Users} label="Data Pasien" active={currentPage === 'patients'} onClick={() => setCurrentPage('patients')} />
            <SidebarItem icon={ClipboardList} label="Rekam Medis" active={currentPage === 'records'} onClick={() => setCurrentPage('records')} />
            <SidebarItem icon={Calendar} label="Jadwal & Janji" active={currentPage === 'appointments'} onClick={() => setCurrentPage('appointments')} />
            <SidebarItem icon={CreditCard} label="Billing & Kasir" active={currentPage === 'billing'} onClick={() => setCurrentPage('billing')} />
            <SidebarItem icon={GraduationCap} label="Edukasi Gigi" active={currentPage === 'education'} onClick={() => setCurrentPage('education')} />
            <SidebarItem icon={BookOpen} label="Pedoman Diagnosa" active={currentPage === 'diagnosis-ref'} onClick={() => setCurrentPage('diagnosis-ref')} />
            <SidebarItem icon={FileText} label="Pelaporan" active={currentPage === 'reports'} onClick={() => setCurrentPage('reports')} />
            <SidebarItem icon={ShieldCheck} label="Keamanan Data" active={currentPage === 'security'} onClick={() => setCurrentPage('security')} />
          </nav>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <SidebarItem icon={Settings} label="Pengaturan" onClick={() => {}} />
            <SidebarItem icon={LogOut} label="Keluar" onClick={handleLogout} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "ml-72" : "ml-20"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-bold text-slate-600 capitalize">{currentPage.replace('-', ' ')}</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">
              <Bell size={20} />
              <div className="w-2 h-2 bg-red-500 rounded-full -ml-3 -mt-3 border-2 border-white" />
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user?.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:border-blue-200 group-hover:bg-blue-100 transition-all overflow-hidden text-sm">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : <UserCircle size={28} />}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
