import React, { useEffect, useState, createContext, useContext, useRef, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, deleteDoc, orderBy, limit, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Restaurant, Category, Meal, Order, OrderItem, UserRole, ActivityLog, FeatureFlags, ThemeConfig } from './types';
import { 
  LayoutDashboard, 
  Utensils, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Menu as MenuIcon,
  Store,
  Users,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Camera,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Activity,
  BarChart3,
  MapPin,
  Layers,
  Moon,
  Sun,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Contexts ---
const ThemeContext = createContext<{
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  toggleMode: () => void;
}>({
  theme: { mode: 'dark', primaryColor: '#00FF00' },
  setTheme: () => {},
  toggleMode: () => {},
});

const useTheme = () => useContext(ThemeContext);

const CameraContext = createContext<{
  capture: () => Promise<string | null>;
}>({
  capture: async () => null,
});

const useCamera = () => useContext(CameraContext);

// --- Utilities ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the whole app, but we can log it
  // In a real app, we might show a toast or update a state
}

class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-stone-900">حدث خطأ ما</h2>
            <p className="text-stone-600 text-sm">
              {this.state.error?.message.includes('{"error":') 
                ? "عذراً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء أو الوصول لهذه البيانات."
                : "حدث خطأ غير متوقع في التطبيق. يرجى المحاولة مرة أخرى لاحقاً."}
            </p>
            <Button onClick={() => window.location.reload()}>إعادة تحميل الصفحة</Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---
const CameraProvider = ({ children }: { children: React.ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capture = async (): Promise<string | null> => {
    await startCamera();
    // Wait for video to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const data = canvasRef.current.toDataURL('image/jpeg');
        stopCamera();
        return data;
      }
    }
    stopCamera();
    return null;
  };

  return (
    <CameraContext.Provider value={{ capture }}>
      {children}
      <div className="hidden">
        <video ref={videoRef} autoPlay playsInline />
        <canvas ref={canvasRef} width={320} height={240} />
      </div>
    </CameraContext.Provider>
  );
};

// --- Components ---
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-stone-50">
    <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
  </div>
);

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: 'bg-stone-900 text-white hover:bg-stone-800',
    secondary: 'bg-stone-100 text-stone-900 hover:bg-stone-200',
    outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )} 
      {...props} 
    />
  );
};

const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm', className)} {...props}>
    {children}
  </div>
);

