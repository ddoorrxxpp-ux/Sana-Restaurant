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
  Palette,
  X,
  Check,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Contexts ---
type Language = 'ar' | 'en' | 'ku';

const translations = {
  ar: {
    appName: 'أنظمة سناء',
    dashboard: 'لوحة التحكم',
    restaurants: 'المطاعم',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    addRestaurant: 'إضافة مطعم',
    restaurantName: 'اسم المطعم',
    slug: 'الرابط المختصر',
    owner: 'المالك',
    actions: 'الإجراءات',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    loading: 'جاري التحميل...',
    noRestaurants: 'لا يوجد مطاعم مضافة بعد.',
    superAdmin: 'المدير العام',
    chainOwner: 'مالك السلسلة',
    manager: 'مدير فرع',
    cashier: 'كاشير',
    waiter: 'ويتر (نادل)',
    kitchen: 'مطبخ',
    driver: 'مندوب توصيل',
    tableManager: 'مسؤول طاولات',
    theme: 'المظهر',
    language: 'اللغة',
    light: 'فاتح',
    dark: 'داكن',
    arabic: 'العربية',
    english: 'English',
    kurdish: 'کوردی',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    demoLogin: 'دخول تجريبي',
    bootstrapDemo: 'تهيئة الحسابات التجريبية',
    error: 'حدث خطأ ما',
    insufficientPermissions: 'عذراً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء أو الوصول لهذه البيانات.',
    unexpectedError: 'حدث خطأ غير متوقع في التطبيق. يرجى المحاولة مرة أخرى لاحقاً.',
    reload: 'إعادة تحميل الصفحة',
    orders: 'الطلبات',
    categories: 'الأصناف',
    meals: 'الوجبات',
    activityLogs: 'سجل النشاطات',
    stats: 'الإحصائيات',
    totalOrders: 'إجمالي الطلبات',
    totalSales: 'إجمالي المبيعات',
    activeUsers: 'المستخدمين النشطين',
    newOrder: 'طلب جديد',
    customerName: 'اسم الزبون',
    phone: 'رقم الهاتف',
    total: 'المجموع',
    status: 'الحالة',
    pending: 'قيد الانتظار',
    preparing: 'جاري التحضير',
    ready: 'جاهز للتوصيل',
    outForDelivery: 'خارج للتوصيل',
    completed: 'تم التسليم',
    cancelled: 'ملغي',
    confirmDelete: 'هل أنت متأكد من الحذف؟ سيتم مسح كافة البيانات المرتبطة.',
    active: 'نشط',
    capture: 'التقاط صورة',
    noRestaurant: 'لم يتم العثور على مطعم مرتبط بهذا الحساب.',
    restaurantSettings: 'إعدادات المطعم',
    logoDesc: 'سيظهر الشعار في المنيو الرقمي ولوحات التحكم.',
    dangerZone: 'منطقة الخطر',
    dangerZoneDesc: 'تعطيل الحساب سيمنع الوصول إلى النظام بشكل مؤقت.',
    deactivateAccount: 'تعطيل الحساب',
    currency: 'د.ع',
    yourOrder: 'طلبك',
    placeOrder: 'إتمام الطلب',
    checkout: 'الدفع',
    completeOrder: 'إكمال طلبك',
    confirmOrder: 'تأكيد الطلب',
    orderSuccess: 'تم استلام طلبك بنجاح!',
    orderSuccessDesc: 'سيتم تحضير طلبك وتوصيله في أقرب وقت ممكن.',
    backToMenu: 'العودة للمنيو',
    todayOrders: 'طلبات اليوم',
    viewBranch: 'عرض الفرع',
    employee: 'الموظف',
    branch: 'الفرع',
    action: 'الإجراء',
    details: 'التفاصيل',
    visualAudit: 'التوثيق المرئي',
    time: 'الوقت',
    loginAction: 'دخول',
    tableManagement: 'إدارة الطاولات',
    driverTracking: 'تتبع السائقين',
    loyaltyPoints: 'نقاط الولاء',
    digitalMenu: 'المنيو الرقمي',
    tableManagementDesc: 'إدارة مخططات الطوابق والحجوزات',
    driverTrackingDesc: 'تتبع التوصيل في الوقت الفعلي',
    loyaltyPointsDesc: 'نظام مكافآت العملاء',
    digitalMenuDesc: 'منيو عام عبر رمز QR',
  },
  en: {
    appName: 'Sanaa Systems',
    dashboard: 'Dashboard',
    restaurants: 'Restaurants',
    settings: 'Settings',
    logout: 'Logout',
    addRestaurant: 'Add Restaurant',
    restaurantName: 'Restaurant Name',
    slug: 'Slug',
    owner: 'Owner',
    actions: 'Actions',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    noRestaurants: 'No restaurants added yet.',
    superAdmin: 'Super Admin',
    chainOwner: 'Chain Owner',
    manager: 'Branch Manager',
    cashier: 'Cashier',
    waiter: 'Waiter',
    kitchen: 'Kitchen',
    driver: 'Driver',
    tableManager: 'Table Manager',
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    arabic: 'العربية',
    english: 'English',
    kurdish: 'کوردی',
    login: 'Login',
    email: 'Email',
    password: 'Password',
    demoLogin: 'Demo Login',
    bootstrapDemo: 'Initialize Demo Accounts',
    error: 'Something went wrong',
    insufficientPermissions: 'Sorry, you do not have sufficient permissions to perform this action or access this data.',
    unexpectedError: 'An unexpected error occurred. Please try again later.',
    reload: 'Reload Page',
    orders: 'Orders',
    categories: 'Categories',
    meals: 'Meals',
    activityLogs: 'Activity Logs',
    stats: 'Statistics',
    totalOrders: 'Total Orders',
    totalSales: 'Total Sales',
    activeUsers: 'Active Users',
    newOrder: 'New Order',
    customerName: 'Customer Name',
    phone: 'Phone',
    total: 'Total',
    status: 'Status',
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready for Delivery',
    outForDelivery: 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
    confirmDelete: 'Are you sure you want to delete? All associated data will be removed.',
    active: 'Active',
    capture: 'Capture Photo',
    noRestaurant: 'No restaurant found for this account.',
    restaurantSettings: 'Restaurant Settings',
    logoDesc: 'The logo will appear in the digital menu and dashboards.',
    dangerZone: 'Danger Zone',
    dangerZoneDesc: 'Deactivating the account will temporarily prevent access to the system.',
    deactivateAccount: 'Deactivate Account',
    currency: 'IQD',
    yourOrder: 'Your Order',
    placeOrder: 'Place Order',
    checkout: 'Checkout',
    completeOrder: 'Complete Your Order',
    confirmOrder: 'Confirm Order',
    orderSuccess: 'Order Placed Successfully!',
    orderSuccessDesc: 'Your order will be prepared and delivered as soon as possible.',
    backToMenu: 'Back to Menu',
    todayOrders: 'Today\'s Orders',
    viewBranch: 'View Branch',
    employee: 'Employee',
    branch: 'Branch',
    action: 'Action',
    details: 'Details',
    visualAudit: 'Visual Audit',
    time: 'Time',
    loginAction: 'Login',
    tableManagement: 'Table Management',
    driverTracking: 'Driver Tracking',
    loyaltyPoints: 'Loyalty Points',
    digitalMenu: 'Digital Menu',
    tableManagementDesc: 'Manage floor plans and reservations',
    driverTrackingDesc: 'Real-time delivery tracking',
    loyaltyPointsDesc: 'Customer rewards system',
    digitalMenuDesc: 'Public menu via QR code',
  },
  ku: {
    appName: 'سیستەمەکانی سەنا',
    dashboard: 'داشبۆرد',
    restaurants: 'چێشتخانەکان',
    settings: 'ڕێکخستنەکان',
    logout: 'چوونە دەرەوە',
    addRestaurant: 'زیادکردنی چێشتخانە',
    restaurantName: 'ناوی چێشتخانە',
    slug: 'بەستەری کورت',
    owner: 'خاوەن',
    actions: 'کردارەکان',
    save: 'پاشەکەوتکردن',
    cancel: 'پاشگەزبوونەوە',
    delete: 'سڕینەوە',
    edit: 'دەستکاریکردن',
    loading: 'بارکردن...',
    noRestaurants: 'هیچ چێشتخانەیەک زیاد نەکراوە.',
    superAdmin: 'بەڕێوەبەری گشتی',
    chainOwner: 'خاوەنی زنجیرە',
    manager: 'بەڕێوەبەری لق',
    cashier: 'کاشێر',
    waiter: 'وەیتەر',
    kitchen: 'مەتبەخ',
    driver: 'گەیاندن',
    tableManager: 'بەڕێوەبەری مێزەکان',
    theme: 'ڕووکار',
    language: 'زمان',
    light: 'ڕووناک',
    dark: 'تاریک',
    arabic: 'العربية',
    english: 'English',
    kurdish: 'کوردی',
    login: 'چوونە ژوورەوە',
    email: 'ئیمەیڵ',
    password: 'وشەی نهێنی',
    demoLogin: 'چوونە ژوورەوەی تاقیکاری',
    bootstrapDemo: 'ئامادەکردنی هەژمارە تاقیکارییەکان',
    error: 'هەڵەیەک ڕوویدا',
    insufficientPermissions: 'ببورە، دەسەڵاتی پێویستت نییە بۆ ئەم کارە.',
    unexpectedError: 'هەڵەیەکی چاوەڕواننەکراو ڕوویدا. تکایە دواتر هەوڵ بدەرەوە.',
    reload: 'دووبارە بارکردنەوەی پەڕە',
    orders: 'داواکارییەکان',
    categories: 'جۆرەکان',
    meals: 'ژەمەکان',
    activityLogs: 'تۆماری چالاکییەکان',
    stats: 'ئامارەکان',
    totalOrders: 'کۆی داواکارییەکان',
    totalSales: 'کۆی فرۆش',
    activeUsers: 'بەکارهێنەرە چالاکەکان',
    newOrder: 'داواکاری نوێ',
    customerName: 'ناوی کڕیار',
    phone: 'ژمارەی تەلەفۆن',
    total: 'کۆ',
    status: 'بارودۆخ',
    pending: 'لە چاوەڕوانیدا',
    preparing: 'لە ئامادەکردندایە',
    ready: 'ئامادەیە بۆ گەیاندن',
    outForDelivery: 'لە ڕێگایە بۆ گەیاندن',
    completed: 'تەواو بوو',
    cancelled: 'هەڵوەشایەوە',
    confirmDelete: 'ئایا دڵنیایت لە سڕینەوە؟ هەموو زانیارییە پەیوەندیدارەکان دەسڕێنەوە.',
    active: 'چالاک',
    capture: 'وێنەگرتن',
    noRestaurant: 'هیچ چێشتخانەیەک بۆ ئەم هەژمارە نەدۆزرایەوە.',
    restaurantSettings: 'ڕێکخستنەکانی چێشتخانە',
    logoDesc: 'لۆگۆکە لە مینیۆی دیجیتاڵی و داشبۆردەکاندا دەردەکەوێت.',
    dangerZone: 'ناوچەی مەترسی',
    dangerZoneDesc: 'ناچالاککردنی هەژمارەکە بە شێوەیەکی کاتی ڕێگری لە دەستگەیشتن بە سیستەمەکە دەکات.',
    deactivateAccount: 'ناچالاککردنی هەژمارە',
    currency: 'د.ع',
    yourOrder: 'داواکارییەکەت',
    placeOrder: 'تەواوکردنی داواکاری',
    checkout: 'پارەدان',
    completeOrder: 'تەواوکردنی داواکارییەکەت',
    confirmOrder: 'تەواوکردنی داواکاری',
    orderSuccess: 'داواکارییەکەت بە سەرکەوتوویی وەرگیرا!',
    orderSuccessDesc: 'داواکارییەکەت ئامادە دەکرێت و لە زووترین کاتدا دەگەیەنرێت.',
    backToMenu: 'گەڕانەوە بۆ مینیۆ',
    todayOrders: 'داواکارییەکانی ئەمڕۆ',
    viewBranch: 'بینینی لق',
    employee: 'کارمەند',
    branch: 'لق',
    action: 'کردار',
    details: 'زانیارییەکان',
    visualAudit: 'تۆماری وێنەیی',
    time: 'کات',
    loginAction: 'چوونە ژوورەوە',
    tableManagement: 'بەڕێوەبردنی مێزەکان',
    driverTracking: 'تتبع السائقين',
    loyaltyPoints: 'نقاط الولاء',
    digitalMenu: 'المنيو الرقمي',
    tableManagementDesc: 'إدارة مخططات الطوابق والحجوزات',
    driverTrackingDesc: 'تتبع التوصيل في الوقت الفعلي',
    loyaltyPointsDesc: 'نظام مكافآت العملاء',
    digitalMenuDesc: 'منيو عام عبر رمز QR',
  }
};

