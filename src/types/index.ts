// Пользователь
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'logist' | 'finance';
  fullName: string;
}

// Позиция / номенклатура
export interface Item {
  id: string;
  name: string;
  unit: 'т' | 'кг';
  category?: string;
  description?: string;
}

// Поставщик
export interface Supplier {
  id: string;
  name: string;
  contacts?: string;
  notes?: string;
}

// Заказ (шапка)
export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  createdBy: string; // userId
  status: 'draft' | 'distributed' | 'financial' | 'completed';
}

// Позиция заказа (строка корзины)
export interface OrderLine {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  unit: 'т' | 'кг';
  quantityInTons: number; // авторасчёт
}

// Распределение
export interface Allocation {
  id: string;
  orderId: string;
  orderLineId: string;
  supplierId: string;
  itemId: string;
  quantity: number;
  unit: 'т' | 'кг';
  quantityInTons: number;
  pricePerTon: number;
  totalSum: number; // авто = quantityInTons × pricePerTon
}

// Финансовая операция
export interface PaymentOperation {
  id: string;
  allocationId: string;
  type: 'PREPAYMENT' | 'PAYOFF';
  amount: number;
  date: string;
  createdAt: string;
  createdBy: string; // userId
  comment?: string;
}

// Лог действий
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  details?: any; // JSON
}
