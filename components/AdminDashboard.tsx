
import React, { useState } from 'react';
import { User, Company, UploadedFile, Theme, Report } from '../types';
import FileUpload from './FileUpload';
import Header from './Header';
import { useLanguage } from '../context/LanguageContext';

interface AdminDashboardProps {
  currentUser: User;
  companies: Company[];
  users: User[];
  reports: Report[];
  onAddCompany: (name: string, assignedUserIds: string[]) => void;
  onAddUser: (name: string, email: string, password: string, cedula: string, role: 'admin' | 'user', companyId?: string) => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onDeleteUser: (userId: string) => void;
  onUploadDocs: (companyId: string, files: UploadedFile[]) => void;
  onUpdateCompanyBranding: (companyId: string, updates: { logoDataUrl?: string; primaryColor?: string; secondaryColor?: string; }) => void;
  onUpdateCompanyName: (companyId: string, name: string) => void;
  onTestCompany: (companyId: string) => void;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function AdminDashboard({
  currentUser,
  companies,
  users,
  reports,
  onAddCompany,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUploadDocs,
  onUpdateCompanyBranding,
  onUpdateCompanyName,
  onTestCompany,
  onLogout,
  theme,
  onToggleTheme
}: AdminDashboardProps): React.ReactElement {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'reports'>('companies');
  
  // Logic: Super Admin (no companyId) vs Sub Admin (has companyId)
  const isSuperAdmin = !currentUser.companyId;
  const myCompanyId = currentUser.companyId;

  // Filter Data based on Role
  const displayedCompanies = isSuperAdmin 
    ? companies 
    : companies.filter(c => c.id === myCompanyId);

  const displayedUsers = isSuperAdmin
    ? users
    : users.filter(u => u.companyId === myCompanyId);

  const displayedReports = isSuperAdmin
    ? reports
    : reports.filter(r => r.companyId === myCompanyId);

  const currentCompanyBrand = companies.find(c => c.id === myCompanyId);
  
  // Forms State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [selectedUsersForNewCompany, setSelectedUsersForNewCompany] = useState<string[]>([]);
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserCedula, setNewUserCedula] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin'|'user'>('user');
  const [newUserCompanyId, setNewUserCompanyId] = useState<string>(isSuperAdmin ? (companies[0]?.id || '') : (myCompanyId || ''));
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserCedula, setEditingUserCedula] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState('');
  const [userListCompanyFilter, setUserListCompanyFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportView, setReportView] = useState<'dashboard' | 'tabla'>('dashboard');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportUserFilter, setReportUserFilter] = useState('all');
  const [reportCompanyFilter, setReportCompanyFilter] = useState('all');


  // Users without company (for assignment)
  const availableUsers = users.filter(u => u.role === 'user' && !u.companyId);

  // Styles
  const bgClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-md';
  const inputClass = theme === 'dark' ? 'bg-gray-900 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const tableHeaderClass = theme === 'dark' ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600';
  const tableRowClass = theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-200 hover:bg-gray-50';

  const BRAND_PALETTES = [
    { primary: '#0ea5e9', secondary: '#a855f7' },
    { primary: '#2563eb', secondary: '#06b6d4' },
    { primary: '#16a34a', secondary: '#0ea5e9' },
    { primary: '#f97316', secondary: '#ef4444' },
    { primary: '#7c3aed', secondary: '#ec4899' },
    { primary: '#0f766e', secondary: '#22c55e' },
  ];

  const parseReportDate = (report: Report): Date | null => {
    const d = new Date(report.date);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const filteredReports = displayedReports.filter((r) => {
    if (reportUserFilter !== 'all' && r.userId !== reportUserFilter) return false;
    if (reportCompanyFilter !== 'all' && r.companyId !== reportCompanyFilter) return false;

    const d = parseReportDate(r);
    if ((reportDateFrom || reportDateTo) && !d) return false;

    if (reportDateFrom && d) {
      const from = new Date(`${reportDateFrom}T00:00:00`);
      if (d < from) return false;
    }
    if (reportDateTo && d) {
      const to = new Date(`${reportDateTo}T23:59:59`);
      if (d > to) return false;
    }
    return true;
  });

  const averageMetric = (key: 'apertura' | 'descubrimiento' | 'manejoObjeciones' | 'claridad' | 'cierre') => {
    const withMetrics = filteredReports.filter(r => r.metrics?.[key] !== undefined);
    if (withMetrics.length === 0) return 0;
    return Math.round(withMetrics.reduce((acc, r) => acc + Number(r.metrics?.[key] || 0), 0) / withMetrics.length);
  };

  const topUsers = Object.values(filteredReports.reduce((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = { userId: r.userId, userName: r.userName, total: 0, count: 0 };
    acc[r.userId].total += r.score;
    acc[r.userId].count += 1;
    return acc;
  }, {} as Record<string, { userId: string; userName: string; total: number; count: number }>))
    .map(u => ({ ...u, avg: Math.round(u.total / Math.max(1, u.count)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const exportCSV = () => {
    if (filteredReports.length === 0) return;
    const header = ['Fecha','Usuario','Empresa','Puntaje','Estado','Apertura','Descubrimiento','Objeciones','Claridad','Cierre','Feedback','Transcripcion'];
    const rows = filteredReports.map((r) => {
      const companyName = companies.find(c => c.id === r.companyId)?.name || '';
      const cols = [
        r.date,
        r.userName,
        companyName,
        String(r.score),
        r.closingStatus,
        String(r.metrics?.apertura ?? ''),
        String(r.metrics?.descubrimiento ?? ''),
        String(r.metrics?.manejoObjeciones ?? ''),
        String(r.metrics?.claridad ?? ''),
        String(r.metrics?.cierre ?? ''),
        r.feedback || '',
        r.transcriptFull || r.transcriptSample || ''
      ];
      return cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reportes-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = filteredReports.map((r) => {
      const companyName = companies.find(c => c.id === r.companyId)?.name || '';
      return `<tr><td>${r.date}</td><td>${r.userName}</td><td>${companyName}</td><td>${r.score}</td><td>${r.closingStatus}</td><td>${(r.feedback || '').replace(/</g, '&lt;')}</td></tr>`;
    }).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reportes</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px;vertical-align:top}th{background:#f3f3f3}</style></head><body><h2>Reportes Coach de Ventas</h2><p>Total: ${filteredReports.length}</p><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Empresa</th><th>Puntaje</th><th>Estado</th><th>Feedback</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleLogoFile = (companyId: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateCompanyBranding(companyId, { logoDataUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${bgClass}`}>
      <Header theme={theme} onToggleTheme={onToggleTheme} brand={currentCompanyBrand}>
            <div className="flex flex-col items-end">
                <span className="text-sm font-bold">{currentUser.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-800'}`}>
                    {isSuperAdmin ? t.superAdmin : t.adminEmpresa}
                </span>
            </div>
            <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-600 font-medium ml-4 transition-all active:opacity-70">
                {t.logout}
            </button>
      </Header>

      <main className="flex-grow p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5 sm:space-y-8">
        
        {/* Navigation Tabs */}
        <div className={`flex flex-wrap gap-1 p-1 rounded-2xl w-full sm:w-fit border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            {[
                { id: 'companies', label: isSuperAdmin ? t.tabCompanies : t.tabMyCompany },
                { id: 'users', label: t.tabUsers },
                { id: 'reports', label: t.tabReports }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-2 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 ${
                        activeTab === tab.id 
                        ? (theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') 
                        : (theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black')
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* --- TAB: COMPANIES --- */}
        {activeTab === 'companies' && (
            <div className="grid lg:grid-cols-12 gap-8">
                {/* Create Company Form (ONLY SUPER ADMIN) */}
                {isSuperAdmin && (
                    <div className="lg:col-span-4 space-y-6">
                        <div className={`p-6 rounded-2xl border shadow-lg ${cardClass}`}>
                            <h2 className="text-lg font-bold mb-4 text-cyan-500 flex items-center">
                                {t.newCompany}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium opacity-70 mb-1">{t.commercialName}</label>
                                    <input 
                                        type="text" 
                                        className={`w-full rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all ${inputClass}`}
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium opacity-70 mb-1">{t.assignFreeUsers}</label>
                                    <div className={`border rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar ${inputClass}`}>
                                        {availableUsers.length === 0 ? (
                                            <p className="text-xs opacity-50 p-2">{t.noFreeUsers}</p>
                                        ) : (
                                            availableUsers.map(user => (
                                                <label key={user.id} className="flex items-center space-x-2 p-2 hover:opacity-80 cursor-pointer">
                                                    <input 
                                                        type="checkbox"
                                                        className="form-checkbox h-4 w-4 text-cyan-500 rounded"
                                                        checked={selectedUsersForNewCompany.includes(user.id)}
                                                        onChange={(e) => {
                                                            if(e.target.checked) setSelectedUsersForNewCompany([...selectedUsersForNewCompany, user.id]);
                                                            else setSelectedUsersForNewCompany(selectedUsersForNewCompany.filter(id => id !== user.id));
                                                        }}
                                                    />
                                                    <span className="text-sm">{user.name}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        if(newCompanyName) {
                                            onAddCompany(newCompanyName, selectedUsersForNewCompany);
                                            setNewCompanyName('');
                                            setSelectedUsersForNewCompany([]);
                                        }
                                    }}
                                    disabled={!newCompanyName}
                                    className="w-full brand-gradient-bg disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all duration-200 active:scale-[0.98]"
                                >
                                    {t.createCompany}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List Companies */}
                <div className={`${isSuperAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
                    {displayedCompanies.map(company => {
                         const companyUsers = users.filter(u => u.companyId === company.id);
                         return (
                            <div key={company.id} className={`p-6 rounded-2xl border shadow-lg relative group ${cardClass}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-100 transition-opacity">
                                    {isSuperAdmin && (
                                        <button 
                                            onClick={() => onTestCompany(company.id)}
                                            className="flex items-center space-x-2 brand-gradient-bg text-white text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 active:scale-95"
                                        >
                                            <span>{t.testCoach}</span>
                                        </button>
                                    )}
                                </div>

                                <div className="mb-6">
                                    {editingCompanyId === company.id ? (
                                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                        <input
                                          className={`rounded-lg p-2 border ${inputClass}`}
                                          value={editingCompanyName}
                                          onChange={(e) => setEditingCompanyName(e.target.value)}
                                          placeholder={t.commercialName}
                                        />
                                        <div className="flex gap-2">
                                          <button className="text-xs px-3 py-2 rounded-lg border" onClick={() => setEditingCompanyId(null)}>{t.cancel}</button>
                                          <button
                                            className="text-xs px-3 py-2 rounded-lg brand-gradient-bg text-white"
                                            onClick={() => {
                                              if (editingCompanyName.trim()) {
                                                onUpdateCompanyName(company.id, editingCompanyName.trim());
                                                setEditingCompanyId(null);
                                              }
                                            }}
                                          >{t.saveName}</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-bold mb-1">{company.name}</h3>
                                        <button
                                          className="text-xs px-2 py-1 rounded border"
                                          onClick={() => {
                                            setEditingCompanyId(company.id);
                                            setEditingCompanyName(company.name || '');
                                          }}
                                        >{t.edit}</button>
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-4 text-xs opacity-60 mt-1">
                                        <span>ID: {company.id}</span>
                                        <span>•</span>
                                        <span>{companyUsers.length} {t.tabUsers}</span>
                                    </div>
                                </div>
                                
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Docs Column */}
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-3">{t.knowledgeBase}</h4>
                                        <FileUpload 
                                            files={company.documents}
                                            customHandleUpload={(files) => onUploadDocs(company.id, files)}
                                            theme={theme}
                                        />
                                    </div>

                                    {/* Users Preview */}
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                         <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-3">{t.team}</h4>
                                        {companyUsers.length > 0 ? (
                                            <ul className="space-y-2 mb-3">
                                                {companyUsers.slice(0, 3).map(u => (
                                                    <li key={u.id} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                                        <span>{u.name}</span>
                                                        <span className="text-xs opacity-60">{u.role}</span>
                                                    </li>
                                                ))}
                                                {companyUsers.length > 3 && <li className="text-xs opacity-50 text-center">+ {companyUsers.length - 3} más</li>}
                                            </ul>
                                        ) : (
                                            <p className="text-xs opacity-50 mb-3 italic">{t.noUsers}</p>
                                        )}
                                        <button
                                            onClick={() => {
                                                setActiveTab('users');
                                                setNewUserCompanyId(company.id);
                                                setUserListCompanyFilter(company.id);
                                            }}
                                            className="text-xs font-medium transition-all active:opacity-70" style={{ color: 'var(--brand-primary)' }}
                                        >
                                            {t.manageUsers}
                                        </button>
                                    </div>

                                    {/* Branding */}
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <h4 className="text-xs font-bold text-fuchsia-500 uppercase tracking-wider mb-3">Branding</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                {company.logoDataUrl ? (
                                                    <img src={company.logoDataUrl} alt="logo" className="w-12 h-12 rounded-lg object-cover border" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg border flex items-center justify-center text-xs opacity-60">Logo</div>
                                                )}
                                                <label className="text-xs cursor-pointer px-3 py-2 rounded-lg border">
                                                    {t.uploadLogo}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleLogoFile(company.id, e.target.files?.[0])}
                                                    />
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-xs opacity-70 mb-2">{t.colorPalette}</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {BRAND_PALETTES.map((p, idx) => {
                                                      const selected = (company.primaryColor || '#0ea5e9') === p.primary && (company.secondaryColor || '#a855f7') === p.secondary;
                                                      return (
                                                        <button
                                                          key={idx}
                                                          onClick={() => onUpdateCompanyBranding(company.id, { primaryColor: p.primary, secondaryColor: p.secondary })}
                                                          className={`h-10 rounded-lg border-2 ${selected ? 'border-white ring-2 ring-offset-1 ring-cyan-500' : 'border-transparent'}`}
                                                          style={{ backgroundImage: `linear-gradient(to right, ${p.primary}, ${p.secondary})` }}
                                                          title={`Primario ${p.primary} / Secundario ${p.secondary}`}
                                                        />
                                                      );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- TAB: USERS --- */}
        {activeTab === 'users' && (
             <div className="grid lg:grid-cols-4 gap-8">
                <div className={`p-6 rounded-2xl border shadow-xl h-fit ${cardClass}`}>
                    <h2 className="text-lg font-bold mb-4 text-fuchsia-500">{t.newUser}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium opacity-70 mb-1">{t.fullName}</label>
                            <input 
                                type="text" 
                                className={`w-full rounded-lg p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClass}`}
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium opacity-70 mb-1">{t.email}</label>
                            <input
                                type="email"
                                className={`w-full rounded-lg p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClass}`}
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                placeholder={t.emailPlaceholder}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium opacity-70 mb-1">{t.idNumber}</label>
                                <input 
                                    type="text" 
                                    className={`w-full rounded-lg p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClass}`}
                                    value={newUserCedula}
                                    onChange={(e) => setNewUserCedula(e.target.value)}
                                    placeholder="Ej. 123456789"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium opacity-70 mb-1">{t.password}</label>
                                <input
                                    type="password"
                                    className={`w-full rounded-lg p-3 outline-none focus:ring-2 focus:ring-fuchsia-500 ${inputClass}`}
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                             <div>
                                <label className="block text-xs font-medium opacity-70 mb-1">{t.role}</label>
                                <select
                                    className={`w-full rounded-lg p-3 ${inputClass}`}
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value as any)}
                                >
                                    <option value="user">{t.salesperson}</option>
                                    <option value="admin">{t.administrator}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium opacity-70 mb-1">{t.company}</label>
                                <select 
                                    className={`w-full rounded-lg p-3 ${inputClass}`}
                                    value={newUserCompanyId}
                                    onChange={(e) => setNewUserCompanyId(e.target.value)}
                                    disabled={!isSuperAdmin} // Sub-admin can't change company
                                >
                                    {displayedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <button 
                             onClick={() => {
                                if(newUserName && newUserEmail && newUserPassword && newUserCedula && newUserCompanyId) {
                                    onAddUser(newUserName, newUserEmail, newUserPassword, newUserCedula, newUserRole, newUserCompanyId);
                                    setNewUserName('');
                                    setNewUserEmail('');
                                    setNewUserPassword('');
                                    setNewUserCedula('');
                                } else {
                                    alert(t.fillAllFields);
                                }
                            }}
                            className="w-full brand-gradient-bg py-3 rounded-2xl font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                        >
                            {t.createUser}
                        </button>
                    </div>
                </div>

                <div className={`lg:col-span-3 rounded-2xl border shadow-xl overflow-hidden ${cardClass}`}>
                    {isSuperAdmin && (
                        <div className={`p-4 border-b flex items-center gap-3 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                            <label className="text-xs font-medium opacity-70">{t.company}</label>
                            <select
                                className={`rounded-lg p-2 text-sm ${inputClass}`}
                                value={userListCompanyFilter}
                                onChange={(e) => setUserListCompanyFilter(e.target.value)}
                            >
                                <option value="all">{t.allF}</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className={tableHeaderClass}>
                                <tr>
                                    <th className="p-3 text-sm font-semibold">{t.name}</th>
                                    <th className="p-3 text-sm font-semibold">{t.email}</th>
                                    <th className="p-3 text-sm font-semibold hidden xl:table-cell">{t.idNumber}</th>
                                    <th className="p-3 text-sm font-semibold">{t.role}</th>
                                    <th className="p-3 text-sm font-semibold hidden md:table-cell">{t.company}</th>
                                    <th className="p-3 text-sm font-semibold">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const rows = userListCompanyFilter === 'all' ? displayedUsers : displayedUsers.filter(u => u.companyId === userListCompanyFilter);
                                    if (rows.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center opacity-50 text-sm italic">{t.noUsers}</td>
                                            </tr>
                                        );
                                    }
                                    return rows.map(user => {
                                        const company = companies.find(c => c.id === user.companyId);
                                        return (
                                            <tr key={user.id} className={`border-t transition-colors ${tableRowClass}`}>
                                                <td className="p-3 font-medium">{user.name}</td>
                                                <td className="p-3 text-sm opacity-80 break-all">{user.email}</td>
                                                <td className="p-3 text-sm opacity-80 hidden xl:table-cell">{user.cedula}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${user.role === 'admin' ? 'bg-purple-900/30 border-purple-500 text-purple-500' : 'bg-green-900/30 border-green-500 text-green-500'}`}>
                                                        {user.role === 'admin' ? 'ADMIN' : t.roleBadgeSeller}
                                                    </span>
                                                </td>
                                                <td className="p-3 opacity-70 text-sm hidden md:table-cell">{company?.name || t.global}</td>
                                                <td className="p-3">
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                          className="text-xs px-2 py-1 rounded-lg border whitespace-nowrap"
                                                          onClick={() => {
                                                            setEditingUserId(user.id);
                                                            setEditingUserName(user.name || '');
                                                            setEditingUserEmail(user.email || '');
                                                            setEditingUserCedula(user.cedula || '');
                                                          }}
                                                        >{t.edit}</button>
                                                        {user.id !== currentUser.id && (
                                                            <button
                                                              className="text-xs px-2 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 whitespace-nowrap"
                                                              onClick={() => {
                                                                if (window.confirm(t.confirmDeleteUser.replace('{name}', user.name))) {
                                                                    onDeleteUser(user.id);
                                                                }
                                                              }}
                                                            >{t.deleteUser}</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
        )}

        {/* --- TAB: REPORTS --- */}
        {activeTab === 'reports' && (
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                  <div className={`inline-flex gap-1 p-1 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                    <button
                      onClick={() => setReportView('dashboard')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${reportView === 'dashboard' ? 'brand-gradient-bg text-white' : ''}`}
                    >Dashboard</button>
                    <button
                      onClick={() => setReportView('tabla')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${reportView === 'tabla' ? 'brand-gradient-bg text-white' : ''}`}
                    >{t.detail}</button>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={exportCSV} className="text-xs px-3 py-2 rounded-lg border">{t.exportCSV}</button>
                    <button onClick={exportPDF} className="text-xs px-3 py-2 rounded-lg border">{t.exportPDF}</button>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${cardClass}`}>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs opacity-70 mb-1">{t.from}</label>
                      <input type="date" className={`w-full rounded-lg p-2 border ${inputClass}`} value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs opacity-70 mb-1">{t.to}</label>
                      <input type="date" className={`w-full rounded-lg p-2 border ${inputClass}`} value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs opacity-70 mb-1">{t.tabUsers}</label>
                      <select className={`w-full rounded-lg p-2 border ${inputClass}`} value={reportUserFilter} onChange={(e) => setReportUserFilter(e.target.value)}>
                        <option value="all">{t.all}</option>
                        {Array.from(new Map(displayedReports.map(r => [r.userId, r.userName])).entries()).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs opacity-70 mb-1">{t.company}</label>
                      <select className={`w-full rounded-lg p-2 border ${inputClass}`} value={reportCompanyFilter} onChange={(e) => setReportCompanyFilter(e.target.value)}>
                        <option value="all">{t.allF}</option>
                        {displayedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stats Summary */}
                {reportView === 'dashboard' && (
                <>
                <div className={`p-8 rounded-2xl border text-center shadow-xl ${cardClass}`}>
                    <h2 className="text-2xl font-bold mb-6">{t.performanceReport} {isSuperAdmin ? t.global : t.company}</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-4xl font-black text-cyan-500 mb-1">
                                {filteredReports.length > 0 
                                    ? Math.round(filteredReports.reduce((acc, r) => acc + r.score, 0) / filteredReports.length)
                                    : 0}
                                <span className="text-lg opacity-50 font-normal">/100</span>
                            </div>
                            <div className="text-sm font-medium opacity-60 uppercase tracking-wide">{t.avgScore}</div>
                        </div>
                        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-4xl font-black text-green-500 mb-1">
                                {filteredReports.filter(r => r.closingStatus === 'Cerrada').length}
                            </div>
                             <div className="text-sm font-medium opacity-60 uppercase tracking-wide">{t.salesClosed}</div>
                        </div>
                        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-4xl font-black text-fuchsia-500 mb-1">
                                {filteredReports.length}
                            </div>
                             <div className="text-sm font-medium opacity-60 uppercase tracking-wide">{t.totalSessions}</div>
                        </div>
                    </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl ${cardClass}`}>
                  <h3 className="text-lg font-bold mb-4">{t.kpiBySkill}</h3>
                  <div className="grid md:grid-cols-5 gap-3">
                    {[
                      { k: 'apertura', label: t.metricOpening },
                      { k: 'descubrimiento', label: t.metricDiscovery },
                      { k: 'manejoObjeciones', label: t.metricObjections },
                      { k: 'claridad', label: t.metricClarity },
                      { k: 'cierre', label: t.metricClosing },
                    ].map((item) => {
                      const value = averageMetric(item.k as any);
                      return (
                        <div key={item.k} className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="text-xs opacity-70">{item.label}</div>
                          <div className="text-2xl font-black" style={{ color: 'var(--brand-primary)' }}>{value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl ${cardClass}`}>
                  <h3 className="text-lg font-bold mb-4">{t.topSellers}</h3>
                  {topUsers.length === 0 ? (
                    <p className="text-sm opacity-60">{t.noDataYet}</p>
                  ) : (
                    <div className="space-y-2">
                      {topUsers.map((u, idx) => (
                        <div key={u.userId} className={`p-3 rounded-lg border flex items-center justify-between ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <span className="text-sm">#{idx + 1} {u.userName}</span>
                          <span className="font-bold text-cyan-500">{u.avg}/100</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </>
                )}

                {/* Detailed Table */}
                {reportView === 'tabla' && (
                <div className={`rounded-2xl border shadow-xl overflow-hidden ${cardClass}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className={tableHeaderClass}>
                                <tr>
                                    <th className="p-4 text-sm font-semibold">{t.date}</th>
                                    <th className="p-4 text-sm font-semibold">{t.seller}</th>
                                    <th className="p-4 text-sm font-semibold">{t.company}</th>
                                    <th className="p-4 text-sm font-semibold text-center">{t.score}</th>
                                    <th className="p-4 text-sm font-semibold text-center">{t.status}</th>
                                    <th className="p-4 text-sm font-semibold">{t.metrics}</th>
                                    <th className="p-4 text-sm font-semibold">{t.keyFeedback}</th>
                                    <th className="p-4 text-sm font-semibold">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center opacity-50">{t.noReports}</td>
                                    </tr>
                                ) : (
                                    filteredReports.map(report => {
                                        const companyName = companies.find(c => c.id === report.companyId)?.name;
                                        return (
                                            <tr key={report.id} className={`border-t transition-colors ${tableRowClass}`}>
                                                <td className="p-4 text-sm opacity-70">{report.date}</td>
                                                <td className="p-4 font-medium">{report.userName}</td>
                                                <td className="p-4 text-sm opacity-70">{companyName}</td>
                                                <td className="p-4 text-center font-bold text-cyan-500">{report.score}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${report.closingStatus === 'Cerrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {report.closingStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs opacity-80">{report.metrics ? `A:${report.metrics.apertura} D:${report.metrics.descubrimiento} O:${report.metrics.manejoObjeciones} C:${report.metrics.claridad} Z:${report.metrics.cierre}` : '-'}</td>
                                                <td className="p-4 text-sm opacity-80 max-w-xs truncate" title={report.feedback}>{report.feedback}</td>
                                                <td className="p-4">
                                                  <button className="text-xs px-3 py-1 rounded-lg border" onClick={() => setSelectedReport(report)}>
                                                    {t.viewDetail}
                                                  </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </div>
        )}

      </main>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 rounded-xl border ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t.reportDetail}</h3>
              <button className="px-3 py-1 rounded-lg border" onClick={() => setSelectedReport(null)}>{t.closeModal}</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="opacity-60">{t.seller}:</span> {selectedReport.userName}</div>
              <div><span className="opacity-60">{t.date}:</span> {selectedReport.date}</div>
              <div><span className="opacity-60">{t.score}:</span> <strong>{selectedReport.score}/100</strong></div>
              <div><span className="opacity-60">{t.status}:</span> {selectedReport.closingStatus}</div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-1">{t.coachFeedback}</h4>
              <p className="text-sm opacity-90">{selectedReport.feedback}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-semibold mb-1">{t.strengths}</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">{(selectedReport.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">{t.improvements}</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">{(selectedReport.improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">{t.fullTranscript}</h4>
              <pre className={`text-xs p-3 rounded-lg border whitespace-pre-wrap ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                {selectedReport.transcriptFull || selectedReport.transcriptSample || t.noTranscript}
              </pre>
            </div>
          </div>
        </div>
      )}

      {editingUserId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-4 rounded-xl border ${cardClass}`}>
            <h3 className="font-bold mb-3">{t.editUser}</h3>
            <div className="space-y-2">
              <input className={`w-full rounded-lg p-2 ${inputClass}`} value={editingUserName} onChange={(e)=>setEditingUserName(e.target.value)} placeholder={t.name} />
              <input className={`w-full rounded-lg p-2 ${inputClass}`} value={editingUserEmail} onChange={(e)=>setEditingUserEmail(e.target.value)} placeholder={t.email} />
              <input className={`w-full rounded-lg p-2 ${inputClass}`} value={editingUserCedula} onChange={(e)=>setEditingUserCedula(e.target.value)} placeholder={t.idNumber} />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-2 rounded-lg border" onClick={()=>setEditingUserId(null)}>{t.cancel}</button>
              <button className="px-3 py-2 rounded-lg brand-gradient-bg text-white" onClick={()=>{ onUpdateUser(editingUserId,{name:editingUserName,email:editingUserEmail,cedula:editingUserCedula}); setEditingUserId(null);} }>{t.save}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
