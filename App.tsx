
import React, { useState, useEffect, useRef } from 'react';
import { User, Company, UploadedFile, UserRole, Theme, Report } from './types';
import { hasFirebaseConfig, saveAppData, subscribeAppData } from './services/firebase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import SalesSimulator from './components/SalesSimulator';
import { useLanguage } from './context/LanguageContext';

// MOCK DATA INITIALIZATION
const INITIAL_COMPANIES: Company[] = [
    { id: 'c1', name: 'Tech Solutions S.A.', documents: [], primaryColor: '#0ea5e9', secondaryColor: '#a855f7' },
    { id: 'c2', name: 'Inmobiliaria Futuro', documents: [], primaryColor: '#0ea5e9', secondaryColor: '#a855f7' }
];

const INITIAL_USERS: User[] = [
    { id: 'u1', name: 'Super Admin', email: 'super@admin.com', password: '123', cedula: '111111111', role: 'admin' }, // No Company ID = Super Admin
    { id: 'u2', name: 'Admin Tech', email: 'admin@tech.com', password: '123', cedula: '222222222', role: 'admin', companyId: 'c1' }, // Has Company ID = Sub Admin
    { id: 'u3', name: 'Carlos Vendedor', email: 'carlos@tech.com', password: '123', cedula: '333333333', role: 'user', companyId: 'c1' },
    { id: 'u4', name: 'Ana Agente', email: 'ana@inmobiliaria.com', password: '123', cedula: '444444444', role: 'user', companyId: 'c2' }
];

const LS_KEYS = {
  companies: 'coach_v5_companies',
  users: 'coach_v5_users',
  reports: 'coach_v5_reports',
  theme: 'coach_v5_theme',
  currentUserId: 'coach_v5_current_user_id',
};

