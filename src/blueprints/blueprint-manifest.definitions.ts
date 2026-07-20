import {
  BlueprintManifestV1,
  BlueprintNavItem,
} from './blueprint-manifest.types';
import { assertValidBlueprintManifest } from './blueprint-manifest.validator';
import { AppModuleKey } from '../auth/module-access.constants';

const fashionStandardV1: BlueprintManifestV1 = {
  schemaVersion: '1.0.0',
  businessType: 'fashion',
  blueprintKey: 'fashion-standard',
  blueprintVersion: 'v1',
  displayName: 'Fashion Standard',
  description: 'Retail-first blueprint for apparel, footwear, and boutiques.',
  enabledModules: [
    'dashboard',
    'sales',
    'credits',
    'inventory',
    'expenses',
    'analytics',
    'reports',
    'accounts',
    'settings',
    'billing',
  ],
  navigation: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      requiredModule: 'dashboard',
      order: 10,
    },
    {
      key: 'sales',
      label: 'Sales',
      path: '/sales',
      requiredModule: 'sales',
      order: 20,
    },
    {
      key: 'products',
      label: 'Products',
      path: '/products',
      requiredModule: 'inventory',
      order: 30,
    },
    {
      key: 'inventory',
      label: 'Inventory',
      path: '/inventory',
      requiredModule: 'inventory',
      order: 40,
    },
    {
      key: 'customers',
      label: 'Customers',
      path: '/crm/pipeline',
      requiredModule: 'crm',
      order: 50,
    },
    {
      key: 'expenses',
      label: 'Expenses',
      path: '/expenses',
      requiredModule: 'expenses',
      order: 60,
    },
    {
      key: 'reports',
      label: 'Reports',
      path: '/reports',
      requiredModule: 'reports',
      order: 70,
    },
    {
      key: 'settings',
      label: 'Settings',
      path: '/settings',
      requiredModule: 'settings',
      order: 90,
    },
  ],
  dashboard: [
    {
      key: 'sales_overview',
      title: 'Sales Overview',
      widgetType: 'kpi.sales',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'top_products',
      title: 'Top Products',
      widgetType: 'chart.top_products',
      order: 20,
      requiredModule: 'analytics',
    },
    {
      key: 'stock_alerts',
      title: 'Stock Alerts',
      widgetType: 'list.stock_alerts',
      order: 30,
      requiredModule: 'inventory',
    },
  ],
  quickActions: [
    {
      key: 'add_product',
      label: 'Add Product',
      actionType: 'navigate',
      path: '/products',
      order: 20,
      requiredModule: 'inventory',
    },
  ],
  settings: [
    {
      key: 'branches',
      label: 'Branches',
      path: '/settings/branches',
      requiredModule: 'settings',
    },
    {
      key: 'users',
      label: 'Users',
      path: '/settings/users',
      requiredModule: 'settings',
    },
    {
      key: 'billing',
      label: 'Billing',
      path: '/settings/billing',
      requiredModule: 'billing',
    },
  ],
  reports: [
    { key: 'sales_report', label: 'Sales Report', requiredModule: 'reports' },
    {
      key: 'inventory_report',
      label: 'Inventory Report',
      requiredModule: 'reports',
    },
  ],
  entities: [
    {
      key: 'product',
      label: 'Product',
      engine: 'inventory',
      allowedProductModes: ['simple', 'variable'],
      defaultProductMode: 'variable',
    },
    { key: 'variant', label: 'Variant', engine: 'inventory' },
    { key: 'order', label: 'Order', engine: 'sales' },
  ],
  permissions: ['view_sales', 'manage_inventory', 'view_reports'],
  features: ['product_variations', 'barcode_support', 'credit_sales'],
  apps: [
    { key: 'loyalty', label: 'Loyalty', enabledByDefault: false },
    {
      key: 'supplier_portal',
      label: 'Supplier Portal',
      enabledByDefault: false,
    },
  ],
  featureFlags: {
    ai_assistant_enabled: false,
    advanced_analytics_enabled: true,
  },
};

