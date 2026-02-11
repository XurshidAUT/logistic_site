// Конвертация единиц измерения
export const convertToTons = (quantity: number, unit: 'т' | 'кг'): number => {
  return unit === 'кг' ? quantity / 1000 : quantity;
};

// Форматирование числа с 2 знаками после запятой
export const formatNumber = (value: number): string => {
  return value.toFixed(2);
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
