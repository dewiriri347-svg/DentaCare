/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  Settings as SettingsIcon, 
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
  GraduationCap,
  Eye,
  EyeOff
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
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

// --- Types ---
type Page = 'dashboard' | 'patients' | 'records' | 'appointments' | 'reports' | 'diagnosis-ref' | 'security' | 'billing' | 'education' | 'settings';

type UserRole = 'Admin' | 'Dokter Gigi' | 'Terapis Gigi dan Mulut' | 'Dosen' | 'Pasien';

interface User {
  uid?: string;
  name: string;
  role: UserRole;
  email: string;
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
  insurance: string; // Used for "Jenis Pembayaran"
  status: 'active' | 'inactive';
  // New fields from PDF
  religion?: string;
  birthPlace?: string;
  occupation?: string;
  nationality?: string;
  bloodType?: string;
  maritalStatus?: string;
  dependents?: {
    children: number;
    others: number;
  };
  tribe?: string;
  weight?: string;
  height?: string;
  examiningDentist?: string;
  examiningTherapist?: string;
  referralSource?: string;
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
  { id: '1', name: 'Ahmad Subarjo', nik: '3201012345678901', mrNumber: 'RM-001', birthDate: '1985-05-12', gender: 'L', address: 'Jl. Merdeka No. 10', phone: '08123456789', insurance: 'BPJS', status: 'active', examiningDentist: 'Drg. Rizky Ramadhan', examiningTherapist: 'Dewi Sri Rahmawati' },
  { id: '2', name: 'Siti Aminah', nik: '3201012345678902', mrNumber: 'RM-002', birthDate: '1992-08-24', gender: 'P', address: 'Jl. Mawar No. 5', phone: '08129876543', insurance: 'Mandiri Inhealth', status: 'active', examiningDentist: 'Drg. Rizky Ramadhan', examiningTherapist: 'Dewi Sri Rahmawati' },
  { id: '3', name: 'Budi Santoso', nik: '3201012345678903', mrNumber: 'RM-003', birthDate: '1978-11-02', gender: 'L', address: 'Jl. Melati No. 15', phone: '08131122334', insurance: 'UMUM', status: 'active', examiningDentist: 'Drg. Rizky Ramadhan', examiningTherapist: 'Dewi Sri Rahmawati' },
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

const Settings = ({ onSave }: { onSave: () => void }) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pengaturan Aplikasi</h2>
        <p className="text-slate-500">Kelola preferensi dan konfigurasi sistem</p>
      </div>
      <button 
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
      >
        <SettingsIcon size={16} />
        Simpan Pengaturan
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Profil Klinik</h3>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Klinik</label>
          <input type="text" defaultValue="DentaCare RME" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alamat</label>
          <textarea defaultValue="Jl. Kesehatan No. 123, Jakarta Selatan" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telepon</label>
          <input type="text" defaultValue="(021) 1234-5678" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Preferensi Sistem</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700 block">Notifikasi Email</span>
              <span className="text-[10px] text-slate-500">Kirim pengingat jadwal ke pasien</span>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700 block">Backup Otomatis</span>
              <span className="text-[10px] text-slate-500">Backup data setiap hari jam 00:00</span>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700 block">Mode Gelap</span>
              <span className="text-[10px] text-slate-500">Tema tampilan aplikasi</span>
            </div>
            <div className="w-10 h-5 bg-slate-300 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = ({ onNavigate, patients, appointments, invoices }: { onNavigate: (page: Page) => void, patients: Patient[], appointments: Appointment[], invoices: Invoice[] }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(apt => apt.date === today).length;
  
  // Calculate revenue
  const totalRevenue = invoices.filter(inv => inv.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);