const restaurantStandardV1: BlueprintManifestV1 = {
  schemaVersion: '1.0.0',
  businessType: 'restaurant',
  blueprintKey: 'restaurant-standard',
  blueprintVersion: 'v1',
  displayName: 'Restaurant Standard',
  description: 'Restaurant-focused blueprint with kitchen and table workflows.',
  enabledModules: [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'analytics',
    'reports',
    'accounts',
    'settings',
    'billing',
  ],
  navigation: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      requiredModule: 'dashboard',
      order: 10,
    },
    {
      key: 'orders',
      label: 'Orders',
      path: '/sales',
      requiredModule: 'sales',
      order: 20,
    },
    {
      key: 'kitchen',
      label: 'Kitchen',
      path: '/restaurant/activity',
      requiredModule: 'sales',
      order: 30,
    },
    {
      key: 'inventory',
      label: 'Inventory',
      path: '/inventory',
      requiredModule: 'inventory',
      order: 40,
    },
    {
      key: 'expenses',
      label: 'Expenses',
      path: '/expenses',
      requiredModule: 'expenses',
      order: 50,
    },
    {
      key: 'reports',
      label: 'Reports',
      path: '/reports',
      requiredModule: 'reports',
      order: 60,
    },
    {
      key: 'settings',
      label: 'Settings',
      path: '/settings',
      requiredModule: 'settings',
      order: 90,
    },
  ],
  dashboard: [
    {
      key: 'daily_sales',
      title: 'Daily Sales',
      widgetType: 'kpi.sales',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'table_turnover',
      title: 'Table Turnover',
      widgetType: 'kpi.table_turnover',
      order: 20,
      requiredModule: 'sales',
    },
    {
      key: 'kitchen_queue',
      title: 'Kitchen Queue',
      widgetType: 'list.kitchen_tickets',
      order: 30,
      requiredModule: 'sales',
    },
  ],
  quickActions: [
    {
      key: 'new_order',
      label: 'New Order',
      actionType: 'navigate',
      path: '/sales',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'view_kitchen',
      label: 'Open Kitchen Queue',
      actionType: 'navigate',
      path: '/restaurant/activity',
      order: 20,
      requiredModule: 'sales',
    },
  ],
  settings: [
    {
      key: 'restaurant_settings',
      label: 'Restaurant Settings',
      path: '/settings/integrations',
      requiredModule: 'settings',
    },
    {
      key: 'branches',
      label: 'Branches',
      path: '/settings/branches',
      requiredModule: 'settings',
    },
    {
      key: 'billing',
      label: 'Billing',
      path: '/settings/billing',
      requiredModule: 'billing',
    },
  ],
  reports: [
    { key: 'sales_report', label: 'Sales Report', requiredModule: 'reports' },
    {
      key: 'menu_item_report',
      label: 'Menu Performance',
      requiredModule: 'reports',
    },
  ],
  entities: [
    {
      key: 'menu_item',
      label: 'Menu Item',
      engine: 'inventory',
      allowedProductModes: ['recipe', 'simple'],
      defaultProductMode: 'recipe',
    },
    { key: 'kitchen_ticket', label: 'Kitchen Ticket', engine: 'sales' },
    { key: 'table', label: 'Dining Table', engine: 'sales' },
  ],
  permissions: ['view_sales', 'manage_inventory', 'view_reports'],
  features: ['kitchen_display', 'table_management', 'split_bill'],
  apps: [
    { key: 'delivery', label: 'Delivery', enabledByDefault: false },
    { key: 'loyalty', label: 'Loyalty', enabledByDefault: false },
  ],
  featureFlags: {
    restaurant_addon_enabled: true,
    advanced_analytics_enabled: true,
  },
};

