import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Item,
  Supplier,
  Order,
  OrderLine,
  Allocation,
  PaymentOperation,
  AuditLog
} from '../types';
import { initOrderCounter } from '../utils/helpers';

// Ключи для LocalStorage
const KEYS = {
  USERS: 'logistics_users',
  ITEMS: 'logistics_items',
  SUPPLIERS: 'logistics_suppliers',
  ORDERS: 'logistics_orders',
  ORDER_LINES: 'logistics_order_lines',
  ALLOCATIONS: 'logistics_allocations',
  PAYMENTS: 'logistics_payments',
  AUDIT_LOGS: 'logistics_audit_logs',
  CURRENT_USER: 'logistics_current_user',
  ADMIN_MODE: 'logistics_admin_mode'
};

// Инициализация данных по умолчанию
export const initializeDefaultData = () => {
  // Проверяем, есть ли уже пользователи
  const users = getUsers();
  if (users.length === 0) {
    // Создаём админа по умолчанию
    const admin: User = {
      id: uuidv4(),
      username: 'admin',
      password: 'admin', // В реальном приложении нужно хэшировать
      role: 'admin',
      fullName: 'Администратор'
    };
    saveUsers([admin]);
  }

  // Инициализируем счётчик заказов
  const orders = getOrders();
  if (orders.length > 0) {
    const maxNum = Math.max(...orders.map(o => {
      const match = o.orderNumber.match(/ORD-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }));
    initOrderCounter(maxNum);
  }
};

// Вспомогательные функции для работы с LocalStorage
const getData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Users
export const getUsers = (): User[] => getData<User>(KEYS.USERS);
export const saveUsers = (users: User[]) => saveData(KEYS.USERS, users);
export const getUserById = (id: string): User | undefined => {
  return getUsers().find(u => u.id === id);
};
export const getUserByUsername = (username: string): User | undefined => {
  return getUsers().find(u => u.username === username);
};

// Current User
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};
export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
};

// Items
export const getItems = (): Item[] => getData<Item>(KEYS.ITEMS);
export const saveItems = (items: Item[]) => saveData(KEYS.ITEMS, items);
export const getItemById = (id: string): Item | undefined => {
  return getItems().find(i => i.id === id);
};
export const createItem = (item: Omit<Item, 'id'>): Item => {
  const newItem: Item = { ...item, id: uuidv4() };
  const items = getItems();
  items.push(newItem);
  saveItems(items);
  return newItem;
};
export const updateItem = (id: string, updates: Partial<Item>) => {
  const items = getItems();
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveItems(items);
  }
};
export const deleteItem = (id: string) => {
  const items = getItems().filter(i => i.id !== id);
  saveItems(items);
};

// Suppliers
export const getSuppliers = (): Supplier[] => getData<Supplier>(KEYS.SUPPLIERS);
export const saveSuppliers = (suppliers: Supplier[]) => saveData(KEYS.SUPPLIERS, suppliers);
export const getSupplierById = (id: string): Supplier | undefined => {
  return getSuppliers().find(s => s.id === id);
};
export const createSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
  const newSupplier: Supplier = { ...supplier, id: uuidv4() };
  const suppliers = getSuppliers();
  suppliers.push(newSupplier);
  saveSuppliers(suppliers);
  return newSupplier;
};
export const updateSupplier = (id: string, updates: Partial<Supplier>) => {
  const suppliers = getSuppliers();
  const index = suppliers.findIndex(s => s.id === id);
  if (index !== -1) {
    suppliers[index] = { ...suppliers[index], ...updates };
    saveSuppliers(suppliers);
  }
};
export const deleteSupplier = (id: string) => {
  const suppliers = getSuppliers().filter(s => s.id !== id);
  saveSuppliers(suppliers);
};

// Orders
export const getOrders = (): Order[] => getData<Order>(KEYS.ORDERS);
export const saveOrders = (orders: Order[]) => saveData(KEYS.ORDERS, orders);
export const getOrderById = (id: string): Order | undefined => {
  return getOrders().find(o => o.id === id);
};
export const createOrder = (order: Omit<Order, 'id'>): Order => {
  const newOrder: Order = { ...order, id: uuidv4() };
  const orders = getOrders();
  orders.push(newOrder);
  saveOrders(orders);
  return newOrder;
};
export const updateOrder = (id: string, updates: Partial<Order>) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    saveOrders(orders);
  }
};
export const deleteOrder = (id: string) => {
  const orders = getOrders().filter(o => o.id !== id);
  saveOrders(orders);
};