  const DASHBOARD_STATS = [
    { label: 'Total Pasien', value: patients.length.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Kunjungan Hari Ini', value: todayAppointments.toString(), icon: Calendar, color: 'bg-emerald-500' },
    { label: 'Total Pendapatan', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, icon: Activity, color: 'bg-amber-500' },
    { label: 'Tagihan Tertunda', value: invoices.filter(inv => inv.status === 'unpaid').length.toString(), icon: CheckCircle2, color: 'bg-purple-500' },
  ];

  return (
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
        <h3 className="text-lg font-bold text-slate-900 mb-6">Jadwal Hari Ini</h3>
        <div className="space-y-4">
          {appointments.filter(apt => apt.date === today).map((apt, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {apt.patient.charAt(0)}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">{apt.patient}</h4>
                <p className="text-xs text-slate-500">{apt.type}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block">{apt.time}</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  apt.status === 'confirmed' ? "text-emerald-600" : "text-amber-600"
                )}>
                  {apt.status === 'confirmed' ? 'Dikonfirmasi' : 'Menunggu'}
                </span>
              </div>
            </div>
          ))}
          {appointments.filter(apt => apt.date === today).length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Tidak ada jadwal hari ini
            </div>
          )}
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
};

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
    insurance: 'Umum',
    religion: '',
    birthPlace: '',
    occupation: '',
    nationality: 'Indonesia',
    bloodType: '',
    maritalStatus: '',
    dependents: { children: 0, others: 0 },
    tribe: '',
    weight: '',
    height: '',
    examiningDentist: '',
    examiningTherapist: 'Dewi Sri Rahmawati',
    referralSource: ''
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
        insurance: patient.insurance,
        religion: patient.religion || '',
        birthPlace: patient.birthPlace || '',
        occupation: patient.occupation || '',
        nationality: patient.nationality || 'Indonesia',
        bloodType: patient.bloodType || '',
        maritalStatus: patient.maritalStatus || '',
        dependents: patient.dependents || { children: 0, others: 0 },
        tribe: patient.tribe || '',
        weight: patient.weight || '',
        height: patient.height || '',
        examiningDentist: patient.examiningDentist || '',
        examiningTherapist: patient.examiningTherapist || '',
        referralSource: patient.referralSource || ''
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
        insurance: 'Umum',
        religion: '',
        birthPlace: '',
        occupation: '',
        nationality: 'Indonesia',
        bloodType: '',
        maritalStatus: '',
        dependents: { children: 0, others: 0 },
        tribe: '',
        weight: '',
        height: '',
        examiningDentist: '',
        examiningTherapist: 'Dewi Sri Rahmawati',
        referralSource: ''
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
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usia / Gender</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telepon</th>
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
                <td className="px-6 py-4 text-sm text-slate-600">
                  {calculateAge(patient.birthDate)} Thn / {patient.gender}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{patient.phone}</td>
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
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Data Identitas Utama</h4>
                  </div>
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tempat Lahir</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.birthPlace}
                      onChange={e => setFormData({...formData, birthPlace: e.target.value})}
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Agama</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.religion}
                      onChange={e => setFormData({...formData, religion: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pekerjaan</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.occupation}
                      onChange={e => setFormData({...formData, occupation: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Bangsa</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.nationality}
                      onChange={e => setFormData({...formData, nationality: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Gol. Darah</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.bloodType}
                      onChange={e => setFormData({...formData, bloodType: e.target.value})}
                    >
                      <option value="">Pilih</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.maritalStatus}
                      onChange={e => setFormData({...formData, maritalStatus: e.target.value})}
                    />
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Pembayaran</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.insurance}
                      onChange={e => setFormData({...formData, insurance: e.target.value})}
                    >
                      <option value="UMUM">UMUM</option>
                      <option value="BPJS">BPJS</option>
                      <option value="Mandiri Inhealth">Mandiri Inhealth</option>
                      <option value="Asuransi lainnya">Asuransi lainnya</option>
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

                  <div className="md:col-span-2">
                    <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4 mt-4">Data Tambahan</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Suku/Adat</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.tribe}
                      onChange={e => setFormData({...formData, tribe: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Sumber Rujukan</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.referralSource}
                      onChange={e => setFormData({...formData, referralSource: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Dokter Gigi yang Melakukan Pemeriksaan</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.examiningDentist}
                      onChange={e => setFormData({...formData, examiningDentist: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Terapis Gigi dan Mulut yang Melakukan Pemeriksaan</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.examiningTherapist}
                      onChange={e => setFormData({...formData, examiningTherapist: e.target.value})}
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
    { id: 2, title: 'Pentingnya Flossing', category: 'dasar', description: 'Mengapa menyikat gigi saja tidak cukup untuk menjaga kebersihan sela gigi.', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', videoId: 'kLLSvCr5ksQ' },
    { id: 3, title: 'Kesehatan Gigi Anak', category: 'anak', description: 'Tips menjaga gigi susu agar tetap sehat dan mencegah karies sejak dini.', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', videoId: 'CMSDfP9W58o' },
    { id: 4, title: 'Makanan yang Merusak Gigi', category: 'nutrisi', description: 'Daftar makanan dan minuman yang perlu dihindari untuk mencegah lubang gigi.', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', videoId: 'bTwh-7hvrKI' },
    { id: 5, title: 'Prosedur Scaling Gigi', category: 'perawatan', description: 'Apa itu scaling dan mengapa Anda membutuhkannya setiap 6 bulan.', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 6, title: 'Gigi Sensitif: Penyebab & Solusi', category: 'perawatan', description: 'Memahami dentin yang terbuka dan cara mengatasinya.', icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50', videoId: 'd56wKFrtRgU' },
  ];

  const filtered = activeCategory === 'all' ? EDUCATIONS : EDUCATIONS.filter(e => e.category === activeCategory);

  useEffect(() => {
    if (selectedVideo) {
      window.history.pushState({ videoOpen: true }, '');
      
      const handlePopState = () => {
        setSelectedVideo(null);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [selectedVideo]);

  const closeVideo = () => {
    if (window.history.state?.videoOpen) {
      window.history.back();
    } else {
      setSelectedVideo(null);
    }
  };

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
                <button onClick={closeVideo} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
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
                <button onClick={closeVideo} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">
                  <ChevronRight size={18} className="rotate-180" />
                  Kembali
                </button>
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

const Billing = ({ invoices, setInvoices, onSave }: { invoices: Invoice[], setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>, onSave: () => void }) => {
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.patient.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (inv: Invoice) => {
    setPrintingInvoice(inv);
  };

  useEffect(() => {
    if (printingInvoice || printingAll) {
      setTimeout(() => {
        window.print();
        setPrintingInvoice(null);
        setPrintingAll(false);
      }, 500);
    }
  }, [printingInvoice, printingAll]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv));
    setEditingInvoice(null);
  };

  if (printingInvoice || printingAll) {
    const invoicesToPrint = printingAll ? filteredInvoices : [printingInvoice!];
    return (
      <div className="print-container bg-white p-12 max-w-4xl mx-auto border shadow-sm print:shadow-none print:border-none print:p-0">
        {invoicesToPrint.map((inv, index) => (
          <div key={inv.id} className={index > 0 ? "mt-24 pt-12 border-t-2 border-dashed border-slate-200 print:break-before-page print:mt-0 print:pt-0 print:border-none" : ""}>
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
                <p className="text-xs font-bold text-blue-600 mt-1">No: {inv.id}</p>
                <p className="text-[10px] text-slate-400 mt-1">{inv.date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Pasien / Penerima:</p>
                <p className="text-lg font-bold text-slate-900">{inv.patient}</p>
                <p className="text-xs text-slate-500 mt-1 italic">ID Pasien: RM-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1 text-right">Detail Pembayaran:</p>
                <p className="text-sm font-bold text-slate-900">Metode: {inv.method}</p>
                <p className="text-xs text-slate-500 mt-1">Status: <span className="text-emerald-600 font-bold uppercase">{inv.status}</span></p>
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
                    <td className="py-5 text-right text-sm font-bold text-slate-900 align-top">Rp {inv.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-8 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Total Bayar</td>
                    <td className="py-8 text-right text-3xl font-black text-blue-600">Rp {inv.amount.toLocaleString()}</td>
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
          </div>
        ))}
        
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center gap-4 print:hidden">
          <button 
            onClick={() => { setPrintingInvoice(null); setPrintingAll(false); }}
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
            onClick={() => setPrintingAll(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
          >
            <Printer size={16} />
            Cetak Semua
          </button>
          <button 
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <Save size={16} />
            Simpan Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Pendapatan (Bulan Ini)</p>
          <p className="text-3xl font-black text-slate-900">Rp {invoices.filter(inv => inv.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('id-ID')}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <Activity size={14} />
            Data Terintegrasi
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Belum Terbayar</p>
          <p className="text-3xl font-black text-red-600">{invoices.filter(inv => inv.status === 'unpaid').length}</p>
          <p className="mt-4 text-slate-400 text-xs font-medium">Total: Rp {invoices.filter(inv => inv.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('id-ID')}</p>
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

const ExaminationRow = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
    <span className="text-sm font-bold text-slate-700">{label}</span>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input 
          type="radio" className="w-4 h-4 text-blue-600"
          checked={value === 'Normal'}
          onChange={() => onChange('Normal')}
        />
        <span className="text-xs font-bold text-slate-500">N</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input 
          type="radio" className="w-4 h-4 text-blue-600"
          checked={value === 'Other'}
          onChange={() => onChange('Other')}
        />
        <span className="text-xs font-bold text-slate-500">O</span>
      </label>
    </div>
  </div>
);

const HUMAN_NEEDS_GUIDELINES = {
  perlindunganResiko: {
    title: "Perlindungan dari Resiko Kesehatan",
    guideline: "Kebutuhan untuk menghindari komplikasi medis terkait asuhan gigi dan mulut. Contoh: Riwayat penyakit sistemik, alergi, atau kondisi yang memerlukan premedikasi."
  },
  bebasKetakutan: {
    title: "Bebas dari Ketakutan/Stress",
    guideline: "Kebutuhan untuk merasa aman dan bebas dari ketakutan atau stress terkait asuhan gigi dan mulut. Contoh: Kecemasan terhadap jarum suntik, suara bur, atau pengalaman buruk masa lalu."
  },
  kesanWajahSehat: {
    title: "Kesan Wajah yang Sehat",
    guideline: "Kebutuhan untuk merasa puas dengan penampilan wajah dan gigi geliginya. Contoh: Gigi berjejal, perubahan warna gigi, atau halitosis yang mempengaruhi kepercayaan diri."
  },
  keutuhanMukosa: {
    title: "Keutuhan Kulit & Membran Mukosa",
    guideline: "Kebutuhan akan keutuhan jaringan lunak di mulut dan sekitarnya. Contoh: Lesi mulut, gingivitis, periodontitis, atau xerostomia."
  },
  kondisiBiologis: {
    title: "Kondisi Biologis & Fungsi Gigi Geligi",
    guideline: "Kebutuhan akan fungsi gigi geligi yang baik dan bebas dari penyakit. Contoh: Karies, gigi goyang, atau kesulitan mengunyah."
  },
  konseptualisasi: {
    title: "Konseptualisasi & Pemecahan Masalah",
    guideline: "Kebutuhan untuk memahami kesehatan gigi dan mulut serta prosedur yang dilakukan. Contoh: Kurangnya pengetahuan tentang cara menyikat gigi yang benar atau pentingnya flossing."
  },
  bebasNyeri: {
    title: "Bebas dari Nyeri pada Kepala & Leher",
    guideline: "Kebutuhan untuk bebas dari rasa sakit atau tidak nyaman pada area kepala dan leher. Contoh: Sakit gigi akut, nyeri sendi rahang (TMJ), atau sensitivitas gigi."
  },
  tanggungJawab: {
    title: "Tanggung Jawab terhadap Kesehatan Gigi & Mulut",
    guideline: "Kebutuhan untuk bertanggung jawab atas kesehatan gigi dan mulutnya sendiri. Contoh: Ketidakteraturan kunjungan rutin atau kurangnya motivasi perawatan mandiri."
  }
};

const PlaqueTooth = ({ toothId, data, onChange }: { toothId: number, data?: { buccal: boolean, lingual: boolean, mesial: boolean, distal: boolean, excluded?: boolean }, onChange: (surfaces: { buccal: boolean, lingual: boolean, mesial: boolean, distal: boolean, excluded?: boolean }) => void }) => {
  const surfaces = data || { buccal: false, lingual: false, mesial: false, distal: false, excluded: false };
  
  const toggleSurface = (surface: keyof typeof surfaces) => {
    if (surfaces.excluded) return;
    onChange({ ...surfaces, [surface as any]: !surfaces[surface as any] });
  };

  const toggleExclude = () => {
    onChange({ ...surfaces, excluded: !surfaces.excluded });
  };

  return (
    <div className={cn("flex flex-col items-center gap-1 transition-all", surfaces.excluded && "opacity-30 grayscale")}>
      <button 
        onClick={toggleExclude}
        className={cn(
          "text-[10px] font-bold px-1 rounded transition-colors",
          surfaces.excluded ? "bg-slate-200 text-slate-500" : "text-slate-400 hover:bg-slate-100"
        )}
        title="Klik untuk mengecualikan gigi ini"
      >
        {toothId}
      </button>
      <div className={cn(
        "relative w-8 h-8 border rounded-sm overflow-hidden bg-white transition-all shadow-sm",
        surfaces.excluded ? "border-slate-100" : "border-slate-200"
      )}>
        {/* Top (Buccal/Labial) */}
        <div 
          onClick={() => toggleSurface('buccal')}
          className={cn(
            "absolute top-0 left-0 right-0 h-1/2 cursor-pointer border-b border-slate-100 transition-all",
            surfaces.buccal ? "bg-red-500" : "hover:bg-red-50"
          )}
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }}
        />
        {/* Bottom (Lingual/Palatal) */}
        <div 
          onClick={() => toggleSurface('lingual')}
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1/2 cursor-pointer border-t border-slate-100 transition-all",
            surfaces.lingual ? "bg-red-500" : "hover:bg-red-50"
          )}
          style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }}
        />
        {/* Left (Mesial/Distal depending on quadrant) */}
        <div 
          onClick={() => toggleSurface('mesial')}
          className={cn(
            "absolute top-0 bottom-0 left-0 w-1/2 cursor-pointer border-r border-slate-100 transition-all",
            surfaces.mesial ? "bg-red-500" : "hover:bg-red-50"
          )}
          style={{ clipPath: 'polygon(0 0, 0 100%, 50% 50%)' }}
        />
        {/* Right (Distal/Mesial depending on quadrant) */}
        <div 
          onClick={() => toggleSurface('distal')}
          className={cn(
            "absolute top-0 bottom-0 right-0 w-1/2 cursor-pointer border-l border-slate-100 transition-all",
            surfaces.distal ? "bg-red-500" : "hover:bg-red-50"
          )}
          style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }}
        />
      </div>
    </div>
  );
};

const MedicalRecord = ({ 
  patients, 
  selectedPatientId, 
  onSelectPatient,
  onAddAppointment,
  onSave,
  user,
  users
}: { 
  patients: Patient[], 
  selectedPatientId: string | null,
  onSelectPatient: (id: string) => void,
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => void,
  onSave: () => void,
  user: User | null,
  users: User[]
}) => {
  const [activeTab, setActiveTab] = useState<'anamnesis' | 'clinical' | 'diagnosis' | 'treatment' | 'consent' | 'resume' | 'riwayat' | 'evaluation'>('anamnesis');
  const [anamnesisSubTab, setAnamnesisSubTab] = useState<'medical' | 'social' | 'dental' | 'vital' | 'clinical_exam' | 'pharmacological'>('medical');
  const [clinicalSubTab, setClinicalSubTab] = useState<'ohis' | 'plaque' | 'odontogram' | 'periodontal'>('ohis');
  const [toothData, setToothData] = useState<Record<number, ToothSurfaceData>>({});
  const [toothNotes, setToothNotes] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPreviousVisitModalOpen, setIsPreviousVisitModalOpen] = useState(false);
  const [showPrimaryTeeth, setShowPrimaryTeeth] = useState(true);
  const [showDiagnosisGuidelines, setShowDiagnosisGuidelines] = useState(false);
  const [isPatientVerified, setIsPatientVerified] = useState(user?.role !== 'Pasien');
  const [showVerification, setShowVerification] = useState(user?.role === 'Pasien' && !isPatientVerified);
  
  // Visit History Data
  const [history, setHistory] = useState<any[]>([
    { 
      date: '2026-03-15', 
      diagnosis: {
        unmetNeeds: 'Karies Dentin (K02.1)',
        cause: 'Oral hygiene buruk',
        signsSymptoms: 'Lubang pada gigi 16',
        clientGoals: 'Penambalan gigi',
        interventions: 'Tumpatan komposit',
        evaluativeStatement: 'Pasien kooperatif',
        nextTreatmentRecommendation: 'Kontrol 6 bulan lagi',
        categories: {}
      },
      treatment: ['4'], // Tumpatan Komposit (Kecil)
      vitalSigns: { tensi: '120/80', suhu: '36.5', hr: '80', rr: '20', tb: '170', bb: '70' },
      doctor: 'Drg. Rizky', 
      therapist: 'Dewi Sri Rahmawati' 
    },
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
    medicalHistory: {
      sehat: true,
      penyakitSerius: false,
      detailPenyakitSerius: '',
      kelainanDarah: false,
      detailKelainanDarah: '',
      alergi: {
        hasAlergi: false,
        makanan: '',
        obatObatan: '',
        obatBius: '',
        cuaca: '',
        lainLain: ''
      },
      hasLainLain: false,
      detailLainLain: ''
    },
    socialHistory: '',
    dentalHistory: {
      alasanKunjungan: '',
      inginDiketahui: [],
      inginDiketahuiLainnya: '',
      rontgen2Tahun: false,
      rontgenType: '',
      komplikasiPerawatan: false,
      detailKomplikasi: '',
      pendapatKunjunganLalu: '',
      pendapatKesehatanUmum: '',
      gejala: [],
      gejalaLainnya: '',
      gemeretakGigi: false,
      biteGuard: false,
      cemasAromaNafas: false,
      masalahAromaNafas: [],
      cederaGigi: false,
      detailCedera: '',
      pengalamanLalu: [],
      pengalamanLaluLainnya: '',
      // BAG II
      homeCareTools: [],
      homeCareToolsLainnya: '',
      toothpasteBenefits: [],
      toothpasteBenefitsLainnya: '',
      cleaningTimeBrushing: '',
      cleaningTimeFlossing: '',
      frequencyBrushing: '',
      frequencyFlossing: '',
      brushingTimes: [],
      brushingTimesLainnya: '',
      difficultyScheduling: null as boolean | null,
      difficultyCleaningCondition: null as boolean | null,
      difficultyCleaningOptions: [],
      difficultyCleaningLainnya: '',
      monthlyOralCancerCheck: null as boolean | null,
      habits: [],
      habitsLainnya: ''
    },
    vitalSigns: {
      tensi: '',
      suhu: '',
      tb: '',
      bb: '',
      hr: '',
      rr: ''
    },
    cemilan: [
      { name: 'Permen Mint', selected: false, frequency: '' },
      { name: 'Minuman Manis', selected: false, frequency: '' },
      { name: 'Buah Kering', selected: false, frequency: '' },
      { name: 'Minuman Kaleng/Botol', selected: false, frequency: '' },
      { name: 'Permen Karet', selected: false, frequency: '' },
      { name: 'Kerupuk', selected: false, frequency: '' },
      { name: 'Obat Syrup', selected: false, frequency: '' },
      { name: 'Keripik', selected: false, frequency: '' },
      { name: 'Kue Kering', selected: false, frequency: '' },
      { name: 'Lainnya', selected: false, frequency: '', detail: '' }
    ],
    keyakinan: {
      kemungkinanBerlubang: '',
      pentingnyaPencegahan: '',
      percayaBisaMenjaga: null as boolean | null,
      percayaKesehatanGigi: ''
    },
    pharmacological: {
      konsumsiObat: null as boolean | null,
      detailObat: '',
      untukApa: '',
      efekSamping: '',
      pengaruhPositif: '',
      masalahDosis: null as boolean | null,
      detailDosis: '',
      konsumsiTeratur: null as boolean | null
    }
  });

  // Clinical Exam State
  const [clinical, setClinical] = useState({
    ekstraOral: { 
      skinFace: 'Normal',
      skinNeck: 'Normal',
      vermilionBorders: 'Normal',
      parotidGlands: 'Normal',
      lymphNodes: {
        anteriorCervical: 'Normal',
        posteriorCervical: 'Normal',
        submental: 'Normal',
        submandibular: 'Normal',
        supraclavicular: 'Normal'
      },
      tmj: 'Normal',
      wajah: 'Simetris',
      notes: ''
    },
    intraOral: { 
      labialMucosa: 'Normal',
      labialVestibules: 'Normal',
      anteriorGingivae: 'Normal',
      buccalVestibules: 'Normal',
      buccalGingivae: 'Normal',
      tongueDorsal: 'Normal',
      tongueVentral: 'Normal',
      tongueLateral: 'Normal',
      lingualTonsils: 'Normal',
      floorOfMouth: 'Normal',
      lingualGingivae: 'Normal',
      tonsillarPillars: 'Normal',
      pharyngealWall: 'Normal',
      softPalate: 'Normal',
      uvula: 'Normal',
      hardPalate: 'Normal',
      palatalGingivae: 'Normal',
      submandibularGlands: 'Normal',
      notes: ''
    },
    ohis: {
      gigiIndex: [16, 11, 26, 36, 31, 46],
      debrisIndex: [0, 0, 0, 0, 0, 0],
      calculusIndex: [0, 0, 0, 0, 0, 0]
    },
    plaqueControl: {
      data: {} as Record<number, { buccal: boolean, lingual: boolean, mesial: boolean, distal: boolean, excluded?: boolean }>,
      score: 0,
      kategori: ''
    },
    periodontal: {
      data: {} as Record<number, { bleeding: boolean, attachmentLoss: boolean, pocket: boolean, stains: boolean, calculus: number }>,
      jumlahSkor: 0
    }
  });

  // Indices State
  // Diagnosis State
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [dentalHygieneDiagnosis, setDentalHygieneDiagnosis] = useState({
    categories: {
      perlindunganResiko: '',
      bebasKetakutan: '',
      kesanWajahSehat: '',
      keutuhanMukosa: '',
      kondisiBiologis: '',
      konseptualisasi: '',
      bebasNyeri: '',
      tanggungJawab: ''
    },
    unmetNeeds: '',
    cause: '',
    signsSymptoms: '',
    clientGoals: '',
    interventions: '',
    evaluativeStatement: '',
    nextTreatmentRecommendation: ''
  });
  
  // Treatment State
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  // Consent State
  const [consent, setConsent] = useState({
    patientName: '',
    relationship: '',
    dentistName: '',
    therapistName: '',
    guardianName: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Signature Refs
  const sigDentist = useRef<SignatureCanvas>(null);
  const sigTherapist = useRef<SignatureCanvas>(null);
  const sigPatient = useRef<SignatureCanvas>(null);
  const sigGuardian = useRef<SignatureCanvas>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  if (user?.role === 'Pasien' && !isPatientVerified) {
    return (
      <PatientVerification 
        onVerify={(id) => {
          setIsPatientVerified(true);
          setShowVerification(false);
        }}
        patients={patients}
      />
    );
  }

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

  useEffect(() => {
    if (selectedPatient) {
      setConsent(prev => ({
        ...prev,
        patientName: selectedPatient.name,
        operatorName: selectedPatient.examiningDentist || selectedPatient.examiningTherapist || ''
      }));
    }
  }, [selectedPatient]);

  const calculateOHIS = () => {
    const avgDI = clinical.ohis.debrisIndex.reduce((a, b) => a + b, 0) / 6;
    const avgCI = clinical.ohis.calculusIndex.reduce((a, b) => a + b, 0) / 6;
    return (avgDI + avgCI).toFixed(2);
  };

  const handleAIAnalysis = async () => {
    if (!anamnesis.dentalHistory.alasanKunjungan) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = "";
      if (activeTab === 'evaluation') {
        prompt = `Sebagai asisten Dokter Gigi AI profesional, berikan evaluasi perkembangan pasien berdasarkan perbandingan kunjungan awal dan kunjungan terakhir:
        
        DATA PASIEN:
        Nama: ${selectedPatient?.name}
        
        KUNJUNGAN AWAL (${history.length > 0 ? history[history.length - 1].date : 'N/A'}):
        Diagnosa: ${history.length > 0 ? history[history.length - 1].diagnosis.unmetNeeds : '-'}
        Tindakan: ${history.length > 0 ? history[history.length - 1].treatment.map((id: string) => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') : '-'}
        Tanda Vital: Tensi ${history.length > 0 ? history[history.length - 1].vitalSigns.tensi : '-'}, Suhu ${history.length > 0 ? history[history.length - 1].vitalSigns.suhu : '-'}
        
        KUNJUNGAN TERAKHIR (${new Date().toLocaleDateString('id-ID')}):
        Diagnosa Saat Ini: ${dentalHygieneDiagnosis.unmetNeeds}
        Tindakan Direncanakan: ${selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ')}
        Tanda Vital: Tensi ${anamnesis.vitalSigns.tensi}, Suhu ${anamnesis.vitalSigns.suhu}
        
        Berikan output dalam format Markdown yang rapi dengan bagian-bagian berikut:
        1. **Ringkasan Perubahan**: (Detail perbaikan atau penurunan kondisi pasien)
        2. **Analisis Efektivitas Perawatan**: (Apakah tindakan sebelumnya memberikan hasil yang diharapkan?)
        3. **Rekomendasi Penyesuaian Rencana**: (Apa yang perlu diubah atau dilanjutkan berdasarkan perkembangan ini?)
        4. **Edukasi Pasien Lanjutan**: (Pesan khusus untuk pasien mengenai progres mereka)
        
        Gunakan bahasa Indonesia yang profesional dan berikan detail yang terperinci.`;
      } else {
        prompt = `Sebagai asisten Dokter Gigi AI profesional, berikan analisis mendalam berdasarkan data pasien berikut:
        
        DATA PASIEN:
        Nama: ${selectedPatient?.name}
        Umur: ${calculateAge(selectedPatient?.birthDate || '')} tahun
        Jenis Kelamin: ${selectedPatient?.gender}
        
        ANAMNESIS:
        Keluhan Utama: ${anamnesis.dentalHistory.alasanKunjungan}
        Riwayat Medis: ${JSON.stringify(anamnesis.medicalHistory)}
        Riwayat Sosial: ${anamnesis.socialHistory}
        
        TANDA VITAL:
        Tensi: ${anamnesis.vitalSigns.tensi} mmHg
        Suhu: ${anamnesis.vitalSigns.suhu} °C
        HR: ${anamnesis.vitalSigns.hr} bpm
        RR: ${anamnesis.vitalSigns.rr} x/mnt
        
        PEMERIKSAAN KLINIS:
        OHI-S: ${calculateOHIS()}
        Plaque Score: ${(() => {
          const entries = Object.values(clinical.plaqueControl.data);
          const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
          const totalCount = entries.length * 4;
          return totalCount > 0 ? ((plaqueCount / totalCount) * 100).toFixed(1) : "0.0";
        })()}%
        
        Berikan output dalam format Markdown yang rapi dengan bagian-bagian berikut:
        1. **Analisis Keluhan & Diagnosis**: (Analisis keluhan utama dan kemungkinan diagnosis klinis)
        2. **Anjuran Tindakan & Pengobatan**: (Rencana tindakan medis di klinik dan obat-obatan jika diperlukan)
        3. **Cara Mencegah**: (Edukasi pasien untuk mencegah masalah serupa di masa depan)
        4. **Cara Mengobati (Instruksi Mandiri)**: (Instruksi perawatan mandiri di rumah untuk pasien)
        
        Gunakan bahasa Indonesia yang profesional namun mudah dimengerti pasien.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
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
    
    // AI recommendations logic removed as SOAPIE is no longer available
    alert('Rekomendasi AI tersedia di panel analisis.');
  };

  const handleNewVisit = () => {
    if (confirm('Mulai kunjungan baru? Data saat ini akan disimpan ke riwayat.')) {
      const newVisit = {
        date: new Date().toISOString().split('T')[0],
        diagnosis: { ...dentalHygieneDiagnosis },
        treatment: [...selectedTreatments],
        vitalSigns: { ...anamnesis.vitalSigns },
        doctor: selectedPatient?.examiningDentist || 'Drg. Rizky',
        therapist: selectedPatient?.examiningTherapist || '-'
      };
      setHistory([newVisit, ...history]);
      
      // Reset form for new visit
      setAnamnesis(prev => ({
        ...prev,
        vitalSigns: { tensi: '', suhu: '', hr: '', rr: '', tb: '', bb: '' }
      }));
      setSelectedTreatments([]);
      
      // Navigate to Vital Signs
      setActiveTab('anamnesis');
      setAnamnesisSubTab('vital');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!selectedPatient) return;
    const text = `Resume Pemeriksaan Dental - ${selectedPatient.name}
    No RM: ${selectedPatient.mrNumber}
    Keluhan: ${anamnesis.dentalHistory.alasanKunjungan}
    OHI-S: ${calculateOHIS()}
    Tindakan: ${selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ')}
    Total Biaya: Rp ${selectedPatient.insurance === 'BPJS' ? '0 (BPJS)' : selectedTreatments.reduce((sum, id) => sum + (TREATMENTS_2023.find(t => t.id === id)?.price || 0), 0).toLocaleString('id-ID')}`;
    
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
            <div className="flex gap-4 mt-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Drg: {selectedPatient.examiningDentist || '-'}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Terapis: {selectedPatient.examiningTherapist || '-'}</p>
            </div>
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
          { id: 'anamnesis', label: 'Anamnesis', icon: ClipboardList, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen', 'Pasien'] },
          { id: 'clinical', label: 'Pemeriksaan', icon: Stethoscope, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen'] },
          { id: 'diagnosis', label: 'Diagnosis', icon: AlertCircle, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen'] },
          { id: 'treatment', label: 'Tindakan', icon: CheckCircle2, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen'] },
          { id: 'consent', label: 'Informed Consent', icon: ShieldCheck, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen', 'Pasien'] },
          { id: 'resume', label: 'Resume', icon: FileText, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen', 'Pasien'] },
          { id: 'riwayat', label: 'Riwayat', icon: History, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen'] },
          { id: 'evaluation', label: 'Evaluasi', icon: Activity, roles: ['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen', 'Pasien'] },
        ].filter(tab => {
          if (user?.role === 'Pasien') {
            return ['anamnesis', 'resume', 'evaluation'].includes(tab.id);
          }
          return tab.roles.includes(user?.role || '');
        }).map((tab) => (
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

      <div className={cn("bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[400px] print:border-none print:shadow-none print:p-0", user?.role === 'Dosen' ? 'dosen-view' : '')}>
        {activeTab === 'anamnesis' && (
          <div className="space-y-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {[
                { id: 'medical', label: '1. Medical History' },
                { id: 'social', label: '2. Social History' },
                { id: 'dental', label: '3. Dental History' },
                { id: 'vital', label: '4. Vital Signs' },
                { id: 'clinical_exam', label: '5. Extra & Intra Oral' },
                { id: 'pharmacological', label: '6. Pharmacological' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setAnamnesisSubTab(sub.id as any)}
                  className={cn(
                    "tab-button px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                    anamnesisSubTab === sub.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                      : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {anamnesisSubTab === 'medical' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">1. Medical History (Riwayat Medis)</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">a. Pasien merasa dalam keadaan sehat?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.medicalHistory.sehat === null ? "" : anamnesis.medicalHistory.sehat ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, sehat: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">b. Selama 5 tahun terakhir, pasien pernah dinyatakan mengalami penyakit serius, menjalani operasi dan atau dirawat inap di rumah sakit, yaitu sakit/operasi?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.medicalHistory.penyakitSerius === null ? "" : anamnesis.medicalHistory.penyakitSerius ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, penyakitSerius: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                      {anamnesis.medicalHistory.penyakitSerius && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500">Keterangan Sakit/Operasi:</label>
                          <input 
                            type="text" placeholder="Sebutkan penyakit/operasi..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.medicalHistory.detailPenyakitSerius}
                            onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, detailPenyakitSerius: e.target.value}})}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">c. Pasien mempunyai kelainan pembekuan darah?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.medicalHistory.kelainanDarah === null ? "" : anamnesis.medicalHistory.kelainanDarah ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, kelainanDarah: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                      {anamnesis.medicalHistory.kelainanDarah && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500">Keterangan Kelainan:</label>
                          <input 
                            type="text" placeholder="Sebutkan kelainan..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.medicalHistory.detailKelainanDarah}
                            onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, detailKelainanDarah: e.target.value}})}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <label className="block text-sm font-bold text-slate-700">d. Pasien mempunyai alergi terhadap hal-hal berikut?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.medicalHistory.alergi.hasAlergi === null ? "" : anamnesis.medicalHistory.alergi.hasAlergi ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, hasAlergi: val}}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                      {anamnesis.medicalHistory.alergi.hasAlergi && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Makanan</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.medicalHistory.alergi.makanan}
                              onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, makanan: e.target.value}}})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Obat-obatan</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.medicalHistory.alergi.obatObatan}
                              onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, obatObatan: e.target.value}}})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Obat yang disuntik (dibius)</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.medicalHistory.alergi.obatBius}
                              onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, obatBius: e.target.value}}})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Cuaca</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.medicalHistory.alergi.cuaca}
                              onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, cuaca: e.target.value}}})}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lain-lain</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.medicalHistory.alergi.lainLain}
                              onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, alergi: {...anamnesis.medicalHistory.alergi, lainLain: e.target.value}}})}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">e. Lain-lain?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.medicalHistory.hasLainLain === null ? "" : anamnesis.medicalHistory.hasLainLain ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, hasLainLain: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                      {anamnesis.medicalHistory.hasLainLain && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500">Keterangan Lain-lain:</label>
                          <textarea 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                            value={anamnesis.medicalHistory.detailLainLain}
                            onChange={e => setAnamnesis({...anamnesis, medicalHistory: {...anamnesis.medicalHistory, detailLainLain: e.target.value}})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {anamnesisSubTab === 'social' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">2. Social History (Riwayat Sosial)</h3>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Riwayat Sosial (diisi secara manual)</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[200px]"
                    value={anamnesis.socialHistory}
                    onChange={e => setAnamnesis({...anamnesis, socialHistory: e.target.value})}
                    placeholder="Masukkan riwayat sosial pasien di sini..."
                  />
                </div>
              </div>
            )}

            {anamnesisSubTab === 'vital' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">4. Tanda-tanda Vital (Vital Signs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tekanan Darah (mmHg)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.tensi}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, tensi: e.target.value}})}
                      placeholder="Contoh: 120/80"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Denyut Nadi (bpm)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.hr}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, hr: e.target.value}})}
                      placeholder="Contoh: 80"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pernafasan (x/menit)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.rr}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, rr: e.target.value}})}
                      placeholder="Contoh: 20"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Suhu (°C)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.suhu}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, suhu: e.target.value}})}
                      placeholder="Contoh: 36.5"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tinggi Badan (cm)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.tb}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, tb: e.target.value}})}
                      placeholder="Contoh: 170"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Berat Badan (kg)</label>
                    <input 
                      type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.vitalSigns.bb}
                      onChange={e => setAnamnesis({...anamnesis, vitalSigns: {...anamnesis.vitalSigns, bb: e.target.value}})}
                      placeholder="Contoh: 65"
                    />
                  </div>
                </div>
              </div>
            )}

            {anamnesisSubTab === 'clinical_exam' && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 uppercase tracking-widest">Extraoral Examination</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Skin</h4>
                      <ExaminationRow label="Face" value={clinical.ekstraOral.skinFace} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, skinFace: val}})} />
                      <ExaminationRow label="Neck" value={clinical.ekstraOral.skinNeck} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, skinNeck: val}})} />
                      <ExaminationRow label="Vermilion Borders" value={clinical.ekstraOral.vermilionBorders} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, vermilionBorders: val}})} />
                      <ExaminationRow label="Parotid Glands" value={clinical.ekstraOral.parotidGlands} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, parotidGlands: val}})} />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Lymph Nodes</h4>
                      <ExaminationRow label="Anterior Cervical" value={clinical.ekstraOral.lymphNodes.anteriorCervical} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, lymphNodes: {...clinical.ekstraOral.lymphNodes, anteriorCervical: val}}})} />
                      <ExaminationRow label="Posterior Cervical" value={clinical.ekstraOral.lymphNodes.posteriorCervical} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, lymphNodes: {...clinical.ekstraOral.lymphNodes, posteriorCervical: val}}})} />
                      <ExaminationRow label="Submental" value={clinical.ekstraOral.lymphNodes.submental} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, lymphNodes: {...clinical.ekstraOral.lymphNodes, submental: val}}})} />
                      <ExaminationRow label="Submandibular" value={clinical.ekstraOral.lymphNodes.submandibular} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, lymphNodes: {...clinical.ekstraOral.lymphNodes, submandibular: val}}})} />
                      <ExaminationRow label="Supraclavicular" value={clinical.ekstraOral.lymphNodes.supraclavicular} onChange={val => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, lymphNodes: {...clinical.ekstraOral.lymphNodes, supraclavicular: val}}})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2 uppercase tracking-widest">Intraoral Examination</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <ExaminationRow label="Labial Mucosa" value={clinical.intraOral.labialMucosa} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, labialMucosa: val}})} />
                      <ExaminationRow label="Labial Vestibules" value={clinical.intraOral.labialVestibules} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, labialVestibules: val}})} />
                      <ExaminationRow label="Anterior Gingivae" value={clinical.intraOral.anteriorGingivae} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, anteriorGingivae: val}})} />
                      <ExaminationRow label="Buccal Vestibules" value={clinical.intraOral.buccalVestibules} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, buccalVestibules: val}})} />
                      <ExaminationRow label="Buccal Gingivae" value={clinical.intraOral.buccalGingivae} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, buccalGingivae: val}})} />
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2 mt-4">Tongue</h4>
                      <ExaminationRow label="Dorsal" value={clinical.intraOral.tongueDorsal} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, tongueDorsal: val}})} />
                      <ExaminationRow label="Ventral" value={clinical.intraOral.tongueVentral} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, tongueVentral: val}})} />
                      <ExaminationRow label="Lateral" value={clinical.intraOral.tongueLateral} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, tongueLateral: val}})} />
                    </div>
                    <div className="space-y-3">
                      <ExaminationRow label="Lingual Tonsils" value={clinical.intraOral.lingualTonsils} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, lingualTonsils: val}})} />
                      <ExaminationRow label="Floor of Mouth" value={clinical.intraOral.floorOfMouth} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, floorOfMouth: val}})} />
                      <ExaminationRow label="Lingual Gingivae" value={clinical.intraOral.lingualGingivae} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, lingualGingivae: val}})} />
                      <ExaminationRow label="Tonsillar Pillars" value={clinical.intraOral.tonsillarPillars} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, tonsillarPillars: val}})} />
                      <ExaminationRow label="Pharyngeal Wall" value={clinical.intraOral.pharyngealWall} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, pharyngealWall: val}})} />
                      <ExaminationRow label="Soft Palate" value={clinical.intraOral.softPalate} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, softPalate: val}})} />
                      <ExaminationRow label="Uvula" value={clinical.intraOral.uvula} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, uvula: val}})} />
                      <ExaminationRow label="Hard Palate" value={clinical.intraOral.hardPalate} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, hardPalate: val}})} />
                      <ExaminationRow label="Palatal Gingivae" value={clinical.intraOral.palatalGingivae} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, palatalGingivae: val}})} />
                      <ExaminationRow label="Submandibular Glands" value={clinical.intraOral.submandibularGlands} onChange={val => setClinical({...clinical, intraOral: {...clinical.intraOral, submandibularGlands: val}})} />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Catatan (Notes):</label>
                  <textarea 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px]"
                    value={clinical.ekstraOral.notes}
                    onChange={e => setClinical({...clinical, ekstraOral: {...clinical.ekstraOral, notes: e.target.value}})}
                    placeholder="Tambahkan catatan pemeriksaan di sini..."
                  />
                </div>
              </div>
            )}

            {anamnesisSubTab === 'pharmacological' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">6. Pharmacological History (Riwayat Farmakologi)</h3>
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-700">1. Apakah anda sedang/pernah mengkonsumsi obat-obatan (termasuk obat herbal/alternatif)?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.pharmacological.konsumsiObat === null ? "" : anamnesis.pharmacological.konsumsiObat ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, konsumsiObat: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                    </div>
                    {anamnesis.pharmacological.konsumsiObat && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan Obat:</label>
                          <input 
                            type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.pharmacological.detailObat}
                            onChange={e => setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, detailObat: e.target.value}})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Untuk Apa:</label>
                          <input 
                            type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.pharmacological.untukApa}
                            onChange={e => setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, untukApa: e.target.value}})}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-sm font-bold text-slate-700">2. Apa efek samping dari obat tersebut?</label>
                    <textarea 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                      value={anamnesis.pharmacological.efekSamping}
                      onChange={e => setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, efekSamping: e.target.value}})}
                      placeholder="Berikan jawaban keterangan..."
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <label className="block text-sm font-bold text-slate-700">3. Apakah pengaruh positif dari obat tersebut?</label>
                    <textarea 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                      value={anamnesis.pharmacological.pengaruhPositif}
                      onChange={e => setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, pengaruhPositif: e.target.value}})}
                      placeholder="Berikan jawaban keterangan..."
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-700">4. Apakah ada masalah dengan dosis obat tersebut?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.pharmacological.masalahDosis === null ? "" : anamnesis.pharmacological.masalahDosis ? "Ya" : "Tidak"}
                        onChange={e => {
                          const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                          setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, masalahDosis: val}});
                        }}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Ya">Ya</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                    </div>
                    {anamnesis.pharmacological.masalahDosis && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500">Jelaskan:</label>
                        <textarea 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                          value={anamnesis.pharmacological.detailDosis}
                          onChange={e => setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, detailDosis: e.target.value}})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <label className="block text-sm font-bold text-slate-700">5. Apakah anda mengkonsumsi obat tersebut secara teratur?</label>
                    <select 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={anamnesis.pharmacological.konsumsiTeratur === null ? "" : anamnesis.pharmacological.konsumsiTeratur ? "Ya" : "Tidak"}
                      onChange={e => {
                        const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                        setAnamnesis({...anamnesis, pharmacological: {...anamnesis.pharmacological, konsumsiTeratur: val}});
                      }}
                    >
                      <option value="">Pilih Jawaban...</option>
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {anamnesisSubTab === 'dental' && (
              <div className="space-y-8">
                {/* BAGIAN 1 */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2">3. Dental History - BAGIAN 1: Pengalaman & Gejala</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">a. Apa alasan utama kunjungan anda ke klinik gigi?</label>
                        <textarea 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                          value={anamnesis.dentalHistory.alasanKunjungan}
                          onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, alasanKunjungan: e.target.value}})}
                          placeholder="Berikan jawaban..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">b. Apakah yang ingin diketahui dari dalam rongga mulut anda saat ini?</label>
                        <div className="grid grid-cols-1 gap-2">
                          {['Kerusakan gigi', 'Penyakit pada gusi', 'Luka pada jaringan mulut', 'Kanker mulut'].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.inginDiketahui.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.inginDiketahui, item]
                                    : anamnesis.dentalHistory.inginDiketahui.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, inginDiketahui: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (diisi manual):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.inginDiketahuiLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, inginDiketahuiLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">c. Pernahkah dilakukan rontgen gigi dalam 2 tahun terakhir?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.rontgen2Tahun === null ? "" : anamnesis.dentalHistory.rontgen2Tahun ? "Ya" : "Tidak"}
                          onChange={e => {
                            const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                            setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, rontgen2Tahun: val}});
                          }}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                        {anamnesis.dentalHistory.rontgen2Tahun && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500">Rontgen gigi jenis apa?</label>
                            <input 
                              type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.rontgenType}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, rontgenType: e.target.value}})}
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">d. Pernahkah anda mengalami komplikasi atau pengalaman negatif terkait dengan perawatan gigi sebelumnya?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.komplikasiPerawatan === null ? "" : anamnesis.dentalHistory.komplikasiPerawatan ? "Ya" : "Tidak"}
                          onChange={e => {
                            const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                            setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, komplikasiPerawatan: val}});
                          }}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                        {anamnesis.dentalHistory.komplikasiPerawatan && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500">Jelaskan:</label>
                            <textarea 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                              value={anamnesis.dentalHistory.detailKomplikasi}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, detailKomplikasi: e.target.value}})}
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">e. Bagaimana pendapat anda tentang kunjungan gigi sebelumnya?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.pendapatKunjunganLalu}
                          onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, pendapatKunjunganLalu: e.target.value}})}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Sangat cemas/takut">Sangat cemas/takut</option>
                          <option value="Agak cemas/takut">Agak cemas/takut</option>
                          <option value="Tidak penting sama sekali">Tidak penting sama sekali</option>
                          <option value="Antusias menantikan kunjungan berikutnya">Antusias menantikan kunjungan berikutnya</option>
                        </select>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">f. Bagaimana pendapat anda tentang pernyataan ini? “kesehatan gigi dan mulut mempengaruhi kesehatan umum”?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.pendapatKesehatanUmum}
                          onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, pendapatKesehatanUmum: e.target.value}})}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Sangat setuju">Sangat setuju</option>
                          <option value="Setuju">Setuju</option>
                          <option value="Tidak setuju">Tidak setuju</option>
                          <option value="Sangat tidak setuju">Sangat tidak setuju</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">g. Apakah anda mengalami gejala berikut?</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {['Gigi Sensitif', 'Tambalan lepas', 'Sakit pada rahang', 'Mulut kering', 'Sakit gigi', 'Bau mulut', 'Sakit gusi', 'Sensasi terbakar', 'Gusi berdarah', 'Bengkak', 'Kesulitan mengunyah', 'Gusi menurun'].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.gejala.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.gejala, item]
                                    : anamnesis.dentalHistory.gejala.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, gejala: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.gejalaLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, gejalaLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="space-y-3">
                          <label className="block text-sm font-bold text-slate-700">h. Apakah gigi anda bergemeretak/bergesekan disiang atau di malam hari?</label>
                          <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.dentalHistory.gemeretakGigi === null ? "" : anamnesis.dentalHistory.gemeretakGigi ? "Ya" : "Tidak"}
                            onChange={e => {
                              const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                              setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, gemeretakGigi: val}});
                            }}
                          >
                            <option value="">Pilih Jawaban...</option>
                            <option value="Ya">Ya</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        </div>
                        {anamnesis.dentalHistory.gemeretakGigi && (
                          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                            <label className="block text-sm font-bold text-slate-700">Apakah anda mengenakan pelindung gigitan/bite guard?</label>
                            <select 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.biteGuard === null ? "" : anamnesis.dentalHistory.biteGuard ? "Ya" : "Tidak"}
                              onChange={e => {
                                const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                                setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, biteGuard: val}});
                              }}
                            >
                              <option value="">Pilih Jawaban...</option>
                              <option value="Ya">Ya</option>
                              <option value="Tidak">Tidak</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="space-y-3">
                          <label className="block text-sm font-bold text-slate-700">i. Dalam dua tahun terakhir apakah anda mencemaskan tentang aroma nafas/penampilan gigi/wajah anda?</label>
                          <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.dentalHistory.cemasAromaNafas === null ? "" : anamnesis.dentalHistory.cemasAromaNafas ? "Ya" : "Tidak"}
                            onChange={e => {
                              const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                              setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, cemasAromaNafas: val}});
                            }}
                          >
                            <option value="">Pilih Jawaban...</option>
                            <option value="Ya">Ya</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        </div>
                        {anamnesis.dentalHistory.cemasAromaNafas && (
                          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                            <label className="block text-sm font-bold text-slate-700">Apa saja yang anda anggap bermasalah?</label>
                            <div className="grid grid-cols-1 gap-2">
                              {['Gigi menguning atau berubah warna', 'Gigi berjejal/tidak beraturan', 'Jarak antara gigi/renggang', 'Profil wajah', 'Noda pada permukaan gigi', 'Masalah gusi'].map((item, index) => (
                                <label key={index} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                                  <input 
                                    type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                    checked={anamnesis.dentalHistory.masalahAromaNafas.includes(item as any)}
                                    onChange={e => {
                                      const next = e.target.checked 
                                        ? [...anamnesis.dentalHistory.masalahAromaNafas, item]
                                        : anamnesis.dentalHistory.masalahAromaNafas.filter(i => i !== item);
                                      setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, masalahAromaNafas: next as any}});
                                    }}
                                  />
                                  <span className="text-sm text-slate-700">{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">j. Pernahkah anda mengalami cedera pada gigi, wajah dan rahang anda?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.cederaGigi === null ? "" : anamnesis.dentalHistory.cederaGigi ? "Ya" : "Tidak"}
                          onChange={e => {
                            const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                            setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, cederaGigi: val}});
                          }}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                        {anamnesis.dentalHistory.cederaGigi && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500">Jelaskan:</label>
                            <textarea 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]"
                              value={anamnesis.dentalHistory.detailCedera}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, detailCedera: e.target.value}})}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">k. Apakah anda pernah mengalami/menggunakan hal-hal berikut ini?</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {['Karang gigi', 'Terapi radiasi pada kepala/leher', 'Perdarahan yang berkepanjangan setelah perawatan gigi', 'Pencabutan gigi', 'Gigi palsu', 'Operasi rahang', 'Perawatan saluran akar gigi', 'Rasa sakit pada leher dan kepala', 'Operasi gusi', 'Kawat gigi'].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.pengalamanLalu.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.pengalamanLalu, item]
                                    : anamnesis.dentalHistory.pengalamanLalu.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, pengalamanLalu: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lain-lain (tambahkan keterangan):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.pengalamanLaluLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, pengalamanLaluLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BAGIAN 2 */}
                <div className="space-y-6 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2">3. Dental History - BAG II: Pemeliharaan Mandiri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">a. Hal-hal berikut yang sering anda gunakan dirumah:</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {[
                            'Sikat gigi dengan bulu lunak', 'Sikat gigi dengan bulu sedang', 'Sikat gigi dengan bulu keras', 
                            'Karet pemijak gusi', 'Sikat khusus sela-sela gigi', 'Air minum berfluoride yang digunakan setiap hari', 
                            'Air minum berfluoride', 'Sikat gigi elektrik', 'Air dalam botol/kemasan', 'Tusuk gigi', 
                            'Alat irigasi mulut', 'Benang gigi bertangkai', 'Perekat gigi tiruan', 'Pembersih gigi tiruan', 
                            'Obat kumur', 'Benang gigi', 'Pemutih gigi', 'Sikat gigi khusus', 'Pasta/gel fluor', 
                            'Pasta gigi berfluoride', 'Fluor tetes/tablet'
                          ].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.homeCareTools.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.homeCareTools, item]
                                    : anamnesis.dentalHistory.homeCareTools.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, homeCareTools: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.homeCareToolsLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, homeCareToolsLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">b. Keunggulan pasta gigi yang anda gunakan:</label>
                        <div className="grid grid-cols-1 gap-2">
                          {['Berfluoride', 'Beraroma mint', 'Perlindungan gigi sensitif', 'Mengandung peroxida', 'Mengontrol karang gigi', 'Memiliki banyak manfaat', 'Mengandung baking soda'].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.toothpasteBenefits.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.toothpasteBenefits, item]
                                    : anamnesis.dentalHistory.toothpasteBenefits.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, toothpasteBenefits: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.toothpasteBenefitsLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, toothpasteBenefitsLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <label className="block text-sm font-bold text-slate-700">c. Berapa lama waktu yang dibutuhkan untuk pembersihan gigi dan gusi anda?</label>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Menyikat gigi:</label>
                            <select 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.cleaningTimeBrushing}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, cleaningTimeBrushing: e.target.value}})}
                            >
                              <option value="">Pilih Waktu...</option>
                              <option value="1 menit">1 menit</option>
                              <option value="2 menit">2 menit</option>
                              <option value="lebih dari 2 menit">lebih dari 2 menit</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Menggunakan benang gigi/flossing:</label>
                            <select 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.cleaningTimeFlossing}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, cleaningTimeFlossing: e.target.value}})}
                            >
                              <option value="">Pilih Waktu...</option>
                              <option value="1 menit">1 menit</option>
                              <option value="2 menit">2 menit</option>
                              <option value="lebih dari 2 menit">lebih dari 2 menit</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <label className="block text-sm font-bold text-slate-700">d. Berapa kali anda menyikat gigi/membersihkan menggunakan benang gigi?</label>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Menyikat gigi:</label>
                            <select 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.frequencyBrushing}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, frequencyBrushing: e.target.value}})}
                            >
                              <option value="">Pilih Frekuensi...</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="lebih dari 2">lebih dari 2</option>
                            </select>
                          </div>
                          {anamnesis.dentalHistory.frequencyBrushing && (
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Waktu menyikat gigi:</label>
                              <div className="grid grid-cols-1 gap-2">
                                {['Pagi hari', 'Pagi setelah sarapan', 'Saat mandi', 'Malam hari sebelum tidur', 'Setelah makan siang'].map((item, index) => (
                                  <label key={index} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                                    <input 
                                      type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                      checked={anamnesis.dentalHistory.brushingTimes.includes(item as any)}
                                      onChange={e => {
                                        const next = e.target.checked 
                                          ? [...anamnesis.dentalHistory.brushingTimes, item]
                                          : anamnesis.dentalHistory.brushingTimes.filter(i => i !== item);
                                        setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, brushingTimes: next as any}});
                                      }}
                                    />
                                    <span className="text-sm text-slate-700">{item}</span>
                                  </label>
                                ))}
                                <div className="mt-2">
                                  <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                                  <input 
                                    type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={anamnesis.dentalHistory.brushingTimesLainnya}
                                    onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, brushingTimesLainnya: e.target.value}})}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">e. Apakah anda merasa kesulitan mengatur jadwal menyikat/membersihkan gigi dan mulut karena kesibukan anda atau alasan lain?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.difficultyScheduling === null ? "" : anamnesis.dentalHistory.difficultyScheduling ? "Ya" : "Tidak"}
                          onChange={e => {
                            const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                            setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, difficultyScheduling: val}});
                          }}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="space-y-3">
                          <label className="block text-sm font-bold text-slate-700">f. Apakah ada kondisi yang membuat anda kesulitan memberihkan gigi?</label>
                          <select 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={anamnesis.dentalHistory.difficultyCleaningCondition === null ? "" : anamnesis.dentalHistory.difficultyCleaningCondition ? "Ya" : "Tidak"}
                            onChange={e => {
                              const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                              setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, difficultyCleaningCondition: val}});
                            }}
                          >
                            <option value="">Pilih Jawaban...</option>
                            <option value="Ya">Ya</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        </div>
                        {anamnesis.dentalHistory.difficultyCleaningCondition && (
                          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
                            <label className="block text-sm font-bold text-slate-700">Kondisi yang menyulitkan:</label>
                            <div className="grid grid-cols-1 gap-2">
                              {['Memegang sikat gigi', 'Menggunakan benang gigi', 'Memegang sikat gigi/benang gigi terlalu lama', 'Penglihatan yang buruk'].map((item, index) => (
                                <label key={index} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                                  <input 
                                    type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                    checked={anamnesis.dentalHistory.difficultyCleaningOptions.includes(item as any)}
                                    onChange={e => {
                                      const next = e.target.checked 
                                        ? [...anamnesis.dentalHistory.difficultyCleaningOptions, item]
                                        : anamnesis.dentalHistory.difficultyCleaningOptions.filter(i => i !== item);
                                      setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, difficultyCleaningOptions: next as any}});
                                    }}
                                  />
                                  <span className="text-sm text-slate-700">{item}</span>
                                </label>
                              ))}
                              <div className="mt-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                                <input 
                                  type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  value={anamnesis.dentalHistory.difficultyCleaningLainnya}
                                  onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, difficultyCleaningLainnya: e.target.value}})}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">g. Apakah anda rutin memeriksa setiap bulan untuk mengetahui adanya kanker mulut?</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          value={anamnesis.dentalHistory.monthlyOralCancerCheck === null ? "" : anamnesis.dentalHistory.monthlyOralCancerCheck ? "Ya" : "Tidak"}
                          onChange={e => {
                            const val = e.target.value === "Ya" ? true : e.target.value === "Tidak" ? false : null;
                            setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, monthlyOralCancerCheck: val}});
                          }}
                        >
                          <option value="">Pilih Jawaban...</option>
                          <option value="Ya">Ya</option>
                          <option value="Tidak">Tidak</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">h. Manakah kebiasan yang sering anda lakukan?</label>
                        <div className="grid grid-cols-1 gap-2">
                          {['Menggigit benda keras', 'Merokok'].map((item, index) => (
                            <label key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={anamnesis.dentalHistory.habits.includes(item as any)}
                                onChange={e => {
                                  const next = e.target.checked 
                                    ? [...anamnesis.dentalHistory.habits, item]
                                    : anamnesis.dentalHistory.habits.filter(i => i !== item);
                                  setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, habits: next as any}});
                                }}
                              />
                              <span className="text-sm text-slate-700">{item}</span>
                            </label>
                          ))}
                          <div className="mt-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Lainnya (tambahkan keterangan):</label>
                            <input 
                              type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              value={anamnesis.dentalHistory.habitsLainnya}
                              onChange={e => setAnamnesis({...anamnesis, dentalHistory: {...anamnesis.dentalHistory, habitsLainnya: e.target.value}})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BAGIAN III */}
                <div className="space-y-6 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2">3. Dental History - BAGIAN III: Cemilan Diantara Waktu Makan</h3>
                  <p className="text-sm text-slate-500">Silahkan pilih pada cemilan yang mengandung gula/karbohidrat yang sering anda makan diantara waktu makan:</p>
                  <div className="space-y-4">
                    {anamnesis.cemilan.map((item, index) => (
                      <div key={item.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500"
                              checked={item.selected}
                              onChange={e => {
                                const nextCemilan = [...anamnesis.cemilan];
                                nextCemilan[index].selected = e.target.checked;
                                setAnamnesis({...anamnesis, cemilan: nextCemilan});
                              }}
                            />
                            <span className="text-sm font-bold text-slate-700">{item.name}</span>
                          </label>
                        </div>
                        {item.selected && (
                          <div className="space-y-4 pl-7">
                            {item.name === 'Lainnya' && (
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan:</label>
                                <input 
                                  type="text" placeholder="Sebutkan cemilan lainnya..."
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  value={item.detail}
                                  onChange={e => {
                                    const nextCemilan = [...anamnesis.cemilan];
                                    nextCemilan[index].detail = e.target.value;
                                    setAnamnesis({...anamnesis, cemilan: nextCemilan});
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Frekuensi:</label>
                              <input 
                                type="text" placeholder="Contoh: 2x sehari, sesekali..."
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={item.frequency}
                                onChange={e => {
                                  const nextCemilan = [...anamnesis.cemilan];
                                  nextCemilan[index].frequency = e.target.value;
                                  setAnamnesis({...anamnesis, cemilan: nextCemilan});
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* BAGIAN IV */}
                <div className="space-y-6 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 border-b pb-2">3. Dental History - BAGIAN IV: Keyakinan Tentang Kesehatan Gigi</h3>
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">a. Jika dibandingkan dengan orang pada umumnya, menurut ada bagaimana kemungkinan anda memiliki gigi berlubang atau masalah gigi dan atau gusi anda?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.keyakinan.kemungkinanBerlubang}
                        onChange={e => setAnamnesis({...anamnesis, keyakinan: {...anamnesis.keyakinan, kemungkinanBerlubang: e.target.value}})}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Jauh diatas rata-rata">Jauh diatas rata-rata</option>
                        <option value="Sedikit diatas rata-rata">Sedikit diatas rata-rata</option>
                        <option value="Sama seperti umumnya">Sama seperti umumnya</option>
                        <option value="Sedikit dibawah rata-rata">Sedikit dibawah rata-rata</option>
                        <option value="Jauh dibawah rata-rata">Jauh dibawah rata-rata</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">b. Seberapa pentingkah bagi anda mencegah masalah rongga mulut, gusi atau penyakit gigi dan mulut?</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.keyakinan.pentingnyaPencegahan}
                        onChange={e => setAnamnesis({...anamnesis, keyakinan: {...anamnesis.keyakinan, pentingnyaPencegahan: e.target.value}})}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Sangat penting">Sangat penting</option>
                        <option value="Tidak terlalu penting">Tidak terlalu penting</option>
                        <option value="Tidak penting">Tidak penting</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">c. Saya percaya bahwa saya dapat menjaga kesehatan gigi dan mulut saya.</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" name="percayaBisaMenjaga" className="w-4 h-4 text-blue-600"
                            checked={anamnesis.keyakinan.percayaBisaMenjaga === true}
                            onChange={() => setAnamnesis({...anamnesis, keyakinan: {...anamnesis.keyakinan, percayaBisaMenjaga: true}})}
                          />
                          <span className="text-sm">Ya</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" name="percayaBisaMenjaga" className="w-4 h-4 text-blue-600"
                            checked={anamnesis.keyakinan.percayaBisaMenjaga === false}
                            onChange={() => setAnamnesis({...anamnesis, keyakinan: {...anamnesis.keyakinan, percayaBisaMenjaga: false}})}
                          />
                          <span className="text-sm">Tidak</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <label className="block text-sm font-bold text-slate-700">d. Saya percaya bahwa kesehatan gigi dan mulut saya saat ini adalah:</label>
                      <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={anamnesis.keyakinan.percayaKesehatanGigi}
                        onChange={e => setAnamnesis({...anamnesis, keyakinan: {...anamnesis.keyakinan, percayaKesehatanGigi: e.target.value}})}
                      >
                        <option value="">Pilih Jawaban...</option>
                        <option value="Baik sekali">Baik sekali</option>
                        <option value="Baik">Baik</option>
                        <option value="Cukup">Cukup</option>
                        <option value="Buruk">Buruk</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { 
                  if(confirm('Batalkan perubahan anamnesis?')) { 
                    setAnamnesis({
                      medicalHistory: { sehat: true, penyakitSerius: false, detailPenyakitSerius: '', kelainanDarah: false, detailKelainanDarah: '', alergi: { hasAlergi: false, makanan: '', obatObatan: '', obatBius: '', cuaca: '', lainLain: '' }, hasLainLain: false, detailLainLain: '' },
                      socialHistory: '',
                      dentalHistory: { alasanKunjungan: '', inginDiketahui: [], inginDiketahuiLainnya: '', rontgen2Tahun: false, rontgenType: '', komplikasiPerawatan: false, detailKomplikasi: '', pendapatKunjunganLalu: '', pendapatKesehatanUmum: '', gejala: [], gejalaLainnya: '', gemeretakGigi: false, biteGuard: false, cemasAromaNafas: false, masalahAromaNafas: [], cederaGigi: false, detailCedera: '', pengalamanLalu: [], pengalamanLaluLainnya: '', homeCareTools: [], homeCareToolsLainnya: '', toothpasteBenefits: [], toothpasteBenefitsLainnya: '', cleaningTimeBrushing: '', cleaningTimeFlossing: '', frequencyBrushing: '', frequencyFlossing: '', brushingTimes: [], brushingTimesLainnya: '', difficultyScheduling: null, difficultyCleaningCondition: null, difficultyCleaningOptions: [], difficultyCleaningLainnya: '', monthlyOralCancerCheck: null, habits: [], habitsLainnya: '' },
                      vitalSigns: { tensi: '', suhu: '', tb: '', bb: '', hr: '', rr: '' },
                      cemilan: [ { name: 'Permen Mint', selected: false, frequency: '' }, { name: 'Minuman Manis', selected: false, frequency: '' }, { name: 'Buah Kering', selected: false, frequency: '' }, { name: 'Minuman Kaleng/Botol', selected: false, frequency: '' }, { name: 'Permen Karet', selected: false, frequency: '' }, { name: 'Kerupuk', selected: false, frequency: '' }, { name: 'Obat Syrup', selected: false, frequency: '' }, { name: 'Keripik', selected: false, frequency: '' }, { name: 'Kue Kering', selected: false, frequency: '' }, { name: 'Lainnya', selected: false, frequency: '', detail: '' } ],
                      keyakinan: { kemungkinanBerlubang: '', pentingnyaPencegahan: '', percayaBisaMenjaga: null, percayaKesehatanGigi: '' },
                      pharmacological: { konsumsiObat: null, detailObat: '', untukApa: '', efekSamping: '', pengaruhPositif: '', masalahDosis: null, detailDosis: '', konsumsiTeratur: null }
                    });
                    setAnamnesisSubTab('medical'); 
                  } 
                }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Reset Tab
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
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {[
                { id: 'ohis', label: 'OHI-S' },
                { id: 'plaque', label: 'Plaque Control' },
                { id: 'odontogram', label: 'Odontogram' },
                { id: 'periodontal', label: 'Periodontal' }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setClinicalSubTab(sub.id as any)}
                  className={cn(
                    "tab-button px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                    clinicalSubTab === sub.id 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                      : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {clinicalSubTab === 'ohis' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-slate-900">OHI-S (Oral Hygiene Index Simplified)</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                    <SettingsIcon size={14} />
                    <span>Pengaturan Gigi Index</span>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-2">Index</th>
                        {clinical.ohis.gigiIndex.map((gigi, i) => (
                          <th key={i} className="p-2">
                            <input 
                              type="number"
                              className="w-12 p-1 text-center bg-white border border-slate-200 rounded-lg text-sm font-black text-blue-600"
                              value={gigi}
                              onChange={e => {
                                const next = [...clinical.ohis.gigiIndex];
                                next[i] = parseInt(e.target.value) || 0;
                                setClinical({...clinical, ohis: {...clinical.ohis, gigiIndex: next}});
                              }}
                            />
                          </th>
                        ))}
                        <th className="p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 text-xs font-bold text-slate-700">Debris Index</td>
                        {clinical.ohis.debrisIndex.map((val, i) => (
                          <td key={i} className="p-2">
                            <input 
                              type="number" min="0" max="3"
                              className="w-12 p-1 text-center bg-white border border-slate-200 rounded-lg text-sm"
                              value={val}
                              onChange={e => {
                                const next = [...clinical.ohis.debrisIndex];
                                next[i] = parseInt(e.target.value) || 0;
                                setClinical({...clinical, ohis: {...clinical.ohis, debrisIndex: next}});
                              }}
                            />
                          </td>
                        ))}
                        <td className="p-2 font-bold text-blue-600">{(clinical.ohis.debrisIndex.reduce((a, b) => a + b, 0) / 6).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-xs font-bold text-slate-700">Calculus Index</td>
                        {clinical.ohis.calculusIndex.map((val, i) => (
                          <td key={i} className="p-2">
                            <input 
                              type="number" min="0" max="3"
                              className="w-12 p-1 text-center bg-white border border-slate-200 rounded-lg text-sm"
                              value={val}
                              onChange={e => {
                                const next = [...clinical.ohis.calculusIndex];
                                next[i] = parseInt(e.target.value) || 0;
                                setClinical({...clinical, ohis: {...clinical.ohis, calculusIndex: next}});
                              }}
                            />
                          </td>
                        ))}
                        <td className="p-2 font-bold text-blue-600">{(clinical.ohis.calculusIndex.reduce((a, b) => a + b, 0) / 6).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between p-6 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <div>
                    <h4 className="text-sm font-bold opacity-80">Skor OHI-S Akhir</h4>
                    <p className="text-3xl font-black">
                      {((clinical.ohis.debrisIndex.reduce((a, b) => a + b, 0) / 6) + (clinical.ohis.calculusIndex.reduce((a, b) => a + b, 0) / 6)).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-bold opacity-80">Kategori</h4>
                    <p className="text-xl font-bold">
                      {(() => {
                        const score = (clinical.ohis.debrisIndex.reduce((a, b) => a + b, 0) / 6) + (clinical.ohis.calculusIndex.reduce((a, b) => a + b, 0) / 6);
                        if (score <= 1.2) return 'Baik';
                        if (score <= 3.0) return 'Sedang';
                        return 'Buruk';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {clinicalSubTab === 'plaque' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900">Pemeriksaan Hasil Menyikat Gigi Sendiri (Plaque Control)</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase">Skor Plak</span>
                      <p className={cn(
                        "text-2xl font-black",
                        (() => {
                          const entries = Object.values(clinical.plaqueControl.data).filter(t => !t.excluded);
                          const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
                          const totalCount = entries.length * 4;
                          const score = totalCount > 0 ? (plaqueCount / totalCount) * 100 : 0;
                          return score >= 15 ? "text-red-600" : "text-green-600";
                        })()
                      )}>
                        {(() => {
                          const entries = Object.values(clinical.plaqueControl.data).filter(t => !t.excluded);
                          const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
                          const totalCount = entries.length * 4;
                          return totalCount > 0 ? ((plaqueCount / totalCount) * 100).toFixed(1) : "0.0";
                        })()}%
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Kategori</span>
                      <span className="text-sm font-bold text-slate-700">
                        {(() => {
                          const entries = Object.values(clinical.plaqueControl.data).filter(t => !t.excluded);
                          const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
                          const totalCount = entries.length * 4;
                          const score = totalCount > 0 ? (plaqueCount / totalCount) * 100 : 0;
                          return score < 15 ? "Baik" : "Buruk";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 overflow-x-auto pb-4 custom-scrollbar">
                  {/* Upper Teeth */}
                  <div className="space-y-4 min-w-[800px]">
                    <div className="flex justify-center gap-2">
                      {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(id => (
                        <PlaqueTooth 
                          key={id} toothId={id} 
                          data={clinical.plaqueControl.data[id]} 
                          onChange={surfaces => setClinical({...clinical, plaqueControl: {...clinical.plaqueControl, data: {...clinical.plaqueControl.data, [id]: surfaces}}})} 
                        />
                      ))}
                    </div>
                    <div className="flex justify-center gap-2">
                      {[55, 54, 53, 52, 51, 61, 62, 63, 64, 65].map(id => (
                        <PlaqueTooth 
                          key={id} toothId={id} 
                          data={clinical.plaqueControl.data[id]} 
                          onChange={surfaces => setClinical({...clinical, plaqueControl: {...clinical.plaqueControl, data: {...clinical.plaqueControl.data, [id]: surfaces}}})} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 w-full min-w-[800px]" />

                  {/* Lower Teeth */}
                  <div className="space-y-4 min-w-[800px]">
                    <div className="flex justify-center gap-2">
                      {[85, 84, 83, 82, 81, 71, 72, 73, 74, 75].map(id => (
                        <PlaqueTooth 
                          key={id} toothId={id} 
                          data={clinical.plaqueControl.data[id]} 
                          onChange={surfaces => setClinical({...clinical, plaqueControl: {...clinical.plaqueControl, data: {...clinical.plaqueControl.data, [id]: surfaces}}})} 
                        />
                      ))}
                    </div>
                    <div className="flex justify-center gap-2">
                      {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(id => (
                        <PlaqueTooth 
                          key={id} toothId={id} 
                          data={clinical.plaqueControl.data[id]} 
                          onChange={surfaces => setClinical({...clinical, plaqueControl: {...clinical.plaqueControl, data: {...clinical.plaqueControl.data, [id]: surfaces}}})} 
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">Kalkulasi Skor Plak:</h4>
                  <div className="flex flex-wrap gap-8 items-center text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">Jumlah Permukaan Ada Plak</span>
                      <span className="text-lg font-bold text-slate-700">
                        {Object.values(clinical.plaqueControl.data).filter(t => !t.excluded).reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">Jumlah Permukaan Diperiksa</span>
                      <span className="text-lg font-bold text-slate-700">
                        {Object.values(clinical.plaqueControl.data).filter(t => !t.excluded).length * 4}
                      </span>
                    </div>
                    <div className="text-slate-300 text-2xl">/</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">Total Permukaan Diperiksa</span>
                      <span className="text-lg font-bold text-slate-700">{Object.keys(clinical.plaqueControl.data).length * 4}</span>
                    </div>
                    <div className="text-slate-300 text-2xl">×</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">Multiplier</span>
                      <span className="text-lg font-bold text-slate-700">100%</span>
                    </div>
                    <div className="text-slate-300 text-2xl">=</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase">Hasil</span>
                      <span className="text-xl font-black text-blue-600">
                        {(() => {
                          const entries = Object.values(clinical.plaqueControl.data);
                          const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
                          const totalCount = entries.length * 4;
                          return totalCount > 0 ? ((plaqueCount / totalCount) * 100).toFixed(1) : "0.0";
                        })()}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500 italic">* Kategori: &lt; 15% = Baik, ≥ 15% = Buruk</p>
                </div>
              </div>
            )}

            {clinicalSubTab === 'odontogram' && (
              <div className="space-y-8">
                <div className="flex flex-wrap justify-center items-center gap-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="togglePrimary"
                      checked={showPrimaryTeeth}
                      onChange={(e) => setShowPrimaryTeeth(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="togglePrimary" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer">Tampilkan Gigi Susu</label>
                  </div>
                  <div className="h-8 w-px bg-slate-100 mx-2" />
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
                    {showPrimaryTeeth && (
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Atas (Anak)</span>
                        <div className="flex gap-2">
                          {CHILD_TEETH_TOP.map(id => (
                            <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="w-full h-px bg-slate-100 relative">
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Garis Median</div>
                    </div>

                    {/* Lower Child */}
                    {showPrimaryTeeth && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-2">
                          {CHILD_TEETH_BOTTOM.map(id => (
                            <Tooth key={id} id={id} data={toothData[id]} onSurfaceClick={handleSurfaceClick} />
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Rahang Bawah (Anak)</span>
                      </div>
                    )}

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
                    <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        ...ADULT_TEETH_TOP.slice(0, 8), 
                        ...ADULT_TEETH_BOTTOM.slice(8),
                        ...(showPrimaryTeeth ? [...CHILD_TEETH_TOP.slice(0, 5), ...CHILD_TEETH_BOTTOM.slice(5)] : [])
                      ].sort((a, b) => a - b).map(id => (
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
                    <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        ...ADULT_TEETH_TOP.slice(8), 
                        ...ADULT_TEETH_BOTTOM.slice(0, 8),
                        ...(showPrimaryTeeth ? [...CHILD_TEETH_TOP.slice(5), ...CHILD_TEETH_BOTTOM.slice(0, 5)] : [])
                      ].sort((a, b) => a - b).map(id => (
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
              </div>
            )}

            {clinicalSubTab === 'periodontal' && (
              <div className="space-y-8">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Periodontal, Kalkulus & Extrinsic Stains</h3>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto custom-scrollbar">
                  <table className="w-full text-center border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="p-3 text-left sticky left-0 bg-slate-50 z-10 w-48">Pemeriksaan</th>
                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(id => (
                          <th key={id} className="p-3 border-l border-slate-100">{id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: 'Bleeding on probing', key: 'bleeding' },
                        { label: 'Attachment loss > 1mm', key: 'attachmentLoss' },
                        { label: 'Pocket > 4mm', key: 'pocket' },
                        { label: 'Extrinsic Stains', key: 'stains' }
                      ].map(row => (
                        <tr key={row.key} className="hover:bg-slate-50 transition-all">
                          <td className="p-3 text-xs font-bold text-slate-700 text-left sticky left-0 bg-white z-10 border-r border-slate-100">{row.label}</td>
                          {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(id => (
                            <td key={id} className="p-3 border-l border-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={clinical.periodontal.data[id]?.[row.key as keyof typeof clinical.periodontal.data[number]] as boolean || false}
                                onChange={e => {
                                  const current = clinical.periodontal.data[id] || { bleeding: false, attachmentLoss: false, pocket: false, stains: false, calculus: 0 };
                                  setClinical({...clinical, periodontal: {...clinical.periodontal, data: {...clinical.periodontal.data, [id]: {...current, [row.key]: e.target.checked}}}});
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="hover:bg-slate-50 transition-all">
                        <td className="p-3 text-xs font-bold text-slate-700 text-left sticky left-0 bg-white z-10 border-r border-slate-100">Skor Kalkulus (0-3)</td>
                        {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(id => (
                          <td key={id} className="p-3 border-l border-slate-100">
                            <input 
                              type="number" min="0" max="3"
                              className="w-10 p-1 text-center bg-slate-50 border border-slate-200 rounded text-xs"
                              value={clinical.periodontal.data[id]?.calculus || 0}
                              onChange={e => {
                                const current = clinical.periodontal.data[id] || { bleeding: false, attachmentLoss: false, pocket: false, stains: false, calculus: 0 };
                                setClinical({...clinical, periodontal: {...clinical.periodontal, data: {...clinical.periodontal.data, [id]: {...current, calculus: parseInt(e.target.value) || 0}}}});
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto custom-scrollbar">
                  <table className="w-full text-center border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="p-3 text-left sticky left-0 bg-slate-50 z-10 w-48">Pemeriksaan (Lower)</th>
                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(id => (
                          <th key={id} className="p-3 border-l border-slate-100">{id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: 'Bleeding on probing', key: 'bleeding' },
                        { label: 'Attachment loss > 1mm', key: 'attachmentLoss' },
                        { label: 'Pocket > 4mm', key: 'pocket' },
                        { label: 'Extrinsic Stains', key: 'stains' }
                      ].map(row => (
                        <tr key={row.key} className="hover:bg-slate-50 transition-all">
                          <td className="p-3 text-xs font-bold text-slate-700 text-left sticky left-0 bg-white z-10 border-r border-slate-100">{row.label}</td>
                          {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(id => (
                            <td key={id} className="p-3 border-l border-slate-100">
                              <input 
                                type="checkbox" className="w-4 h-4 rounded text-blue-600"
                                checked={clinical.periodontal.data[id]?.[row.key as keyof typeof clinical.periodontal.data[number]] as boolean || false}
                                onChange={e => {
                                  const current = clinical.periodontal.data[id] || { bleeding: false, attachmentLoss: false, pocket: false, stains: false, calculus: 0 };
                                  setClinical({...clinical, periodontal: {...clinical.periodontal, data: {...clinical.periodontal.data, [id]: {...current, [row.key]: e.target.checked}}}});
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="hover:bg-slate-50 transition-all">
                        <td className="p-3 text-xs font-bold text-slate-700 text-left sticky left-0 bg-white z-10 border-r border-slate-100">Skor Kalkulus (0-3)</td>
                        {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(id => (
                          <td key={id} className="p-3 border-l border-slate-100">
                            <input 
                              type="number" min="0" max="3"
                              className="w-10 p-1 text-center bg-slate-50 border border-slate-200 rounded text-xs"
                              value={clinical.periodontal.data[id]?.calculus || 0}
                              onChange={e => {
                                const current = clinical.periodontal.data[id] || { bleeding: false, attachmentLoss: false, pocket: false, stains: false, calculus: 0 };
                                setClinical({...clinical, periodontal: {...clinical.periodontal, data: {...clinical.periodontal.data, [id]: {...current, calculus: parseInt(e.target.value) || 0}}}});
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="p-6 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100 min-w-[200px]">
                    <h4 className="text-sm font-bold opacity-80 uppercase tracking-wider">Jumlah Skor Kalkulus</h4>
                    <p className="text-3xl font-black">
                      {Object.values(clinical.periodontal.data).reduce((acc, curr) => acc + (curr.calculus || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { 
                  if(confirm('Batalkan perubahan pemeriksaan klinis?')) { 
                    setClinical({
                      ekstraOral: { skinFace: 'Normal', skinNeck: 'Normal', vermilionBorders: 'Normal', parotidGlands: 'Normal', lymphNodes: { anteriorCervical: 'Normal', posteriorCervical: 'Normal', submental: 'Normal', submandibular: 'Normal', supraclavicular: 'Normal' }, tmj: 'Normal', wajah: 'Simetris', notes: '' },
                      intraOral: { 
                        labialMucosa: 'Normal', labialVestibules: 'Normal', anteriorGingivae: 'Normal', buccalVestibules: 'Normal', buccalGingivae: 'Normal', 
                        tongueDorsal: 'Normal', tongueVentral: 'Normal', tongueLateral: 'Normal', lingualTonsils: 'Normal', floorOfMouth: 'Normal', 
                        lingualGingivae: 'Normal', tonsillarPillars: 'Normal', pharyngealWall: 'Normal', softPalate: 'Normal', uvula: 'Normal', 
                        hardPalate: 'Normal', palatalGingivae: 'Normal', submandibularGlands: 'Normal', notes: '' 
                      },
                      ohis: { gigiIndex: [16, 11, 26, 36, 31, 46], debrisIndex: [0, 0, 0, 0, 0, 0], calculusIndex: [0, 0, 0, 0, 0, 0] },
                      plaqueControl: { data: {}, score: 0, kategori: '' },
                      periodontal: { data: {}, jumlahSkor: 0 }
                    });
                    setClinicalSubTab('ohis'); 
                  } 
                }}
                className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Reset Tab
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



        {activeTab === 'diagnosis' && (
          <div className="space-y-8">
            {history.length > 0 && (
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <History size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Diagnosa Kunjungan Sebelumnya ({new Date(history[0].date).toLocaleDateString('id-ID')})</h4>
                    <p className="text-[10px] text-amber-500 font-medium tracking-wider uppercase">Referensi untuk evaluasi perkembangan</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-white rounded-xl border border-amber-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Kebutuhan Tidak Terpenuhi</p>
                    <p className="text-slate-700">{history[0].diagnosis.unmetNeeds || '-'}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rekomendasi Sebelumnya</p>
                    <p className="text-slate-700">{history[0].diagnosis.nextTreatmentRecommendation || '-'}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Diagnosa Terapis Gigi & Mulut (8 Kebutuhan Manusia)</h3>
                <button 
                  onClick={() => setShowDiagnosisGuidelines(!showDiagnosisGuidelines)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                >
                  <BookOpen size={14} />
                  {showDiagnosisGuidelines ? 'Tutup Pedoman' : 'Lihat Pedoman Diagnosa'}
                </button>
              </div>

              {showDiagnosisGuidelines && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
                >
                  {Object.entries(HUMAN_NEEDS_GUIDELINES).map(([key, value]) => (
                    <div key={key} className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <h5 className="text-[10px] font-black text-blue-700 uppercase mb-1">{value.title}</h5>
                      <p className="text-[10px] text-slate-600 leading-relaxed">{value.guideline}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'perlindunganResiko', label: '1) Perlindungan dari Resiko Kesehatan' },
                  { id: 'bebasKetakutan', label: '2) Bebas dari Ketakutan/Stress' },
                  { id: 'kesanWajahSehat', label: '3) Kesan Wajah yang Sehat' },
                  { id: 'keutuhanMukosa', label: '4) Keutuhan Kulit & Membran Mukosa (Leher & Kepala)' },
                  { id: 'kondisiBiologis', label: '5) Kondisi Biologis & Fungsi Gigi Geligi yang Baik' },
                  { id: 'konseptualisasi', label: '6) Konseptualisasi & Pemecahan Masalah' },
                  { id: 'bebasNyeri', label: '7) Bebas dari Nyeri pada Kepala & Leher' },
                  { id: 'tanggungJawab', label: '8) Tanggung Jawab terhadap Kesehatan Gigi & Mulut' }
                ].map((need) => (
                  <div key={need.id} className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{need.label}</label>
                    <textarea 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[60px] text-sm"
                      value={(dentalHygieneDiagnosis.categories as any)[need.id]}
                      onChange={e => setDentalHygieneDiagnosis({
                        ...dentalHygieneDiagnosis, 
                        categories: { ...dentalHygieneDiagnosis.categories, [need.id]: e.target.value }
                      })}
                      placeholder="Catatan diagnosa..."
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Diagnosis Askesgilut (Dental Hygiene Diagnosis)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kebutuhan yang tidak terpenuhi</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.unmetNeeds}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, unmetNeeds: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Penyebab</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.cause}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, cause: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanda-tanda dan gejala</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.signsSymptoms}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, signsSymptoms: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tujuan Yang Berpusat Pada Klien</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.clientGoals}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, clientGoals: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Intervensi Askesgilut</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.interventions}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, interventions: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pernyataan Evaluativ</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.evaluativeStatement}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, evaluativeStatement: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Rekomendasi Perawatan Selanjutnya</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] text-sm"
                    value={dentalHygieneDiagnosis.nextTreatmentRecommendation}
                    onChange={e => setDentalHygieneDiagnosis({...dentalHygieneDiagnosis, nextTreatmentRecommendation: e.target.value})}
                    placeholder="Contoh: Kontrol 6 bulan lagi, Rujuk ke spesialis..."
                  />
                </div>
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
                onClick={() => { 
                  if(confirm('Batalkan perubahan diagnosa?')) { 
                    setSelectedNeeds([]); 
                    setDentalHygieneDiagnosis({
                      categories: { perlindunganResiko: '', bebasKetakutan: '', kesanWajahSehat: '', keutuhanMukosa: '', kondisiBiologis: '', konseptualisasi: '', bebasNyeri: '', tanggungJawab: '' },
                      unmetNeeds: '', cause: '', signsSymptoms: '', clientGoals: '', interventions: '', evaluativeStatement: '', nextTreatmentRecommendation: ''
                    });
                  } 
                }}
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



        {activeTab === 'evaluation' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Evaluasi & Perkembangan Pasien</h3>
              <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-100"
              >
                {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Activity size={18} />}
                Analisis Perkembangan AI
              </button>
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <History size={16} />
                      Kunjungan Awal ({new Date(history[history.length - 1].date).toLocaleDateString('id-ID')})
                    </h4>
                    <div className="space-y-4 text-sm">
                      <p><span className="font-bold text-blue-700">Diagnosa:</span> {history[history.length - 1].diagnosis.unmetNeeds || '-'}</p>
                      <p><span className="font-bold text-blue-700">Tindakan:</span> {history[history.length - 1].treatment.map((id: string) => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') || '-'}</p>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-2 bg-white rounded-lg border border-blue-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Tensi</p>
                          <p className="font-black text-blue-600">{history[history.length - 1].vitalSigns.tensi || '-'}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-blue-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Suhu</p>
                          <p className="font-black text-blue-600">{history[history.length - 1].vitalSigns.suhu || '-'}°C</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-blue-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">BB</p>
                          <p className="font-black text-blue-600">{history[history.length - 1].vitalSigns.bb || '-'}kg</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Kunjungan Terakhir ({new Date().toLocaleDateString('id-ID')})
                    </h4>
                    <div className="space-y-4 text-sm">
                      <p><span className="font-bold text-emerald-700">Diagnosa Saat Ini:</span> {dentalHygieneDiagnosis.unmetNeeds || '-'}</p>
                      <p><span className="font-bold text-emerald-700">Tindakan Direncanakan:</span> {selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') || '-'}</p>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-2 bg-white rounded-lg border border-emerald-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Tensi</p>
                          <p className="font-black text-emerald-600">{anamnesis.vitalSigns.tensi || '-'}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-emerald-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Suhu</p>
                          <p className="font-black text-emerald-600">{anamnesis.vitalSigns.suhu || '-'}°C</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-emerald-100 text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">BB</p>
                          <p className="font-black text-emerald-600">{anamnesis.vitalSigns.bb || '-'}kg</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 min-h-[400px]">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                      <Activity size={18} className="text-purple-600" />
                      Hasil Analisis AI & Evaluasi Terperinci
                    </h4>
                    {aiAnalysis ? (
                      <div className="prose prose-sm max-w-none prose-slate">
                        <Markdown>{aiAnalysis}</Markdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
                          <Activity size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">Klik tombol "Analisis Perkembangan AI" untuk mendapatkan evaluasi mendalam.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-bold">Belum ada riwayat kunjungan untuk dibandingkan.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatment' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tindakan & Biaya (Perda No. 10/2023)</h3>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Total Estimasi</p>
                <p className="text-2xl font-black text-blue-600">
                  Rp {selectedPatient.insurance === 'BPJS' ? '0 (BPJS)' : selectedTreatments.reduce((sum, id) => sum + (TREATMENTS_2023.find(t => t.id === id)?.price || 0), 0).toLocaleString('id-ID')}
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
                  <p className="font-black text-blue-600">
                    {selectedPatient.insurance === 'BPJS' ? 'Gratis (BPJS)' : `Rp ${t.price.toLocaleString('id-ID')}`}
                  </p>
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
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 text-center">Persetujuan Tindakan Medik (Informed Consent)</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 italic">
                "Saya yang bertanda tangan di bawah ini menyatakan setuju untuk dilakukan tindakan medik dental sesuai dengan penjelasan yang telah diberikan oleh tenaga medis. Saya memahami risiko dan manfaat dari tindakan tersebut."
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">Dokter Gigi</p>
                <select 
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm mb-2 print:appearance-none print:border-none print:bg-transparent print:p-0 print:text-center print:font-bold"
                  value={consent.dentistName}
                  onChange={e => setConsent({...consent, dentistName: e.target.value})}
                >
                  <option value="">Pilih Dokter Gigi</option>
                  {users.filter(u => u.role === 'Dokter Gigi' || u.role === 'Admin').map(u => (
                    <option key={u.uid || u.name} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-32 shadow-sm print:border-none print:shadow-none">
                  <SignatureCanvas 
                    ref={sigDentist}
                    penColor="navy"
                    canvasProps={{ className: "w-full h-full" }}
                  />
                </div>
                <button 
                  onClick={() => sigDentist.current?.clear()}
                  className="w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                >
                  Hapus
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">Terapis Gigi</p>
                <select 
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm mb-2 print:appearance-none print:border-none print:bg-transparent print:p-0 print:text-center print:font-bold"
                  value={consent.therapistName}
                  onChange={e => setConsent({...consent, therapistName: e.target.value})}
                >
                  <option value="">Pilih Terapis Gigi</option>
                  {users.filter(u => u.role === 'Terapis Gigi dan Mulut' || u.role === 'Admin').map(u => (
                    <option key={u.uid || u.name} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-32 shadow-sm print:border-none print:shadow-none">
                  <SignatureCanvas 
                    ref={sigTherapist}
                    penColor="navy"
                    canvasProps={{ className: "w-full h-full" }}
                  />
                </div>
                <button 
                  onClick={() => sigTherapist.current?.clear()}
                  className="w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                >
                  Hapus
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">Pasien</p>
                <input 
                  type="text" placeholder="Nama Pasien"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm mb-2 print:border-none print:bg-transparent print:p-0 print:text-center print:font-bold"
                  value={consent.patientName}
                  onChange={e => setConsent({...consent, patientName: e.target.value})}
                />
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-32 shadow-sm print:border-none print:shadow-none">
                  <SignatureCanvas 
                    ref={sigPatient}
                    penColor="navy"
                    canvasProps={{ className: "w-full h-full" }}
                  />
                </div>
                <button 
                  onClick={() => sigPatient.current?.clear()}
                  className="w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                >
                  Hapus
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">Orang Tua/Wali</p>
                <input 
                  type="text" placeholder="Nama Orang Tua/Wali"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm mb-2 print:border-none print:bg-transparent print:p-0 print:text-center print:font-bold"
                  value={consent.guardianName}
                  onChange={e => setConsent({...consent, guardianName: e.target.value})}
                />
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-32 shadow-sm print:border-none print:shadow-none">
                  <SignatureCanvas 
                    ref={sigGuardian}
                    penColor="navy"
                    canvasProps={{ className: "w-full h-full" }}
                  />
                </div>
                <button 
                  onClick={() => sigGuardian.current?.clear()}
                  className="w-full py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                >
                  Hapus
                </button>
              </div>
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

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Nama Pasien:</span><br/><span className="font-bold">{selectedPatient.name}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">No. RM:</span><br/><span className="font-bold">{selectedPatient.mrNumber}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Usia / Gender:</span><br/><span className="font-bold">{calculateAge(selectedPatient.birthDate)} Thn / {selectedPatient.gender}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Gol. Darah:</span><br/><span className="font-bold">{selectedPatient.bloodType || '-'}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Tanggal:</span><br/><span className="font-bold">{new Date().toLocaleDateString('id-ID')}</span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">OHI-S:</span><br/><span className="font-bold">{calculateOHIS()}</span></p>
                </div>
                <div className="space-y-2">
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Plaque Score:</span><br/><span className="font-bold">
                    {(() => {
                      const entries = Object.values(clinical.plaqueControl.data);
                      const plaqueCount = entries.reduce((acc, curr) => acc + (curr.buccal ? 1 : 0) + (curr.lingual ? 1 : 0) + (curr.mesial ? 1 : 0) + (curr.distal ? 1 : 0), 0);
                      const totalCount = entries.length * 4;
                      return totalCount > 0 ? ((plaqueCount / totalCount) * 100).toFixed(1) : "0.0";
                    })()}%
                  </span></p>
                  <p><span className="font-bold text-slate-400 uppercase text-[10px]">Jenis Pembayaran:</span><br/><span className="font-bold">{selectedPatient.insurance}</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase text-xs">Ringkasan Pemeriksaan</h4>
                <div className="grid grid-cols-1 gap-4 text-sm bg-slate-50 p-4 rounded-2xl">
                  <p><span className="font-bold">Keluhan:</span> {anamnesis.dentalHistory.alasanKunjungan || '-'}</p>
                  <p><span className="font-bold">Diagnosa:</span> {selectedNeeds.join(', ') || '-'}</p>
                  <p><span className="font-bold">Tindakan:</span> {selectedTreatments.map(id => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') || '-'}</p>
                </div>
              </div>

              <div className="flex justify-between items-end pt-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-12">Dokter Gigi yang Melakukan Pemeriksaan</p>
                  <p className="font-bold text-slate-900 border-t border-slate-900 pt-1">{selectedPatient.examiningDentist || 'Drg. Rizky Ramadhan'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-12">Terapis Gigi dan Mulut yang Melakukan Pemeriksaan</p>
                  <p className="font-bold text-slate-900 border-t border-slate-900 pt-1">{selectedPatient.examiningTherapist || '-'}</p>
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
                onClick={() => { 
                  if(confirm('Batalkan perubahan resume?')) { 
                    setAiAnalysis('');
                  } 
                }}
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
                  onClick={handleNewVisit}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  <Plus size={14} />
                  Kunjungan Baru
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
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Diagnosa:</span> {item.diagnosis.unmetNeeds || '-'}</p>
                    <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">Tindakan:</span> {item.treatment.map((id: string) => TREATMENTS_2023.find(t => t.id === id)?.name).join(', ') || '-'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Dokter</p>
                        <p className="text-sm font-bold text-slate-700">{item.doctor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Terapis</p>
                        <p className="text-sm font-bold text-slate-700">{item.therapist || '-'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        // Logic to view detail
                        setIsPreviousVisitModalOpen(true);
                      }}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                    >
                      <FileText size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => { 
                  if(confirm('Batalkan perubahan riwayat?')) { 
                    setSearchTerm('');
                  } 
                }}
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
  onUpdateAppointment,
  onDeleteAppointment,
  onRemindAppointment,
  onSave,
  user,
  isPatientVerified,
  onVerify
}: { 
  patients: Patient[], 
  appointments: Appointment[],
  onAddAppointment: (apt: Omit<Appointment, 'id' | 'status'>) => void,
  onUpdateAppointment: (apt: Appointment) => void,
  onDeleteAppointment: (id: number) => void,
  onRemindAppointment: (apt: Appointment) => void,
  onSave: () => void,
  user: User | null,
  isPatientVerified: boolean,
  onVerify: (verified: boolean) => void
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

  if (user?.role === 'Pasien' && !isPatientVerified) {
    return (
      <PatientVerification 
        onVerify={(id) => {
          onVerify(true);
        }}
        patients={patients}
      />
    );
  }

  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    type: 'Pemeriksaan Rutin',
    status: 'pending' as 'pending' | 'confirmed'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient && !editingAppointment) return;

    if (editingAppointment) {
      onUpdateAppointment({
        ...editingAppointment,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        status: formData.status
      });
    } else if (patient) {
      onAddAppointment({
        patient: patient.name,
        date: formData.date,
        time: formData.time,
        type: formData.type
      });
    }

    setIsModalOpen(false);
    setEditingAppointment(null);
    setFormData({ patientId: '', date: '', time: '', type: 'Pemeriksaan Rutin', status: 'pending' });
  };

  const handleEdit = (apt: Appointment) => {
    const patient = patients.find(p => p.name === apt.patient);
    setFormData({
      patientId: patient ? patient.id : '',
      date: apt.date,
      time: apt.time,
      type: apt.type,
      status: apt.status
    });
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

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
          {user?.role !== 'Pasien' && (
            <button 
              onClick={() => {
                setEditingAppointment(null);
                setFormData({ patientId: '', date: '', time: '', type: 'Pemeriksaan Rutin', status: 'pending' });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={20} />
              Tambah Jadwal Baru
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <Calendar className="text-blue-600 mb-4" size={32} />
            <h3 className="font-bold text-slate-900 mb-2">Kalender Cepat</h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, index) => <div key={index} className="text-[10px] font-bold text-slate-400">{d}</div>)}
              {Array.from({ length: daysInMonth }).map((_, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(i + 1)}
                  className={cn(
                    "aspect-square flex items-center justify-center text-xs rounded-lg cursor-pointer hover:bg-blue-50 transition-colors",
                    i + 1 === selectedDate ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-200" : "text-slate-600",
                    appointments.some(a => new Date(a.date).getDate() === i + 1 && new Date(a.date).getMonth() === currentMonth) && i + 1 !== selectedDate ? "bg-blue-50 text-blue-600 font-bold" : ""
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
                .filter(a => new Date(a.date).getDate() === selectedDate && new Date(a.date).getMonth() === currentMonth)
                .map(apt => (
                <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {user?.role !== 'Pasien' && (
                        <>
                          <button 
                            onClick={() => onRemindAppointment(apt)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Ingatkan Pasien"
                          >
                            <Bell size={16} />
                          </button>
                          <button 
                            onClick={() => handleEdit(apt)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Ubah Jadwal"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
                                onDeleteAppointment(apt.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus Jadwal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {appointments.filter(a => new Date(a.date).getDate() === selectedDate && new Date(a.date).getMonth() === currentMonth).length === 0 && (
                <div className="p-12 text-center text-slate-500">
                  Tidak ada jadwal untuk tanggal ini.
                </div>
              )}
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
                <h3 className="text-xl font-bold text-slate-900">{editingAppointment ? 'Ubah Jadwal' : 'Tambah Jadwal Baru'}</h3>
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
                      type="date" 
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Waktu</label>
                    <input 
                      type="time" 
                      required
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
                    <option>Perawatan Saluran Akar</option>
                    <option>Kontrol Ortho</option>
                  </select>
                </div>
                {editingAppointment && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as 'pending' | 'confirmed'})}
                    >
                      <option value="pending">Menunggu</option>
                      <option value="confirmed">Dikonfirmasi</option>
                    </select>
                  </div>
                )}
                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 mt-6"
                >
                  {editingAppointment ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
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

const ProfileModal = ({ user, onClose, onSave, onSyncData }: { user: User | null, onClose: () => void, onSave: (updatedUser: User) => void, onSyncData: () => void }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'Pasien');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      alert('Password baru tidak cocok!');
      return;
    }
    // In a real app, you would validate currentPassword here
    onSave({ ...user!, name, email, role });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">Profil & Keamanan</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nama User</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full p-3 rounded-xl border border-slate-200">
              <option value="Admin">Admin</option>
              <option value="Dokter Gigi">Dokter Gigi</option>
              <option value="Terapis Gigi dan Mulut">Terapis Gigi dan Mulut</option>
              <option value="Dosen">Dosen</option>
              <option value="Pasien">Pasien</option>
            </select>
          </div>
          <div className="border-t pt-4 mt-4 relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Password Saat Ini</label>
            <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-9 text-slate-400">
              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
            <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-9 text-slate-400">
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9 text-slate-400">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onSyncData} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"><Save size={18} /> Simpan Data</button>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200">Batal</button>
          <button onClick={handleSave} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700">Update Profil</button>
        </div>
      </div>
    </div>
  );
};

const PatientVerification = ({ onVerify, patients }: { onVerify: (id: string) => void, patients: Patient[] }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    const patient = patients.find(p => p.nik === input || p.mrNumber === input);
    if (patient) {
      onVerify(patient.id);
    } else {
      setError('NIK atau MR Number tidak ditemukan.');
    }
  };

  return (
    <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Verifikasi Data Pasien</h2>
      <p className="text-slate-500 mb-6">Masukkan NIK atau Nomor Rekam Medis Anda untuk mengakses rekam medis.</p>
      <div className="flex gap-4">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          className="flex-1 p-3 rounded-xl border border-slate-200" 
          placeholder="NIK atau MR Number"
        />
        <button onClick={handleVerify} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Verifikasi</button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([
    { name: 'Administrator', role: 'Admin', email: 'admin@example.com' },
    { name: 'Dewi', role: 'Terapis Gigi dan Mulut', email: 'dewi@example.com' },
    { name: 'Dosen Pembimbing', role: 'Dosen', email: 'dosen@example.com' },
    { name: 'Pasien Demo', role: 'Pasien', email: 'pasien@example.com' }
  ]);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPatientVerified, setIsPatientVerified] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const addNotification = (title: string, message: string) => {
    setNotifications(prev => [{
      id: Date.now().toString(),
      title,
      message,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      read: false
    }, ...prev]);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
    if (type === 'success') {
      addNotification('Aktivitas Baru', message);
    }
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

  const handleAddAppointment = (apt: Omit<Appointment, 'id' | 'status'>) => {
    const newApt: Appointment = {
      ...apt,
      id: Date.now(),
      status: 'pending'
    };
    setAppointments([...appointments, newApt]);
    showToast('Jadwal berhasil ditambahkan!');
  };

  const handleUpdateAppointment = (apt: Appointment) => {
    setAppointments(appointments.map(a => a.id === apt.id ? apt : a));
    showToast('Jadwal berhasil diperbarui!');
  };

  const handleDeleteAppointment = (id: number) => {
    setAppointments(appointments.filter(a => a.id !== id));
    showToast('Jadwal berhasil dihapus!');
  };

  const handleRemindAppointment = (apt: Appointment) => {
    addNotification('Pengingat Jadwal', `Pengingat telah dikirim ke pasien ${apt.patient} untuk jadwal tanggal ${apt.date} jam ${apt.time}.`);
    showToast('Pengingat berhasil dikirim!');
  };

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'INV-001', patient: 'Ahmad Subarjo', date: '2026-04-05', amount: 450000, status: 'paid', method: 'Transfer Bank' },
    { id: 'INV-002', patient: 'Siti Aminah', date: '2026-04-06', amount: 1250000, status: 'unpaid', method: '-' },
    { id: 'INV-003', patient: 'Budi Santoso', date: '2026-04-06', amount: 350000, status: 'paid', method: 'Tunai' },
    { id: 'INV-004', patient: 'Dewi Lestari', date: '2026-04-07', amount: 2100000, status: 'pending', method: 'BPJS' },
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ uid: firebaseUser.uid, name: userData.name, role: userData.role, email: userData.email });
            setIsLoggedIn(true);
            
            // Load app data
            const appDataDoc = await getDoc(doc(db, 'users', firebaseUser.uid, 'appData', 'state'));
            if (appDataDoc.exists()) {
              const appData = appDataDoc.data();
              if (appData.patients) setPatients(appData.patients);
              if (appData.appointments) setAppointments(appData.appointments);
              if (appData.invoices) setInvoices(appData.invoices);
            }
            
            // Load all users for dropdowns
            try {
              const usersSnapshot = await getDocs(collection(db, 'users'));
              const usersList: User[] = [];
              usersSnapshot.forEach(doc => {
                const data = doc.data();
                usersList.push({ uid: doc.id, name: data.name, role: data.role, email: data.email });
              });
              setUsers(usersList);
            } catch (err) {
              console.error("Error fetching users list:", err);
            }
          } else {
            // Document doesn't exist yet (e.g., during registration).
            // We do NOT set isLoggedIn(true) here. Let Auth.tsx handle the document creation and call onLogin.
            // But if it's a Google login that somehow failed to create the document, we might need a fallback.
            // For now, we rely on Auth.tsx to call onLogin.
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, selectedPatientId]);

  const handleLogin = async (userData: User) => {
    setUser(userData);
    setIsLoggedIn(true);
    if (userData.uid) {
      try {
        const appDataDoc = await getDoc(doc(db, 'users', userData.uid, 'appData', 'state'));
        if (appDataDoc.exists()) {
          const appData = appDataDoc.data();
          if (appData.patients) setPatients(appData.patients);
          if (appData.appointments) setAppointments(appData.appointments);
          if (appData.invoices) setInvoices(appData.invoices);
        }
        
        // Load all users for dropdowns
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList: User[] = [];
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          usersList.push({ uid: doc.id, name: data.name, role: data.role, email: data.email });
        });
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching app data on login:", error);
      }
    }
  };

  const handleRegister = (userData: User) => {
    setUsers(prev => [...prev, userData]);
    setUser(userData);
    setIsLoggedIn(true);
    showToast('Pendaftaran berhasil!');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUser(null);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSyncData = async () => {
    if (!user?.uid) {
      showToast('Gagal menyimpan: Pengguna tidak valid', 'error');
      return;
    }
    try {
      showToast('Menyimpan data ke cloud...', 'success');
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', user.uid, 'appData', 'state'), {
        patients,
        appointments,
        invoices,
        lastUpdated: new Date().toISOString()
      });
      showToast('Data berhasil disimpan ke cloud!', 'success');
    } catch (error) {
      console.error("Error saving data:", error);
      showToast('Gagal menyimpan data', 'error');
    }
  };

  const canAccess = (page: Page) => {
    if (!user) return false;
    if (['Admin', 'Dokter Gigi', 'Terapis Gigi dan Mulut', 'Dosen'].includes(user.role)) return true;
    if (user.role === 'Pasien') return ['records', 'appointments', 'education'].includes(page);
    return false;
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

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Auth onLogin={handleLogin} onRegister={handleRegister} users={users} />;
  }

  const renderPage = () => {
    if (!canAccess(currentPage)) {
      return <div className="p-8 text-center text-slate-500">Anda tidak memiliki akses ke halaman ini.</div>;
    }
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} patients={patients} appointments={appointments} invoices={invoices} />;
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
          user={user}
          users={users}
        />
      );
      case 'appointments': return (
        <Appointments 
          patients={patients} 
          appointments={appointments}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          onRemindAppointment={handleRemindAppointment}
          onSave={() => handleSave('Jadwal berhasil disimpan!')}
          user={user}
          isPatientVerified={isPatientVerified}
          onVerify={setIsPatientVerified}
        />
      );
      case 'diagnosis-ref': return <DiagnosisReference onSave={() => handleSave('Pedoman Diagnosa berhasil disimpan!')} />;
      case 'billing': return <Billing invoices={invoices} setInvoices={setInvoices} onSave={() => handleSave('Data Billing berhasil disimpan!')} />;
      case 'education': return <Education onSave={() => handleSave('Data Edukasi berhasil disimpan!')} />;
      case 'reports': return <Reports onSave={() => handleSave('Laporan berhasil diperbarui!')} />;
      case 'security': return <Security onSave={() => handleSave('Pengaturan Keamanan berhasil disimpan!')} />;
      case 'settings': return <Settings onSave={() => handleSave('Pengaturan berhasil disimpan!')} />;
      default: return <Dashboard onNavigate={setCurrentPage} patients={patients} appointments={appointments} invoices={invoices} />;
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
        "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out print:hidden",
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
            {canAccess('dashboard') && <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />}
            {canAccess('patients') && <SidebarItem icon={Users} label="Data Pasien" active={currentPage === 'patients'} onClick={() => setCurrentPage('patients')} />}
            {canAccess('records') && <SidebarItem icon={ClipboardList} label="Rekam Medis" active={currentPage === 'records'} onClick={() => setCurrentPage('records')} />}
            {canAccess('appointments') && <SidebarItem icon={Calendar} label="Jadwal & Janji" active={currentPage === 'appointments'} onClick={() => setCurrentPage('appointments')} />}
            {canAccess('billing') && <SidebarItem icon={CreditCard} label="Billing & Kasir" active={currentPage === 'billing'} onClick={() => setCurrentPage('billing')} />}
            {canAccess('education') && <SidebarItem icon={GraduationCap} label="Edukasi Gigi" active={currentPage === 'education'} onClick={() => setCurrentPage('education')} />}
            {canAccess('diagnosis-ref') && <SidebarItem icon={BookOpen} label="Pedoman Diagnosa" active={currentPage === 'diagnosis-ref'} onClick={() => setCurrentPage('diagnosis-ref')} />}
            {canAccess('reports') && <SidebarItem icon={FileText} label="Pelaporan" active={currentPage === 'reports'} onClick={() => setCurrentPage('reports')} />}
            {canAccess('security') && <SidebarItem icon={ShieldCheck} label="Keamanan Data" active={currentPage === 'security'} onClick={() => setCurrentPage('security')} />}
          </nav>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {canAccess('settings') && <SidebarItem icon={SettingsIcon} label="Pengaturan" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />}
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

          <div className="flex items-center gap-6 relative">
            <div 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                  {notifications.filter(n => !n.read).length}
                </div>
              )}
            </div>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-12 right-48 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Notifikasi</h3>
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      Tandai semua dibaca
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        Belum ada notifikasi
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
                            !notif.read ? "bg-blue-50/50" : ""
                          )}
                          onClick={() => {
                            setNotifications(notifications.map(n => n.id === notif.id ? {...n, read: true} : n));
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400">{notif.time}</span>
                          </div>
                          <p className="text-xs text-slate-600">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="relative">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:border-blue-200 group-hover:bg-blue-100 transition-all overflow-hidden text-sm">
                  {user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : <UserCircle size={28} />}
                </div>
              </div>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-50">
                  <button onClick={() => { setShowProfileModal(true); setShowUserMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                    <UserCircle size={16} />
                    Profil & Keamanan
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              )}
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
        {showProfileModal && (
          <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
            onSave={(updatedUser) => {
              setUser(updatedUser);
              showToast('Profil berhasil diperbarui!');
            }} 
            onSyncData={() => {
              handleSyncData();
              setShowProfileModal(false);
            }}
          />
        )}
      </main>
    </div>
  );
}