const spaStandardV1: BlueprintManifestV1 = {
  schemaVersion: '1.0.0',
  businessType: 'spa_barber',
  blueprintKey: 'spa-standard',
  blueprintVersion: 'v1',
  displayName: 'Spa and Barber Standard',
  description: 'Appointment and service blueprint for spas and barber shops.',
  enabledModules: [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'reports',
    'settings',
    'billing',
    'crm',
  ],
  navigation: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      requiredModule: 'dashboard',
      order: 10,
    },
    {
      key: 'appointments',
      label: 'Appointments',
      path: '/sales',
      requiredModule: 'sales',
      order: 20,
    },
    {
      key: 'services',
      label: 'Services',
      path: '/products',
      requiredModule: 'inventory',
      order: 30,
    },
    {
      key: 'clients',
      label: 'Clients',
      path: '/crm/pipeline',
      requiredModule: 'crm',
      order: 40,
    },
    {
      key: 'inventory',
      label: 'Inventory',
      path: '/inventory',
      requiredModule: 'inventory',
      order: 50,
    },
    {
      key: 'reports',
      label: 'Reports',
      path: '/reports',
      requiredModule: 'reports',
      order: 60,
    },
    {
      key: 'settings',
      label: 'Settings',
      path: '/settings',
      requiredModule: 'settings',
      order: 90,
    },
  ],
  dashboard: [
    {
      key: 'today_bookings',
      title: 'Today Bookings',
      widgetType: 'kpi.bookings',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'staff_utilization',
      title: 'Staff Utilization',
      widgetType: 'kpi.staff_utilization',
      order: 20,
      requiredModule: 'sales',
    },
    {
      key: 'top_services',
      title: 'Top Services',
      widgetType: 'chart.top_services',
      order: 30,
      requiredModule: 'reports',
    },
  ],
  quickActions: [
    {
      key: 'new_booking',
      label: 'New Booking',
      actionType: 'navigate',
      path: '/sales',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'new_client',
      label: 'New Client',
      actionType: 'navigate',
      path: '/crm/pipeline',
      order: 20,
      requiredModule: 'crm',
    },
  ],
  settings: [
    {
      key: 'staff_permissions',
      label: 'Staff Permissions',
      path: '/settings/permissions',
      requiredModule: 'settings',
    },
    {
      key: 'notifications',
      label: 'Notifications',
      path: '/settings/notifications',
      requiredModule: 'settings',
    },
    {
      key: 'billing',
      label: 'Billing',
      path: '/settings/billing',
      requiredModule: 'billing',
    },
  ],
  reports: [
    {
      key: 'service_revenue',
      label: 'Service Revenue',
      requiredModule: 'reports',
    },
    {
      key: 'staff_performance',
      label: 'Staff Performance',
      requiredModule: 'reports',
    },
  ],
  entities: [
    { key: 'appointment', label: 'Appointment', engine: 'sales' },
    {
      key: 'service',
      label: 'Service',
      engine: 'inventory',
      allowedProductModes: ['service'],
      defaultProductMode: 'service',
    },
    { key: 'staff_member', label: 'Staff Member', engine: 'users' },
  ],
  permissions: ['view_sales', 'manage_inventory', 'view_reports'],
  features: ['appointment_booking', 'staff_schedule', 'sms_reminders'],
  apps: [
    { key: 'online_booking', label: 'Online Booking', enabledByDefault: false },
    { key: 'loyalty', label: 'Loyalty', enabledByDefault: false },
  ],
  featureFlags: {
    appointment_reminders_enabled: true,
    online_booking_enabled: false,
  },
};

const hardwareStandardV1: BlueprintManifestV1 = {
  schemaVersion: '1.0.0',
  businessType: 'hardware',
  blueprintKey: 'hardware-standard',
  blueprintVersion: 'v1',
  displayName: 'Hardware Standard',
  description:
    'Retail blueprint for hardware, building materials, and tools sold by unit or by measure.',
  enabledModules: [
    'dashboard',
    'sales',
    'credits',
    'inventory',
    'expenses',
    'analytics',
    'reports',
    'accounts',
    'settings',
    'billing',
  ],
  navigation: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      requiredModule: 'dashboard',
      order: 10,
    },
    {
      key: 'sales',
      label: 'Sales',
      path: '/sales',
      requiredModule: 'sales',
      order: 20,
    },
    {
      key: 'products',
      label: 'Products',
      path: '/products',
      requiredModule: 'inventory',
      order: 30,
    },
    {
      key: 'inventory',
      label: 'Inventory',
      path: '/inventory',
      requiredModule: 'inventory',
      order: 40,
    },
    {
      key: 'customers',
      label: 'Customers',
      path: '/crm/pipeline',
      requiredModule: 'crm',
      order: 50,
    },
    {
      key: 'expenses',
      label: 'Expenses',
      path: '/expenses',
      requiredModule: 'expenses',
      order: 60,
    },
    {
      key: 'reports',
      label: 'Reports',
      path: '/reports',
      requiredModule: 'reports',
      order: 70,
    },
    {
      key: 'settings',
      label: 'Settings',
      path: '/settings',
      requiredModule: 'settings',
      order: 90,
    },
  ],
  dashboard: [
    {
      key: 'sales_overview',
      title: 'Sales Overview',
      widgetType: 'kpi.sales',
      order: 10,
      requiredModule: 'sales',
    },
    {
      key: 'top_products',
      title: 'Top Products',
      widgetType: 'chart.top_products',
      order: 20,
      requiredModule: 'analytics',
    },
    {
      key: 'stock_alerts',
      title: 'Stock Alerts',
      widgetType: 'list.stock_alerts',
      order: 30,
      requiredModule: 'inventory',
    },
  ],
  quickActions: [
    {
      key: 'add_product',
      label: 'Add Product',
      actionType: 'navigate',
      path: '/products',
      order: 20,
      requiredModule: 'inventory',
    },
  ],
  settings: [
    {
      key: 'branches',
      label: 'Branches',
      path: '/settings/branches',
      requiredModule: 'settings',
    },
    {
      key: 'users',
      label: 'Users',
      path: '/settings/users',
      requiredModule: 'settings',
    },
    {
      key: 'billing',
      label: 'Billing',
      path: '/settings/billing',
      requiredModule: 'billing',
    },
  ],
  reports: [
    { key: 'sales_report', label: 'Sales Report', requiredModule: 'reports' },
    {
      key: 'inventory_report',
      label: 'Inventory Report',
      requiredModule: 'reports',
    },
  ],
  entities: [
    {
      key: 'product',
      label: 'Product',
      engine: 'inventory',
      allowedProductModes: ['unit_priced', 'simple'],
      defaultProductMode: 'unit_priced',
    },
    { key: 'order', label: 'Order', engine: 'sales' },
  ],
  permissions: ['view_sales', 'manage_inventory', 'view_reports'],
  features: ['unit_pricing', 'barcode_support', 'credit_sales'],
  apps: [
    {
      key: 'supplier_portal',
      label: 'Supplier Portal',
      enabledByDefault: false,
    },
  ],
  featureFlags: {
    ai_assistant_enabled: false,
    advanced_analytics_enabled: true,
  },
};