// Order Lines
export const getOrderLines = (): OrderLine[] => getData<OrderLine>(KEYS.ORDER_LINES);
export const saveOrderLines = (lines: OrderLine[]) => saveData(KEYS.ORDER_LINES, lines);
export const getOrderLinesByOrderId = (orderId: string): OrderLine[] => {
  return getOrderLines().filter(l => l.orderId === orderId);
};
export const getOrderLineById = (id: string): OrderLine | undefined => {
  return getOrderLines().find(l => l.id === id);
};
export const createOrderLine = (line: Omit<OrderLine, 'id'>): OrderLine => {
  const newLine: OrderLine = { ...line, id: uuidv4() };
  const lines = getOrderLines();
  lines.push(newLine);
  saveOrderLines(lines);
  return newLine;
};
export const updateOrderLine = (id: string, updates: Partial<OrderLine>) => {
  const lines = getOrderLines();
  const index = lines.findIndex(l => l.id === id);
  if (index !== -1) {
    lines[index] = { ...lines[index], ...updates };
    saveOrderLines(lines);
  }
};
export const deleteOrderLine = (id: string) => {
  const lines = getOrderLines().filter(l => l.id !== id);
  saveOrderLines(lines);
};

// Allocations
export const getAllocations = (): Allocation[] => getData<Allocation>(KEYS.ALLOCATIONS);
export const saveAllocations = (allocations: Allocation[]) => saveData(KEYS.ALLOCATIONS, allocations);
export const getAllocationsByOrderId = (orderId: string): Allocation[] => {
  return getAllocations().filter(a => a.orderId === orderId);
};
export const getAllocationById = (id: string): Allocation | undefined => {
  return getAllocations().find(a => a.id === id);
};
export const createAllocation = (allocation: Omit<Allocation, 'id'>): Allocation => {
  const newAllocation: Allocation = { ...allocation, id: uuidv4() };
  const allocations = getAllocations();
  allocations.push(newAllocation);
  saveAllocations(allocations);
  return newAllocation;
};
export const updateAllocation = (id: string, updates: Partial<Allocation>) => {
  const allocations = getAllocations();
  const index = allocations.findIndex(a => a.id === id);
  if (index !== -1) {
    allocations[index] = { ...allocations[index], ...updates };
    saveAllocations(allocations);
  }
};
export const deleteAllocation = (id: string) => {
  const allocations = getAllocations().filter(a => a.id !== id);
  saveAllocations(allocations);
};

// Payment Operations
export const getPayments = (): PaymentOperation[] => getData<PaymentOperation>(KEYS.PAYMENTS);
export const savePayments = (payments: PaymentOperation[]) => saveData(KEYS.PAYMENTS, payments);
export const getPaymentsByAllocationId = (allocationId: string): PaymentOperation[] => {
  return getPayments().filter(p => p.allocationId === allocationId);
};
export const getPaymentsBySupplierAndOrder = (supplierId: string, orderId: string): PaymentOperation[] => {
  return getPayments().filter(p => p.supplierId === supplierId && p.orderId === orderId);
};
export const createPayment = (payment: Omit<PaymentOperation, 'id'>): PaymentOperation => {
  const newPayment: PaymentOperation = { ...payment, id: uuidv4() };
  const payments = getPayments();
  payments.push(newPayment);
  savePayments(payments);
  return newPayment;
};

// Audit Logs
export const getAuditLogs = (): AuditLog[] => getData<AuditLog>(KEYS.AUDIT_LOGS);
export const saveAuditLogs = (logs: AuditLog[]) => saveData(KEYS.AUDIT_LOGS, logs);
export const createAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>): void => {
  const newLog: AuditLog = {
    ...log,
    id: uuidv4(),
    timestamp: new Date().toISOString()
  };
  const logs = getAuditLogs();
  logs.push(newLog);
  saveAuditLogs(logs);
};

// Admin Mode
export const isAdminMode = (): boolean => {
  const mode = localStorage.getItem(KEYS.ADMIN_MODE);
  return mode === 'true';
};

export const setAdminMode = (enabled: boolean): void => {
  if (enabled) {
    localStorage.setItem(KEYS.ADMIN_MODE, 'true');
  } else {
    localStorage.removeItem(KEYS.ADMIN_MODE);
  }
};

// Clear all data (admin function)
export const clearAllData = (): void => {
  Object.values(KEYS).forEach(key => {
    if (key !== KEYS.CURRENT_USER && key !== KEYS.ADMIN_MODE) {
      localStorage.removeItem(key);
    }
  });
  // Re-initialize default data
  initializeDefaultData();
};
