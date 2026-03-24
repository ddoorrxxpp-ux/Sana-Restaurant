export type UserRole = 'super_admin' | 'chain_owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'driver' | 'table_manager';

export interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  restaurantId?: string; // For staff, which restaurant they belong to
  chainOwnerId?: string; // For chain owners, which chain they own
  status: 'active' | 'inactive';
  phone?: string;
  email?: string;
  photoUrl?: string; // Last login photo
}

export interface FeatureFlags {
  tables: boolean;
  drivers: boolean;
  points: boolean;
  digitalMenu: boolean;
}

export interface ThemeConfig {
  mode: 'dark' | 'light';
  primaryColor: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  ownerId: string; // Chain owner UID
  region?: string;
  featureFlags: FeatureFlags;
  theme: ThemeConfig;
}

export interface ActivityLog {
  id: string;
  employeeName: string;
  role: UserRole;
  restaurantId: string;
  restaurantName: string;
  region: string;
  actionType: string; // 'login' | 'delete' | 'update' | 'create'
  details: string;
  userPhoto: string; // Base64 or URL
  deviceInfo: {
    browser: string;
    ip: string;
  };
  timestamp: string; // Server time - Baghdad
}

export interface Category {
  id: string;
  name: string;
  restaurantId: string;
  order: number;
}

export interface Meal {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  restaurantId: string;
}

export interface OrderItem {
  mealId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready_for_delivery' | 'out_for_delivery' | 'completed' | 'cancelled';
  createdAt: string;
  customerName: string;
  customerPhone: string;
}