export const BLUEPRINT_MANIFESTS_V1: BlueprintManifestV1[] = [
  fashionStandardV1,
  restaurantStandardV1,
  spaStandardV1,
  hardwareStandardV1,
];

const ADMIN_NAVIGATION_CATALOG_V1: BlueprintNavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    requiredModule: 'dashboard',
    order: 10,
  },
  {
    key: 'ai_assistant',
    label: 'AI Assistant',
    path: '/ai-assistant',
    requiredModule: 'ai',
    order: 20,
  },
  {
    key: 'accounts_ledgers',
    label: 'Accounts Ledgers',
    path: '/accounts/ledgers',
    requiredModule: 'accounts',
    order: 30,
  },
  {
    key: 'accounts_balance_sheet',
    label: 'Balance Sheet',
    path: '/accounts/balance-sheet',
    requiredModule: 'accounts',
    order: 40,
  },
  {
    key: 'accounts_trial_balance',
    label: 'Trial Balance',
    path: '/accounts/trial-balance',
    requiredModule: 'accounts',
    order: 50,
  },
  {
    key: 'accounts_capital',
    label: 'Capital',
    path: '/accounts/capital',
    requiredModule: 'accounts',
    order: 60,
  },
  {
    key: 'accounts_revenue',
    label: 'Revenue',
    path: '/accounts/revenue',
    requiredModule: 'accounts',
    order: 70,
  },
  {
    key: 'accounts_profit_loss',
    label: 'Profit & Loss',
    path: '/accounts/profit-loss',
    requiredModule: 'accounts',
    order: 80,
  },
  {
    key: 'accounts_inventory',
    label: 'Inventory',
    path: '/accounts/inventory',
    requiredModule: 'accounts',
    order: 90,
  },
  {
    key: 'products_unified',
    label: 'Unified Management',
    path: '/products/unified',
    requiredModule: 'inventory',
    order: 100,
  },
  {
    key: 'inventory_suppliers',
    label: 'Suppliers',
    path: '/inventory/suppliers',
    requiredModule: 'inventory',
    order: 110,
  },
  {
    key: 'reports_product_sales',
    label: 'Product Sales Report',
    path: '/products/reports/product-sales',
    requiredModule: 'reports',
    order: 120,
  },
  {
    key: 'reports_inventory_levels',
    label: 'Inventory Levels Report',
    path: '/products/reports/inventory-levels',
    requiredModule: 'reports',
    order: 130,
  },
  {
    key: 'reports_low_stock_alerts',
    label: 'Low Stock Alerts',
    path: '/products/reports/low-stock-alerts',
    requiredModule: 'reports',
    order: 140,
  },
  {
    key: 'sales_history',
    label: 'Sales History',
    path: '/sales/history',
    requiredModule: 'sales',
    order: 150,
  },
  {
    key: 'restaurant_activity',
    label: 'Restaurant Activity',
    path: '/restaurant/activity',
    requiredModule: 'sales',
    order: 160,
  },
  {
    key: 'mpesa_transactions',
    label: 'M-Pesa Transactions',
    path: '/mpesa-transactions',
    requiredModule: 'sales',
    order: 170,
  },
  {
    key: 'sales_targets',
    label: 'Sales Target',
    path: '/sales/targets',
    requiredModule: 'sales',
    order: 180,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    requiredModule: 'analytics',
    order: 190,
  },
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    requiredModule: 'reports',
    order: 200,
  },
  {
    key: 'credit',
    label: 'Credit',
    path: '/credit',
    requiredModule: 'credits',
    order: 210,
  },
  {
    key: 'hr_employees',
    label: 'HR Employees',
    path: '/hr/employees',
    requiredModule: 'payroll',
    order: 220,
  },
  {
    key: 'payroll',
    label: 'Payroll',
    path: '/payroll',
    requiredModule: 'payroll',
    order: 230,
  },
  {
    key: 'expenses',
    label: 'Expenses',
    path: '/expenses',
    requiredModule: 'expenses',
    order: 240,
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    requiredModule: 'settings',
    order: 250,
  },
  {
    key: 'billing_subscription',
    label: 'Billing & Subscription',
    path: '/account/billing',
    requiredModule: 'billing',
    order: 260,
  },
];

