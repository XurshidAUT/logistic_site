// Конвертация единиц измерения
export const convertToTons = (quantity: number, unit: 'т' | 'кг'): number => {
  if (unit === 'кг') return quantity / 1000;
  return quantity;
};

// Расчёт количества контейнеров
export const calculateContainers = (quantityInTons: number, containerTonnage: number = 26): number => {
  return quantityInTons / containerTonnage;
};

// Форматирование числа без лишних нулей
export const formatNumber = (value: number): string => {
  // Убираем лишние нули: 1.000 → 1, 1.500 → 1.5, 0.250 → 0.25
  return parseFloat(value.toFixed(3)).toString();
};

// Форматирование количества с единицами измерения и контейнерами
export const formatQuantity = (quantity: number, unit: 'т' | 'кг', quantityInTons: number, containerTonnage: number = 26): string => {
  const formattedQty = formatNumber(quantity);
  const formattedTons = formatNumber(quantityInTons);
  const containers = calculateContainers(quantityInTons, containerTonnage);
  const formattedContainers = formatNumber(containers);
  
  if (unit === 'кг') {
    return `${formattedQty} кг (${formattedTons} т / ${formattedContainers} конт.)`;
  } else {
    return `${formattedTons} т (${formattedContainers} конт.)`;
  }
};

// Форматирование даты
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU');
};

// Форматирование даты и времени
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ru-RU');
};

// Генерация номера заказа
let orderCounter = 1;
export const generateOrderNumber = (): string => {
  const num = orderCounter++;
  return `ORD-${num.toString().padStart(3, '0')}`;
};

// Инициализация счётчика заказов из существующих заказов
export const initOrderCounter = (maxNumber: number) => {
  orderCounter = maxNumber + 1;
};

// Форматирование валюты
export const formatCurrency = (value: number, currency: 'USD' | 'UZS' = 'USD'): string => {
  const formatted = parseFloat(value.toFixed(2));
  
  if (currency === 'USD') {
    return `$${formatted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    // UZS - форматируем с пробелами и без дробной части
    return `${Math.round(formatted).toLocaleString('ru-RU').replace(/,/g, ' ')} UZS`;
  }
};