const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations['ar']) => string;
}>({
  lang: 'ar',
  setLang: () => {},
  t: (key) => translations['ar'][key],
});

const useLanguage = () => useContext(LanguageContext);

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
            <h2 className="text-xl font-bold text-stone-900">حدث خطأ ما / Something went wrong</h2>
            <p className="text-stone-600 text-sm">
              {this.state.error?.message.includes('{"error":') 
                ? "عذراً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء أو الوصول لهذه البيانات."
                : "حدث خطأ غير متوقع في التطبيق. يرجى المحاولة مرة أخرى لاحقاً."}
            </p>
            <Button onClick={() => window.location.reload()}>إعادة تحميل الصفحة / Reload Page</Button>
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
const DashboardLayout = ({ children, title, role, restaurant }: { children: React.ReactNode; title: string; role: string; restaurant?: Restaurant | null }) => {
  const handleLogout = () => signOut(auth);
  const { theme, toggleMode } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const roleLabels: Record<string, keyof typeof translations['ar']> = {
    super_admin: 'superAdmin',
    chain_owner: 'chainOwner',
    manager: 'manager',
    cashier: 'cashier',
    waiter: 'waiter',
    kitchen: 'kitchen',
    driver: 'driver',
    table_manager: 'tableManager'
  };

  const isRTL = lang === 'ar' || lang === 'ku';

  return (
    <div className={cn(
      "flex min-h-screen font-sans transition-colors duration-300",
      theme.mode === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-stone-50 text-stone-900"
    )} dir={isRTL ? "rtl" : "ltr"}>
      
      {/* Mobile Header */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-50 border-b",
        theme.mode === 'dark' ? "bg-black/80 border-white/10 backdrop-blur-xl" : "bg-white/80 border-stone-200 backdrop-blur-xl"
      )}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          <MenuIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 font-bold">
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-[#00FF00] rounded-lg flex items-center justify-center text-black">
              <Utensils className="w-5 h-5" />
            </div>
          )}
          <span>{restaurant?.name || t('appName')}</span>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 z-50 w-64 border-l flex flex-col transition-all duration-300 lg:static lg:translate-x-0",
        isRTL ? (isSidebarOpen ? "right-0" : "right-[-256px]") : (isSidebarOpen ? "left-0" : "left-[-256px]"),
        theme.mode === 'dark' ? "bg-black/40 border-white/10 backdrop-blur-xl" : "bg-white border-stone-200"
      )}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            {restaurant?.logo ? (
              <img src={restaurant.logo} alt={restaurant.name} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-[#00FF00] rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]">
                <Utensils className="w-5 h-5" />
              </div>
            )}
            <span>{restaurant?.name || t('appName')}</span>
          </div>
          <p className="text-[10px] text-stone-500 mt-2 uppercase tracking-widest font-bold">
            {t(roleLabels[role] || 'manager')}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {role === 'super_admin' ? (
            <>
              <Link to="/admin" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">{t('dashboard')}</span>
              </Link>
              <Link to="/admin/restaurants" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <Store className="w-5 h-5" />
                <span className="text-sm font-bold">{t('restaurants')}</span>
              </Link>
            </>
          ) : role === 'chain_owner' ? (
            <>
              <Link to="/chain" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">{t('dashboard')}</span>
              </Link>
              <Link to="/chain/logs" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-bold">{t('activityLogs')}</span>
              </Link>
              <Link to="/chain/analytics" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-bold">{t('stats')}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/restaurant" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm font-bold">{t('dashboard')}</span>
              </Link>
              
              {(role === 'manager' || role === 'cashier' || role === 'waiter') && (
                <Link to="/restaurant/orders" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('orders')}</span>
                </Link>
              )}

              {(role === 'manager') && (
                <Link to="/restaurant/menu" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <MenuIcon className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('categories')}</span>
                </Link>
              )}

              {(role === 'manager' || role === 'kitchen') && (
                <Link to="/restaurant/kitchen" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <Utensils className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('kitchen')}</span>
                </Link>
              )}

              {(role === 'manager' || role === 'table_manager' || role === 'waiter') && (
                <Link to="/restaurant/tables" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <Layers className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('tableManager')}</span>
                </Link>
              )}

              {(role === 'manager' || role === 'driver') && (
                <Link to="/restaurant/delivery" className="flex items-center gap-3 px-3 py-2 text-stone-400 hover:text-[#00FF00] hover:bg-[#00FF00]/5 rounded-lg transition-all">
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-bold">{t('driver')}</span>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 p-1 bg-black/20 rounded-lg">
            {(['ar', 'en', 'ku'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                  lang === l ? "bg-[#00FF00] text-black" : "text-stone-500 hover:text-stone-300"
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <button 
            onClick={toggleMode}
            className="flex items-center gap-3 w-full px-3 py-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            {theme.mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="text-sm font-bold">{theme.mode === 'dark' ? t('light') : t('dark')}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-md transition-colors duration-300 hidden lg:flex",
          theme.mode === 'dark' ? "bg-black/40 border-white/10" : "bg-white/80 border-stone-200"
        )}>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold">{auth.currentUser?.displayName || 'مستخدم'}</p>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                {t(roleLabels[role] || 'manager')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00FF00] to-emerald-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Users className="w-5 h-5 text-[#00FF00]" />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto mt-16 lg:mt-0">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
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
  const { t } = useLanguage();
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
                    <span className="text-stone-500">{t('todayOrders')}</span>
                    <span className="text-white font-bold">24</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs border-white/10 hover:bg-white/5">
                    {t('viewBranch')}
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1 text-xs bg-[#00FF00] text-black">
                    {t('settings')}
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
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('employee')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('branch')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('action')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('details')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('visualAudit')}</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">{t('time')}</th>
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
                          {log.actionType === 'login' ? t('loginAction') : log.actionType}
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
  const { t } = useLanguage();
  const flags = restaurant.featureFlags || { tables: false, drivers: false, points: false, digitalMenu: true };

  const toggle = (key: keyof FeatureFlags) => {
    onUpdate({ ...flags, [key]: !flags[key] });
  };

  const features = [
    { key: 'tables', name: t('tableManagement'), icon: Layers, desc: t('tableManagementDesc') },
    { key: 'drivers', name: t('driverTracking'), icon: MapPin, desc: t('driverTrackingDesc') },
    { key: 'points', name: t('loyaltyPoints'), icon: BarChart3, desc: t('loyaltyPointsDesc') },
    { key: 'digitalMenu', name: t('digitalMenu'), icon: MenuIcon, desc: t('digitalMenuDesc') },
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
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRes, setEditingRes] = useState<Restaurant | null>(null);
  const [newRes, setNewRes] = useState({ name: '', slug: '', ownerEmail: '', ownerName: '', logo: '' });
  const { capture } = useCamera();

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
      if (editingRes) {
        await updateDoc(doc(db, 'restaurants', editingRes.id), {
          name: newRes.name,
          slug: newRes.slug.toLowerCase().replace(/\s+/g, '-'),
          logo: newRes.logo
        });
      } else {
        await addDoc(collection(db, 'restaurants'), {
          name: newRes.name,
          slug: newRes.slug.toLowerCase().replace(/\s+/g, '-'),
          ownerId: newRes.ownerEmail,
          logo: newRes.logo,
          description: `Welcome to ${newRes.name}`,
          featureFlags: { tables: false, drivers: false, points: false, digitalMenu: true },
          theme: { mode: 'dark', primaryColor: '#00FF00' }
        });

        await addDoc(collection(db, 'users'), {
          uid: newRes.ownerEmail,
          name: newRes.ownerName,
          role: 'chain_owner',
          status: 'active'
        });
      }

      setShowAddModal(false);
      setEditingRes(null);
      setNewRes({ name: '', slug: '', ownerEmail: '', ownerName: '', logo: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'restaurants', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCaptureLogo = async () => {
    const photo = await capture();
    if (photo) {
      setNewRes({ ...newRes, logo: photo });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <DashboardLayout title={t('superAdmin')} role="super_admin">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-black/40 border-white/10">
          <p className="text-sm text-stone-400 font-bold uppercase">{t('restaurants')}</p>
          <p className="text-3xl font-bold text-white mt-1">{restaurants.length}</p>
        </Card>
        <Card className="p-6 bg-black/40 border-white/10">
          <p className="text-sm text-stone-400 font-bold uppercase">{t('activeOrders')}</p>
          <p className="text-3xl font-bold text-white mt-1">{restaurants.length}</p>
        </Card>
        <Card className="p-6 bg-black/40 border-white/10">
          <p className="text-sm text-stone-400 font-bold uppercase">{t('status')}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
            <p className="text-lg font-bold text-[#00FF00]">{t('active')}</p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{t('restaurants')}</h2>
        <Button size="sm" className="gap-2 bg-[#00FF00] text-black" onClick={() => {
          setEditingRes(null);
          setNewRes({ name: '', slug: '', ownerEmail: '', ownerName: '', logo: '' });
          setShowAddModal(true);
        }}>
          <Plus className="w-4 h-4" />
          {t('addRestaurant')}
        </Button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <Card className="max-w-md w-full p-8 bg-stone-900 border-white/10 space-y-6">
            <h3 className="text-xl font-bold text-white">{editingRes ? t('edit') : t('addRestaurant')}</h3>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-400 mb-1">{t('restaurantName')}</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00FF00]"
                  value={newRes.name}
                  onChange={e => setNewRes({ ...newRes, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-400 mb-1">Slug</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00FF00]"
                  value={newRes.slug}
                  onChange={e => setNewRes({ ...newRes, slug: e.target.value })}
                />
              </div>
              {!editingRes && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-stone-400 mb-1">{t('email')}</label>
                    <input 
                      type="email" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00FF00]"
                      value={newRes.ownerEmail}
                      onChange={e => setNewRes({ ...newRes, ownerEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-400 mb-1">{t('name')}</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00FF00]"
                      value={newRes.ownerName}
                      onChange={e => setNewRes({ ...newRes, ownerName: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold text-stone-400 mb-1">{t('logo')}</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {newRes.logo ? (
                      <img src={newRes.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Store className="w-6 h-6 text-stone-600" />
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleCaptureLogo} className="gap-2">
                    <Camera className="w-4 h-4" />
                    {t('capture')}
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>{t('cancel')}</Button>
                <Button type="submit" className="flex-1 bg-[#00FF00] text-black">{editingRes ? t('save') : t('addRestaurant')}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Card className="bg-black/40 border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">{t('restaurants')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Slug</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">{t('owner')}</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-left">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {restaurants.map(res => (
                <tr key={res.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {res.logo ? (
                          <img src={res.logo} alt={res.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Store className="w-5 h-5 text-stone-600" />
                        )}
                      </div>
                      <span className="font-bold text-white">{res.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-400 font-mono text-sm">/{res.slug}</td>
                  <td className="px-6 py-4 text-stone-400">{res.ownerId}</td>
                  <td className="px-6 py-4 text-left">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingRes(res);
                        setNewRes({ name: res.name, slug: res.slug, ownerEmail: res.ownerId || '', ownerName: '', logo: res.logo || '' });
                        setShowAddModal(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteRestaurant(res.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [editingName, setEditingName] = useState('');
  const { capture } = useCamera();
  const { t } = useLanguage();
  const restaurantId = profile.restaurantId || '';

  useEffect(() => {
    if (!restaurantId) {
      // If it's a chain owner or super admin, they might not have a direct restaurantId
      // But for this dashboard, we expect one. Let's try to find one if they are a manager.
      setLoading(false);
      return;
    }

    const unsubscribeRes = onSnapshot(doc(db, 'restaurants', restaurantId), (docSnap) => {
      if (docSnap.exists()) {
        const resData = { id: docSnap.id, ...docSnap.data() } as Restaurant;
        setRestaurant(resData);
        setEditingName(resData.name);

        const qOrders = collection(db, 'restaurants', restaurantId, 'orders');
        const unsubscribeOrders = onSnapshot(qOrders, (orderSnap) => {
          let fetchedOrders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          
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

        return () => unsubscribeOrders();
      } else {
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `restaurants/${restaurantId}`);
      setLoading(false);
    });

    return () => unsubscribeRes();
  }, [restaurantId, profile.role]);

  const updateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSettings = async () => {
    if (!restaurant) return;
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        name: editingName
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLogo = async () => {
    if (!restaurant) return;
    const photo = await capture();
    if (photo) {
      try {
        await updateDoc(doc(db, 'restaurants', restaurant.id), {
          logo: photo
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!restaurant) return <div className="p-8 text-center text-stone-500">{t('noRestaurant')}</div>;

  return (
    <DashboardLayout title={restaurant.name} role={profile.role} restaurant={restaurant}>
      <div className="space-y-6">
        {(profile.role === 'manager' || profile.role === 'chain_owner') && (
          <div className="flex items-center gap-4 border-b border-white/10 pb-4">
            <button 
              onClick={() => setActiveTab('orders')}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-colors",
                activeTab === 'orders' ? "text-[#00FF00] border-b-2 border-[#00FF00]" : "text-stone-500 hover:text-white"
              )}
            >
              {t('orders')}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-4 py-2 text-sm font-bold transition-colors",
                activeTab === 'settings' ? "text-[#00FF00] border-b-2 border-[#00FF00]" : "text-stone-500 hover:text-white"
              )}
            >
              {t('settings')}
            </button>
          </div>
        )}

        {activeTab === 'orders' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['pending', 'preparing', 'ready_for_delivery'] as const).map(status => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
                    {t(status)}
                  </h3>
                  <span className="bg-white/5 text-stone-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {orders.filter(o => o.status === status).length}
                  </span>
                </div>
                <div className="space-y-4">
                  {orders.filter(o => o.status === status).map(order => (
                    <Card key={order.id} className="p-4 bg-black/40 border-white/10 hover:border-[#00FF00]/30 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-stone-500">#{order.id.slice(-4)}</p>
                          <p className="text-sm font-bold text-white mt-1">{order.customerName}</p>
                        </div>
                        <p className="text-sm font-bold text-[#00FF00]">{order.total} {t('currency')}</p>
                      </div>
                      <div className="space-y-1 mb-4">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-stone-400">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {status === 'pending' && (profile.role === 'manager' || profile.role === 'kitchen') && (
                          <Button size="sm" className="flex-1 bg-[#00FF00] text-black" onClick={() => updateStatus(order.id, 'preparing')}>
                            {t('preparing')}
                          </Button>
                        )}
                        {status === 'preparing' && (profile.role === 'manager' || profile.role === 'kitchen') && (
                          <Button size="sm" className="flex-1 bg-[#00FF00] text-black" onClick={() => updateStatus(order.id, 'ready_for_delivery')}>
                            {t('ready')}
                          </Button>
                        )}
                        {status === 'ready_for_delivery' && (profile.role === 'manager' || profile.role === 'driver') && (
                          <Button size="sm" className="flex-1 bg-emerald-500 text-white" onClick={() => updateStatus(order.id, 'completed')}>
                            {t('completed')}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-2xl space-y-8">
            <Card className="p-8 bg-black/40 border-white/10 space-y-6">
              <h3 className="text-xl font-bold text-white">{t('restaurantSettings')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-400 mb-2">{t('restaurantName')}</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#00FF00]"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                    />
                    <Button onClick={handleUpdateSettings} className="bg-[#00FF00] text-black">
                      {t('save')}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-400 mb-2">{t('logo')}</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {restaurant.logo ? (
                        <img src={restaurant.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Store className="w-8 h-8 text-stone-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={handleUpdateLogo}>
                        <Camera className="w-4 h-4" />
                        {t('capture')}
                      </Button>
                      <p className="text-[10px] text-stone-500">{t('logoDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-black/40 border-white/10 space-y-4">
              <h3 className="text-xl font-bold text-white">{t('dangerZone')}</h3>
              <p className="text-sm text-stone-400">{t('dangerZoneDesc')}</p>
              <Button variant="danger" className="w-full sm:w-auto">
                {t('deactivateAccount')}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const CustomerMenu = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t, setLang } = useLanguage();
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

        const catQ = collection(db, 'restaurants', resData.id, 'categories');
        const catSnapshot = await getDocs(catQ);
        setCategories(catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));

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

  const removeFromCart = (mealId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[mealId] > 1) newCart[mealId]--;
      else delete newCart[mealId];
      return newCart;
    });
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

    try {
      await addDoc(collection(db, 'restaurants', restaurant.id, 'orders'), {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        items: orderItems,
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setOrderPlaced(true);
      setCart({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `restaurants/${restaurant.id}/orders`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-950"><LoadingSpinner /></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center bg-stone-950 text-white">{t('error')}</div>;

  const isRtl = lang === 'ar' || lang === 'ku';

  return (
    <div className={`min-h-screen bg-stone-950 pb-32 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-stone-950 z-10" />
        <img 
          src={restaurant.logo || "https://picsum.photos/seed/restaurant/1920/1080"} 
          alt={restaurant.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
          <div className="max-w-4xl mx-auto flex items-end gap-6">
            <div className="w-24 h-24 rounded-2xl bg-stone-900 border-4 border-stone-950 overflow-hidden shadow-2xl">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Store className="w-10 h-10 text-stone-700" /></div>
              )}
            </div>
            <div className="flex-1 mb-2">
              <h1 className="text-3xl font-black text-white tracking-tight">{restaurant.name}</h1>
              <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mt-1">Digital Menu</p>
            </div>
            
            {/* Language Switcher */}
            <div className="flex gap-2 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10 mb-2">
              {(['ar', 'en', 'ku'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${
                    lang === l ? 'bg-[#00FF00] text-black' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t(l === 'ar' ? 'arabic' : l === 'en' ? 'english' : 'kurdish')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-12 space-y-12">
        {categories.map(category => (
          <section key={category.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-white tracking-tight">{category.name}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meals.filter(m => m.categoryId === category.id).map(meal => (
                <Card key={meal.id} className="group overflow-hidden bg-stone-900/50 border-white/5 hover:border-[#00FF00]/30 transition-all duration-500">
                  <div className="flex h-32">
                    <div className="w-32 h-full overflow-hidden">
                      <img 
                        src={meal.image || "https://picsum.photos/seed/food/400/400"} 
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{meal.name}</h3>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-1">{meal.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[#00FF00] font-black">{meal.price} {t('currency')}</span>
                        <div className="flex items-center gap-3">
                          {cart[meal.id] > 0 && (
                            <>
                              <button 
                                onClick={() => removeFromCart(meal.id)}
                                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="text-white font-bold text-sm w-4 text-center">{cart[meal.id]}</span>
                            </>
                          )}
                          <button 
                            onClick={() => addToCart(meal.id)}
                            className="w-8 h-8 rounded-full bg-[#00FF00] flex items-center justify-center text-black hover:scale-110 transition-all shadow-[0_0_15px_rgba(0,255,0,0.3)]"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart Summary Bar */}
      {Object.keys(cart).length > 0 && !showCheckout && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg z-50">
          <button 
            onClick={() => setShowCheckout(true)}
            className="w-full bg-[#00FF00] text-black p-4 rounded-2xl flex items-center justify-between shadow-[0_20px_50px_rgba(0,255,0,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-black/10 p-2 rounded-lg">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('yourOrder')}</p>
                <p className="font-black text-lg leading-none">{(Object.values(cart) as number[]).reduce((a, b) => a + b, 0)} items</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-black">{cartTotal} {t('currency')}</span>
              <ChevronRight className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xl" onClick={() => setShowCheckout(false)} />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="relative w-full max-w-lg bg-stone-900 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">{t('completeOrder')}</h2>
                <button onClick={() => setShowCheckout(false)} className="p-2 rounded-full hover:bg-white/5 text-stone-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {orderPlaced ? (
                <div className="text-center py-12 space-y-6">
                  <div className="w-20 h-20 bg-[#00FF00]/10 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-[#00FF00]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white">{t('orderSuccess')}</h3>
                    <p className="text-stone-400">{t('orderSuccessDesc')}</p>
                  </div>
                  <Button className="w-full bg-[#00FF00] text-black" onClick={() => {
                    setShowCheckout(false);
                    setOrderPlaced(false);
                  }}>
                    {t('backToMenu')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-500 uppercase tracking-widest">{t('customerName')}</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00FF00] transition-all"
                        placeholder="John Doe"
                        value={customerInfo.name}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-500 uppercase tracking-widest">{t('phone')}</label>
                      <input 
                        required
                        type="tel" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#00FF00] transition-all"
                        placeholder="07XX XXX XXXX"
                        value={customerInfo.phone}
                        onChange={e => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-6 space-y-4 border border-white/5">
                    <div className="flex justify-between items-center text-stone-400 text-sm">
                      <span>Subtotal</span>
                      <span>{cartTotal} {t('currency')}</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center text-white font-black text-xl">
                      <span>{t('total')}</span>
                      <span className="text-[#00FF00]">{cartTotal} {t('currency')}</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 text-lg font-black bg-[#00FF00] text-black rounded-2xl shadow-[0_10px_30px_rgba(0,255,0,0.2)]">
                    {t('confirmOrder')}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
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
  const [lang, setLang] = useState<Language>('ar');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
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

  const t = (key: keyof typeof translations['ar']) => {
    return translations[lang][key] || translations['ar'][key];
  };

  if (loading) return <LoadingSpinner />;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <ThemeContext.Provider value={{ theme, setTheme, toggleMode }}>
        <ErrorBoundary>
          <CameraProvider>
            <div className={cn(
              "min-h-screen transition-colors duration-300",
              theme.mode === 'dark' ? "bg-[#0a0a0a] text-white" : "bg-stone-50 text-stone-900"
            )}>
              <Router>
                <Routes>
                  <Route path="/menu/:slug" element={<CustomerMenu />} />
                  <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
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
    </LanguageContext.Provider>
  );
}