for (const manifest of BLUEPRINT_MANIFESTS_V1) {
  assertValidBlueprintManifest(manifest);
}

export function getBlueprintManifestV1(
  blueprintKey: string,
): BlueprintManifestV1 | undefined {
  const normalized = String(blueprintKey || '')
    .trim()
    .toLowerCase();
  return BLUEPRINT_MANIFESTS_V1.find(
    (entry) => entry.blueprintKey === normalized,
  );
}

export function getBlueprintNavigationCatalogV1(): BlueprintNavItem[] {
  const byKey = new Map<string, BlueprintNavItem>();

  for (const item of ADMIN_NAVIGATION_CATALOG_V1) {
    const key = String(item?.key || '')
      .trim()
      .toLowerCase();
    if (!key || byKey.has(key)) {
      continue;
    }
    byKey.set(key, { ...item, key });
  }

  for (const manifest of BLUEPRINT_MANIFESTS_V1) {
    for (const item of manifest.navigation || []) {
      const key = String(item?.key || '')
        .trim()
        .toLowerCase();
      if (!key || byKey.has(key)) {
        continue;
      }
      byKey.set(key, { ...item, key });
    }
  }

  return Array.from(byKey.values());
}

const LEGACY_MODULE_ROUTE_MAP: Record<
  AppModuleKey,
  { label: string; path: string }
> = {
  dashboard: { label: 'Dashboard', path: '/dashboard' },
  payroll: { label: 'Payroll', path: '/payroll' },
  sales: { label: 'Sales', path: '/sales' },
  credits: { label: 'Credits', path: '/credit' },
  inventory: { label: 'Inventory', path: '/inventory' },
  accounts: { label: 'Accounts', path: '/accounts/ledgers' },
  analytics: { label: 'Analytics', path: '/analytics' },
  reports: { label: 'Reports', path: '/reports' },
  expenses: { label: 'Expenses', path: '/expenses' },
  crm: { label: 'CRM', path: '/crm/pipeline' },
  ai: { label: 'AI Assistant', path: '/ai-assistant' },
  settings: { label: 'Settings', path: '/settings' },
  billing: { label: 'Billing', path: '/settings/billing' },
};

export function createLegacyFallbackManifest(
  enabledModules: AppModuleKey[],
): BlueprintManifestV1 {
  const navigation = enabledModules.map((module, index) => {
    const route = LEGACY_MODULE_ROUTE_MAP[module];
    return {
      key: module,
      label: route.label,
      path: route.path,
      requiredModule: module,
      order: (index + 1) * 10,
    };
  });

  return {
    schemaVersion: '1.0.0',
    businessType: 'fashion',
    blueprintKey: 'legacy-fallback',
    blueprintVersion: 'v1',
    displayName: 'Legacy Fallback',
    description: 'Derived from tenant enabledModules configuration.',
    enabledModules: enabledModules,
    navigation,
    dashboard: [],
    quickActions: [],
    settings: [],
    reports: [],
    entities: [],
    permissions: [],
    features: [],
    apps: [],
    featureFlags: {},
  };
}