// --- Layout ---
const DashboardLayout = ({ children, title, role }: { children: React.ReactNode; title: string; role: string }) => {
  const handleLogout = () => signOut(auth);
  const { theme, toggleMode } = useTheme();

  const roleLabels: Record<string, string> = {
    super_admin: 'المدير العام',
    chain_owner: 'مالك السلسلة',
    manager: 'مدير فرع',
    cashier: 'كاشير',
    waiter: 'ويتر (نادل)',
    kitchen: 'مطبخ',
    driver: 'مندوب توصيل',
    table_manager: 'مسؤول طاولات'
  };

  return (
    <div className={cn(
      "flex min-h-screen font-sans transition-colors duration-300",
      theme.mode === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-stone-50 text-stone-900"
    )} dir="rtl">
      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-l flex flex-col transition-colors duration-300",
        theme.mode === 'dark' ? "bg-black/40 border-white/10 backdrop-blur-xl" : "bg-white border-stone-200"
      )}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-[#00FF00] rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]">
              <Utensils className="w-5 h-5" />
            </div>
            <span>أنظمة سناء</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-2 uppercase tracking-widest font-bold">
            {roleLabels[role] || 'إدارة الفرع'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {role === 'super_admin' ? (
            <>
              <Link to="/admin" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">لوحة التحكم</span>
              </Link>
              <Link to="/admin/restaurants" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <Store className="w-5 h-5" />
                <span className="text-sm font-bold">المطاعم</span>
              </Link>
            </>
          ) : role === 'chain_owner' ? (
            <>
              <Link to="/chain" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">العرض الشامل</span>
              </Link>
              <Link to="/chain/logs" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-bold">سجلات النشاطات</span>
              </Link>
              <Link to="/chain/analytics" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-bold">التحليلات</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/restaurant" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">لوحة التحكم</span>
              </Link>
              
              {(role === 'manager' || role === 'cashier' || role === 'waiter') && (
                <Link to="/restaurant/orders" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-sm font-bold">الطلبات</span>
                </Link>
              )}

              {(role === 'manager') && (
                <Link to="/restaurant/menu" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <MenuIcon className="w-5 h-5" />
                  <span className="text-sm font-bold">المنيو</span>
                </Link>
              )}

              {(role === 'manager' || role === 'kitchen') && (
                <Link to="/restaurant/kitchen" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <Utensils className="w-5 h-5" />
                  <span className="text-sm font-bold">المطبخ</span>
                </Link>
              )}

              {(role === 'manager' || role === 'table_manager' || role === 'waiter') && (
                <Link to="/restaurant/tables" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <Layers className="w-5 h-5" />
                  <span className="text-sm font-bold">الطاولات</span>
                </Link>
              )}

              {(role === 'manager' || role === 'driver') && (
                <Link to="/restaurant/delivery" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-bold">التوصيل</span>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={toggleMode}
            className="flex items-center gap-3 w-full px-3 py-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            {theme.mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-sm font-bold">{theme.mode === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-md transition-colors duration-300",
          theme.mode === 'dark' ? "bg-black/40 border-white/10" : "bg-white/80 border-stone-200"
        )}>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold">{auth.currentUser?.displayName || 'مستخدم'}</p>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                {roleLabels[role] || 'إدارة الفرع'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shadow-lg">
              <img src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} alt="" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- Pages ---
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'chain' | 'staff'>('chain');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { capture } = useCamera();

  const logActivity = async (user: User, profile: UserProfile, photo: string | null) => {
    try {
      const browser = navigator.userAgent;
      const now = new Date();
      const baghdadTime = new Intl.DateTimeFormat('ar-IQ', {
        timeZone: 'Asia/Baghdad',
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(now);

      await addDoc(collection(db, 'activity_logs'), {
        uid: user.uid,
        employeeName: profile.name,
        role: profile.role,
        restaurantId: profile.restaurantId || 'all',
        restaurantName: profile.restaurantId ? 'فرع' : 'المركز الرئيسي',
        region: 'بغداد',
        actionType: 'login',
        details: `تسجيل دخول عبر ${loginType === 'chain' ? 'البريد' : 'الهاتف'}`,
        userPhoto: photo || '',
        deviceInfo: {
          browser,
          ip: '0.0.0.0'
        },
        timestamp: now.toISOString(),
        baghdadTime
      });
    } catch (err) {
      console.error("Failed to log activity", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Capture visual audit photo
      const photo = await capture();
      
      let userCredential;
      if (loginType === 'chain') {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        const staffEmail = `${phone.replace(/\s+/g, '')}@sana.staff`;
        userCredential = await signInWithEmailAndPassword(auth, staffEmail, password);
      }

      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as UserProfile;
        await logActivity(userCredential.user, profile, photo);
        if (photo) {
          await updateDoc(doc(db, 'users', userCredential.user.uid), { photoUrl: photo });
        }
      }
    } catch (err: any) {
      setError("خطأ في بيانات الدخول أو تعذر الوصول للكاميرا.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [bootstrapping, setBootstrapping] = useState(false);

  const bootstrapDemo = async () => {
    setBootstrapping(true);
    setError(null);
    try {
      const roles: UserRole[] = ['chain_owner', 'manager', 'cashier', 'waiter', 'kitchen', 'driver', 'table_manager'];
      const pass = 'password123';
      
      // Check if demo restaurant exists
      const q = query(collection(db, 'restaurants'), where('slug', '==', 'demo-restaurant'));
      const snap = await getDocs(q);
      let resId = '';
      
      if (snap.empty) {
        const resRef = await addDoc(collection(db, 'restaurants'), {
          name: 'مطعم النخيل التجريبي',
          slug: 'demo-restaurant',
          ownerId: 'owner@sana.com',
          description: 'هذا مطعم تجريبي لتجربة النظام',
          featureFlags: { tables: true, drivers: true, points: true, digitalMenu: true },
          theme: { mode: 'dark', primaryColor: '#00FF00' }
        });
        resId = resRef.id;
      } else {
        resId = snap.docs[0].id;
      }

      for (const role of roles) {
        const email = role === 'chain_owner' ? 'owner@sana.com' : `${role}@sana.staff`;
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, pass);
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            name: `تجريبي - ${role}`,
            role: role,
            restaurantId: resId,
            status: 'active',
            email: email
          });
          await signOut(auth);
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
            console.log(`${email} already exists in Auth`);
          } else {
            console.error(`Error creating ${email}:`, e);
          }
        }
      }
      alert('تمت تهيئة الحسابات التجريبية بنجاح! يمكنك الآن استخدام أزرار الدخول التجريبي.');
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تهيئة الحسابات. قد تكون الحسابات موجودة بالفعل.");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      const photo = await capture();
      let emailToUse = '';
      let pass = 'password123';

      if (role === 'chain_owner') {
        emailToUse = 'owner@sana.com';
      } else {
        emailToUse = `${role}@sana.staff`;
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, pass);
      const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as UserProfile;
        await logActivity(userCredential.user, profile, photo);
      }
    } catch (err) {
      setError("تعذر تسجيل الدخول التجريبي. تأكد من إعداد الحسابات.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6 font-sans overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00FF00] opacity-10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00FF00] opacity-10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full z-10"
      >
        <Card className="p-8 bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_0_40px_rgba(0,255,0,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF00] to-transparent opacity-50" />
          
          <div className="text-center space-y-6" dir="rtl">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-black border border-[#00FF00]/30 rounded-2xl flex items-center justify-center text-[#00FF00] shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <Utensils className="w-10 h-10" />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">أنظمة سناء</h1>
              <p className="text-stone-400 mt-2">إدارة المطاعم المتكاملة</p>
            </div>

            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
              <button 
                onClick={() => setLoginType('chain')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  loginType === 'chain' ? "bg-[#00FF00] text-black shadow-[0_0_15px_rgba(0,255,0,0.4)]" : "text-stone-400 hover:text-white"
                )}
              >
                <Mail className="w-4 h-4" />
                مالك السلسلة
              </button>
              <button 
                onClick={() => setLoginType('staff')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  loginType === 'staff' ? "bg-[#00FF00] text-black shadow-[0_0_15px_rgba(0,255,0,0.4)]" : "text-stone-400 hover:text-white"
                )}
              >
                <Smartphone className="w-4 h-4" />
                طاقم العمل
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-right">
              {loginType === 'chain' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input 
                      type="email" 
                      required
                      placeholder="owner@sana.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white placeholder:text-stone-600 focus:border-[#00FF00]/50 focus:ring-1 focus:ring-[#00FF00]/50 outline-none transition-all"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1">رقم الهاتف</label>
                  <div className="relative">
                    <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                    <input 
                      type="tel" 
                      required
                      placeholder="+964 000 000 0000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 text-white placeholder:text-stone-600 focus:border-[#00FF00]/50 focus:ring-1 focus:ring-[#00FF00]/50 outline-none transition-all"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mr-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-12 text-white placeholder:text-stone-600 focus:border-[#00FF00]/50 focus:ring-1 focus:ring-[#00FF00]/50 outline-none transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#00FF00] text-black font-bold text-lg rounded-xl hover:bg-[#00DD00] shadow-[0_0_20px_rgba(0,255,0,0.2)] active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="pt-4 space-y-3">
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">أو الدخول التجريبي</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleDemoLogin('chain_owner')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  مالك السلسلة
                </button>
                <button 
                  onClick={() => handleDemoLogin('manager')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  مدير فرع
                </button>
                <button 
                  onClick={() => handleDemoLogin('cashier')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  كاشير
                </button>
                <button 
                  onClick={() => handleDemoLogin('waiter')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  ويتر
                </button>
                <button 
                  onClick={() => handleDemoLogin('kitchen')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  مطبخ
                </button>
                <button 
                  onClick={() => handleDemoLogin('driver')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all"
                >
                  مندوب
                </button>
                <button 
                  onClick={() => handleDemoLogin('table_manager')}
                  className="py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-stone-400 hover:text-[#00FF00] hover:border-[#00FF00]/30 transition-all col-span-2"
                >
                  مسؤول طاولات
                </button>
              </div>
              <button 
                onClick={bootstrapDemo}
                disabled={bootstrapping}
                className="w-full py-2 mt-2 border border-dashed border-white/10 rounded-lg text-[9px] text-stone-500 hover:text-white transition-all"
              >
                {bootstrapping ? 'جاري التهيئة...' : 'تهيئة الحسابات التجريبية لأول مرة (اضغط هنا إذا لم يعمل الدخول)'}
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-[#00FF00]/60">
              <Camera className="w-3 h-3" />
              <span>التوثيق الأمني مفعل: سيتم التقاط صورة حية عند الدخول.</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const ChainOwnerDashboard = ({ profile }: { profile: UserProfile }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'analytics'>('overview');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Fetch restaurants owned by this chain owner
    const qRes = query(collection(db, 'restaurants'), where('ownerId', '==', auth.currentUser.uid));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
    });

    // Fetch activity logs for this chain
    const qLogs = query(
      collection(db, 'activity_logs'), 
      where('restaurantId', '==', profile.restaurantId || 'all'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubLogs();
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout title="لوحة تحكم مالك السلاسل" role="chain_owner">
      <div className="space-y-8" dir="rtl">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#00FF00]/10 rounded-xl text-[#00FF00]">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-bold">الفروع</p>
                <p className="text-2xl font-bold text-white">{restaurants.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-bold">الموظفون المتصلون</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-bold">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-white">1,284</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-black/40 border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase font-bold">الإيرادات</p>
                <p className="text-2xl font-bold text-white">$12.4k</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 text-sm font-bold transition-all border-b-2",
              activeTab === 'overview' ? "border-[#00FF00] text-[#00FF00]" : "border-transparent text-stone-500 hover:text-white"
            )}
          >
            نظرة عامة على الفروع
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-4 py-2 text-sm font-bold transition-all border-b-2",
              activeTab === 'logs' ? "border-[#00FF00] text-[#00FF00]" : "border-transparent text-stone-500 hover:text-white"
            )}
          >
            سجلات النشاطات
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map(res => (
              <Card key={res.id} className="p-6 bg-black/40 border-white/10 group hover:border-[#00FF00]/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#00FF00]">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{res.name}</h3>
                      <p className="text-xs text-stone-500">{res.region || 'بغداد'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    نشط
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">الإيراد اليومي</span>
                    <span className="text-white font-bold">$420.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">طلبات اليوم</span>
                    <span className="text-white font-bold">24</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs border-white/10 hover:bg-white/5">
                    عرض الفرع
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1 text-xs bg-[#00FF00] text-black">
                    الإعدادات
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <Card className="bg-black/40 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">الموظف</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">الفرع</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">الإجراء</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">التفاصيل</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">التوثيق المرئي</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                            {log.employeeName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{log.employeeName}</p>
                            <p className="text-[10px] text-stone-500 uppercase">{log.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-stone-300">{log.restaurantName}</p>
                        <p className="text-[10px] text-stone-500">{log.region}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          log.actionType === 'login' ? "bg-blue-500/10 text-blue-400" :
                          log.actionType === 'delete' ? "bg-red-500/10 text-red-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        )}>
                          {log.actionType === 'login' ? 'دخول' : log.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-stone-400 max-w-xs truncate">{log.details}</p>
                      </td>
                      <td className="px-6 py-4">
                        {log.userPhoto ? (
                          <div className="w-10 h-10 rounded border border-white/10 overflow-hidden">
                            <img src={log.userPhoto} alt="Audit" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-stone-600">
                            <Camera className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-stone-500">{new Date(log.timestamp).toLocaleTimeString('ar-IQ')}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

const FeatureToggleSystem = ({ restaurant, onUpdate }: { restaurant: Restaurant; onUpdate: (flags: FeatureFlags) => void }) => {
  const flags = restaurant.featureFlags || { tables: false, drivers: false, points: false, digitalMenu: true };

  const toggle = (key: keyof FeatureFlags) => {
    onUpdate({ ...flags, [key]: !flags[key] });
  };

  const features = [
    { key: 'tables', name: 'إدارة الطاولات', icon: Layers, desc: 'إدارة مخططات الطوابق والحجوزات' },
    { key: 'drivers', name: 'تتبع السائقين', icon: MapPin, desc: 'تتبع التوصيل في الوقت الفعلي' },
    { key: 'points', name: 'نقاط الولاء', icon: BarChart3, desc: 'نظام مكافآت العملاء' },
    { key: 'digitalMenu', name: 'المنيو الرقمي', icon: MenuIcon, desc: 'منيو عام عبر رمز QR' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {features.map(f => (
        <Card key={f.key} className={cn(
          "p-4 flex items-center justify-between border-white/10 transition-all",
          flags[f.key as keyof FeatureFlags] ? "bg-[#00FF00]/5 border-[#00FF00]/20" : "bg-white/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              flags[f.key as keyof FeatureFlags] ? "bg-[#00FF00]/20 text-[#00FF00]" : "bg-white/10 text-stone-500"
            )}>
              <f.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{f.name}</h4>
              <p className="text-[10px] text-stone-500">{f.desc}</p>
            </div>
          </div>
          <button 
            onClick={() => toggle(f.key as keyof FeatureFlags)}
            className={cn(
              "w-10 h-5 rounded-full relative transition-all",
              flags[f.key as keyof FeatureFlags] ? "bg-[#00FF00]" : "bg-stone-700"
            )}
          >
            <div className={cn(
              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
              flags[f.key as keyof FeatureFlags] ? "right-1" : "left-1"
            )} />
          </button>
        </Card>
      ))}
    </div>
  );
};

const SuperAdminDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRes, setNewRes] = useState({ name: '', slug: '', ownerEmail: '', ownerName: '' });

  useEffect(() => {
    const q = collection(db, 'restaurants');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app, we'd create the user in Auth too, but here we'll just create the profile
      // and assume they'll log in with that email.
      const resRef = await addDoc(collection(db, 'restaurants'), {
        name: newRes.name,
        slug: newRes.slug.toLowerCase().replace(/\s+/g, '-'),
        ownerId: newRes.ownerEmail, // Using email as ID for simplicity in this demo
        description: `Welcome to ${newRes.name}`,
        featureFlags: { tables: false, drivers: false, points: false, digitalMenu: true },
        theme: { mode: 'dark', primaryColor: '#00FF00' }
      });

      // Create owner profile (mocking UID as email for now)
      // Note: In production, use Firebase Admin SDK to create users
      await addDoc(collection(db, 'users'), {
        uid: newRes.ownerEmail,
        name: newRes.ownerName,
        role: 'chain_owner',
        status: 'active'
      });

      setShowAddModal(false);
      setNewRes({ name: '', slug: '', ownerEmail: '', ownerName: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this restaurant? This will remove all its data.')) return;
    try {
      await deleteDoc(doc(db, 'restaurants', id));
      // In a real app, we'd also delete categories, meals, and orders, or use a Cloud Function
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout title="لوحة تحكم المدير العام" role="super_admin">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" dir="rtl">
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">إجمالي المطاعم</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{restaurants.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">الاشتراكات النشطة</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{restaurants.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">حالة النظام</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-lg font-semibold text-emerald-600">سليم</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6" dir="rtl">
        <h2 className="text-xl font-bold text-stone-900">المطاعم المضافة حديثاً</h2>
        <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          إضافة مطعم
        </Button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="max-w-md w-full p-8 space-y-6" dir="rtl">
            <h3 className="text-xl font-bold text-stone-900">إضافة مطعم جديد</h3>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">اسم المطعم</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none"
                  value={newRes.name}
                  onChange={e => setNewRes({ ...newRes, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">المعرف (Slug)</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: al-nakheel"
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none"
                  value={newRes.slug}
                  onChange={e => setNewRes({ ...newRes, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">بريد المالك</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none"
                  value={newRes.ownerEmail}
                  onChange={e => setNewRes({ ...newRes, ownerEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">اسم المالك</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none"
                  value={newRes.ownerName}
                  onChange={e => setNewRes({ ...newRes, ownerName: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>إلغاء</Button>
                <Button type="submit" className="flex-1">إنشاء مطعم</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Card dir="rtl">
        <table className="w-full text-right">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">المطعم</th>
              <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">المعرف</th>
              <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">المالك</th>
              <th className="px-6 py-4 text-xs font-semibold text-stone-400 uppercase tracking-wider text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {restaurants.map(res => (
              <tr key={res.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-medium text-stone-900">{res.name}</td>
                <td className="px-6 py-4 text-stone-500 font-mono text-sm">/{res.slug}</td>
                <td className="px-6 py-4 text-stone-500">{res.ownerId}</td>
                <td className="px-6 py-4 text-left">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteRestaurant(res.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
};

const MenuManagement = ({ restaurantId }: { restaurantId: string }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: '', description: '', price: 0, categoryId: '', image: '' });

  useEffect(() => {
    if (!restaurantId) return;
    const catQ = collection(db, 'restaurants', restaurantId, 'categories');
    const mealQ = collection(db, 'restaurants', restaurantId, 'meals');

    const unsubCats = onSnapshot(catQ, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    const unsubMeals = onSnapshot(mealQ, (snapshot) => {
      setMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)));
      setLoading(false);
    });

    return () => { unsubCats(); unsubMeals(); };
  }, [restaurantId]);

  const handleAddCategory = async () => {
    const name = prompt('Category Name:');
    if (!name) return;
    await addDoc(collection(db, 'restaurants', restaurantId, 'categories'), {
      name,
      restaurantId,
      order: categories.length
    });
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'restaurants', restaurantId, 'meals'), {
      ...newMeal,
      restaurantId
    });
    setShowAddMeal(false);
    setNewMeal({ name: '', description: '', price: 0, categoryId: '', image: '' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout title="إدارة المنيو" role="restaurant_owner">
      <div className="flex items-center justify-between mb-8" dir="rtl">
        <h2 className="text-2xl font-bold text-stone-900">أقسام المنيو</h2>
        <Button onClick={handleAddCategory} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          قسم جديد
        </Button>
      </div>

      <div className="space-y-8" dir="rtl">
        {categories.map(cat => (
          <div key={cat.id} className="space-y-4">
            <div className="flex items-center justify-between bg-stone-100 p-4 rounded-lg">
              <h3 className="font-bold text-stone-900">{cat.name}</h3>
              <Button size="sm" variant="ghost" onClick={() => {
                setNewMeal({ ...newMeal, categoryId: cat.id });
                setShowAddMeal(true);
              }}>
                <Plus className="w-4 h-4 ml-2" /> إضافة وجبة
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {meals.filter(m => m.categoryId === cat.id).map(meal => (
                <div key={meal.id}>
                  <Card className="p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900">{meal.name}</h4>
                      <p className="text-sm text-stone-500 mt-1">{meal.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-bold text-stone-900">${meal.price.toFixed(2)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm"><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="danger" size="sm"><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAddMeal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="max-w-md w-full p-8 space-y-6" dir="rtl">
            <h3 className="text-xl font-bold text-stone-900">إضافة وجبة جديدة</h3>
            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">اسم الوجبة</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none"
                  value={newMeal.name}
                  onChange={e => setNewMeal({ ...newMeal, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">السعر</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none"
                  value={newMeal.price}
                  onChange={e => setNewMeal({ ...newMeal, price: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">الوصف</label>
                <textarea 
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none h-24"
                  value={newMeal.description}
                  onChange={e => setNewMeal({ ...newMeal, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddMeal(false)}>إلغاء</Button>
                <Button type="submit" className="flex-1">إضافة للمنيو</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

const RestaurantDashboard = ({ profile }: { profile: UserProfile }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const restaurantId = profile.restaurantId || '';

  useEffect(() => {
    if (!restaurantId) return;
    const q = collection(db, 'restaurants', restaurantId, 'orders');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Role-based order filtering
      if (profile.role === 'kitchen') {
        fetchedOrders = fetchedOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
      } else if (profile.role === 'driver') {
        fetchedOrders = fetchedOrders.filter(o => o.status === 'ready_for_delivery' || o.status === 'out_for_delivery');
      }

      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `restaurants/${restaurantId}/orders`);
      setLoading(false);
    });
    return unsubscribe;
  }, [restaurantId, profile.role]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout title="لوحة تحكم المطعم" role={profile.role}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" dir="rtl">
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">طلبات قيد الانتظار</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{orders.filter(o => o.status === 'pending').length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">قيد التحضير</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{orders.filter(o => o.status === 'preparing').length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">مكتملة اليوم</p>
          <p className="text-3xl font-bold text-stone-900 mt-1">{orders.filter(o => o.status === 'completed').length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">إجمالي الإيرادات</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            ${orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.total, 0).toFixed(2)}
          </p>
        </Card>
      </div>

      <div className="space-y-4" dir="rtl">
        {orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
          <div key={order.id}>
            <Card className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  order.status === 'pending' ? "bg-amber-50 text-amber-600" :
                  order.status === 'preparing' ? "bg-blue-50 text-blue-600" :
                  order.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                  "bg-red-50 text-red-600"
                )}>
                  {order.status === 'pending' ? <Clock className="w-6 h-6" /> :
                   order.status === 'preparing' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                   order.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                   <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-stone-900">طلب #{order.id.slice(-4)}</p>
                  <p className="text-sm text-stone-500">{order.customerName} • {order.items.length} وجبات</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {profile.role === 'kitchen' && order.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'preparing')}>بدء التحضير</Button>
                )}
                {profile.role === 'kitchen' && order.status === 'preparing' && (
                  <Button size="sm" variant="primary" onClick={() => updateOrderStatus(order.id, 'completed')}>اكتمال التحضير</Button>
                )}
                {profile.role === 'manager' && order.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'preparing')}>بدء التحضير</Button>
                )}
                <div className="text-right mr-4">
                  <p className="font-bold text-stone-900">${order.total.toFixed(2)}</p>
                  <p className="text-xs text-stone-400">{new Date(order.createdAt).toLocaleTimeString('ar-IQ')}</p>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

const CustomerMenu = () => {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      const q = query(collection(db, 'restaurants'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const resData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Restaurant;
        setRestaurant(resData);

        // Fetch categories
        const catQ = collection(db, 'restaurants', resData.id, 'categories');
        const catSnapshot = await getDocs(catQ);
        setCategories(catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));

        // Fetch meals
        const mealQ = collection(db, 'restaurants', resData.id, 'meals');
        const mealSnapshot = await getDocs(mealQ);
        setMeals(mealSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)));
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [slug]);

  const addToCart = (mealId: string) => {
    setCart(prev => ({ ...prev, [mealId]: (prev[mealId] || 0) + 1 }));
  };

  const cartTotal = Object.entries(cart).reduce((acc, [id, qty]) => {
    const meal = meals.find(m => m.id === id);
    return acc + ((meal?.price || 0) * (qty as number));
  }, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const orderItems: OrderItem[] = Object.entries(cart).map(([id, qty]) => {
      const meal = meals.find(m => m.id === id)!;
      return {
        mealId: id,
        name: meal.name,
        price: meal.price,
        quantity: qty as number
      };
    });

    await addDoc(collection(db, 'restaurants', restaurant.id, 'orders'), {
      restaurantId: restaurant.id,
      items: orderItems,
      total: cartTotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone
    });

    setOrderPlaced(true);
    setCart({});
    setShowCheckout(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Restaurant not found.</div>;

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 font-sans" dir="rtl">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">تم إرسال الطلب!</h1>
            <p className="text-stone-500 mt-2">تم إرسال طلبك إلى المطبخ. سنتصل بك إذا لزم الأمر.</p>
          </div>
          <Button onClick={() => setOrderPlaced(false)} className="w-full">طلب جديد</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24" dir="rtl">
      {/* Hero */}
      <div className="h-64 bg-stone-900 relative overflow-hidden">
        {restaurant.logo && <img src={restaurant.logo} className="w-full h-full object-cover opacity-50" alt="" referrerPolicy="no-referrer" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="mt-2 text-stone-300 max-w-md">{restaurant.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-12">
        {categories.sort((a, b) => a.order - b.order).map(category => (
          <section key={category.id}>
            <h2 className="text-2xl font-bold text-stone-900 mb-6 flex items-center gap-3">
              {category.name}
              <div className="flex-1 h-px bg-stone-200" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meals.filter(m => m.categoryId === category.id).map(meal => (
                <div key={meal.id}>
                  <Card className="flex p-4 gap-4">
                    {meal.image && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={meal.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-stone-900">{meal.name}</h3>
                        <p className="text-sm text-stone-500 line-clamp-2">{meal.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-stone-900">${meal.price.toFixed(2)}</span>
                        <Button size="sm" variant="outline" onClick={() => addToCart(meal.id)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart Bar */}
      {cartTotal > 0 && (
        <div className="fixed bottom-6 left-1/2 translate-x-1/2 w-full max-w-md px-6 z-50">
          <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">طلبك</p>
                <p className="font-bold">${cartTotal.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="secondary" className="gap-2" onClick={() => setShowCheckout(true)}>
              إتمام الطلب
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="max-w-md w-full p-8 space-y-6" dir="rtl">
            <h3 className="text-xl font-bold text-stone-900">إكمال طلبك</h3>
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">اسمك</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none"
                  value={customerInfo.name}
                  onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">رقم الهاتف</label>
                <input 
                  type="tel" required
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none"
                  value={customerInfo.phone}
                  onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                />
              </div>
              <div className="pt-4 border-t border-stone-100">
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>الإجمالي</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>إلغاء</Button>
                  <Button type="submit" className="flex-1">تأكيد الطلب</Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeConfig>({ mode: 'dark', primaryColor: '#00FF00' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Check if it's the super admin
          if (firebaseUser.email === 'ddoorrxxpp@gmail.com') {
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Super Admin',
              role: 'super_admin',
              status: 'active'
            });
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleMode = () => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleMode }}>
      <ErrorBoundary>
        <CameraProvider>
          <div className={cn(
            "min-h-screen transition-colors duration-300",
            theme.mode === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-stone-50 text-stone-900"
          )}>
            <Router>
              <Routes>
                {/* Public Menu */}
                <Route path="/menu/:slug" element={<CustomerMenu />} />

                {/* Auth Routes */}
                <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />

                {/* Protected Dashboard Routes */}
                <Route path="/" element={
                  !user ? <Navigate to="/login" /> :
                  profile?.role === 'super_admin' ? <Navigate to="/admin" /> :
                  profile?.role === 'chain_owner' ? <Navigate to="/chain" /> :
                  <Navigate to="/restaurant" />
                } />

                <Route path="/admin/*" element={
                  profile?.role === 'super_admin' ? <SuperAdminDashboard /> : <Navigate to="/" />
                } />

                <Route path="/chain/*" element={
                  profile?.role === 'chain_owner' ? <ChainOwnerDashboard profile={profile} /> : <Navigate to="/" />
                } />

                <Route path="/restaurant/*" element={
                  profile ? <RestaurantDashboard profile={profile} /> : <Navigate to="/" />
                } />

                <Route path="*" element={<div className="p-8 text-center">404 - Page Not Found</div>} />
              </Routes>
            </Router>
          </div>
        </CameraProvider>
      </ErrorBoundary>
    </ThemeContext.Provider>
  );
}