export default function App(): React.ReactElement {
  const { t } = useLanguage();
  // Global State
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(LS_KEYS.theme) as Theme) || 'light');
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.companies);
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.users);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.reports);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedId = localStorage.getItem(LS_KEYS.currentUserId);
    if (!savedId) return null;
    const savedUsers = localStorage.getItem(LS_KEYS.users);
    const usersList: User[] = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
    return usersList.find(u => u.id === savedId) || null;
  });
  
  // State for Admin Test Mode
  const [adminTestCompanyId, setAdminTestCompanyId] = useState<string | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const hasHydratedFromCloudRef = useRef(!hasFirebaseConfig);

  const activeBrand = (() => {
    const companyFromTest = adminTestCompanyId ? companies.find(c => c.id === adminTestCompanyId) : undefined;
    const companyFromUser = currentUser?.companyId ? companies.find(c => c.id === currentUser.companyId) : undefined;
    return companyFromTest || companyFromUser || companies[0];
  })();

  // Apply theme class to body
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  }, [theme]);

  // Apply brand colors globally
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', activeBrand?.primaryColor || '#0ea5e9');
    root.style.setProperty('--brand-secondary', activeBrand?.secondaryColor || '#a855f7');
  }, [activeBrand]);

  // Carga inicial desde Firebase (si está configurado)
  useEffect(() => {
    if (!hasFirebaseConfig) return;

    const unsubscribe = subscribeAppData((cloud) => {
      skipNextCloudSaveRef.current = true;
      hasHydratedFromCloudRef.current = true;
      if (cloud.theme) setTheme(cloud.theme as Theme);
      if (Array.isArray(cloud.companies) && cloud.companies.length > 0) setCompanies(cloud.companies as Company[]);
      if (Array.isArray(cloud.users) && cloud.users.length > 0) setUsers(cloud.users as User[]);
      if (Array.isArray(cloud.reports)) setReports(cloud.reports as Report[]);
    });

    return unsubscribe;
  }, []);

  // Persist core data (local)
  useEffect(() => { localStorage.setItem(LS_KEYS.theme, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(LS_KEYS.companies, JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem(LS_KEYS.users, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(LS_KEYS.reports, JSON.stringify(reports)); }, [reports]);
  useEffect(() => {
    if (currentUser) localStorage.setItem(LS_KEYS.currentUserId, currentUser.id);
    else localStorage.removeItem(LS_KEYS.currentUserId);
  }, [currentUser]);

  // Persist core data (firebase)
  useEffect(() => {
    if (!hasFirebaseConfig) return;

    // Nunca escribir a la nube hasta confirmar que ya llegó el snapshot real
    // (o que el documento no existe todavía). Sin esto, un navegador con
    // caché local vieja podría sobrescribir datos reales antes de sincronizar.
    if (!hasHydratedFromCloudRef.current) return;

    // Evita sobrescribir con estado local justo cuando llega snapshot inicial
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const run = async () => {
      try {
        await saveAppData({ theme, companies, users, reports });
      } catch (e) {
        console.error('Firebase save failed', e);
      }
    };

    run();
  }, [theme, companies, users, reports]);

  // Actions
  const handleAddCompany = (name: string, assignedUserIds: string[]) => {
    const newCompanyId = `c${Date.now()}`;
    const newCompany: Company = {
        id: newCompanyId,
        name,
        documents: [],
        primaryColor: '#0ea5e9',
        secondaryColor: '#a855f7',
    };
    setCompanies([...companies, newCompany]);

    if (assignedUserIds.length > 0) {
        setUsers(prevUsers => prevUsers.map(u => 
            assignedUserIds.includes(u.id) ? { ...u, companyId: newCompanyId } : u
        ));
    }
  };

  const handleAddUser = (name: string, email: string, password: string, cedula: string, role: UserRole, companyId?: string) => {
    const newUser: User = {
        id: `u${Date.now()}`,
        name,
        email,
        password,
        cedula,
        role,
        companyId
    };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleUploadDocs = (companyId: string, files: UploadedFile[]) => {
    setCompanies(prev => prev.map(c => {
        if (c.id === companyId) {
            return { ...c, documents: [...c.documents, ...files] };
        }
        return c;
    }));
  };

  const handleSaveReport = (report: Report) => {
      setReports(prev => [report, ...prev]);
  };

  const handleUpdateCompanyBranding = (companyId: string, updates: { logoDataUrl?: string; primaryColor?: string; secondaryColor?: string; }) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...updates } : c));
  };

  const handleUpdateCompanyName = (companyId: string, name: string) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, name } : c));
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Routing Logic
  if (!currentUser) {
    return <Login users={users} onLogin={setCurrentUser} theme={theme} onToggleTheme={toggleTheme} />;
  }

  // Admin Logic
  if (currentUser.role === 'admin') {
    // Admin is Testing a Company (Simulator View)
    if (adminTestCompanyId) {
        const testCompany = companies.find(c => c.id === adminTestCompanyId);
        const testDocs = testCompany ? testCompany.documents : [];
        return (
            <div className={`relative h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-1 rounded-b-lg z-50 text-xs font-bold shadow-lg">
                    {t.testModeLabel} - {testCompany?.name}
                </div>
                <SalesSimulator 
                    currentUser={currentUser}
                    documents={testDocs}
                    onLogout={() => setAdminTestCompanyId(null)}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    onSaveReport={handleSaveReport} // Admin tests also generate reports (optional)
                    companyId={adminTestCompanyId}
                    companyBrand={testCompany}
                />
            </div>
        );
    }

    // Dashboard View
    return (
        <AdminDashboard 
            currentUser={currentUser}
            companies={companies}
            users={users}
            reports={reports}
            onAddCompany={handleAddCompany}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onUploadDocs={handleUploadDocs}
            onUpdateCompanyBranding={handleUpdateCompanyBranding}
            onUpdateCompanyName={handleUpdateCompanyName}
            onTestCompany={(companyId) => setAdminTestCompanyId(companyId)}
            onLogout={() => setCurrentUser(null)}
            theme={theme}
            onToggleTheme={toggleTheme}
        />
    );
  }

  // User Logic (Standard Simulator)
  const userCompany = companies.find(c => c.id === currentUser.companyId);
  const userDocs = userCompany ? userCompany.documents : [];

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <SalesSimulator 
            currentUser={currentUser}
            documents={userDocs}
            onLogout={() => setCurrentUser(null)}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSaveReport={handleSaveReport}
            companyId={currentUser.companyId || ''}
            companyBrand={userCompany}
        />
    </div>
  );
}
