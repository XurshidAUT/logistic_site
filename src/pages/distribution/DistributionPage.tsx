import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getOrderById,
  getOrderLinesByOrderId,
  getAllocationsByOrderId,
  getSuppliers,
  getItemById,
  getUserById,
  createAllocation,
  deleteAllocation,
  updateOrder,
  getCurrentUser,
  createAuditLog,
} from '../../store';
import type { Order, OrderLine, Allocation, Supplier } from '../../types';
import { convertToTons, formatDate, formatNumber } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

interface AllocationRow {
  id?: string;
  supplierId: string;
  quantity: string;
  unit: 'т' | 'кг';
  pricePerTon: string;
}

const DistributionPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Строки распределения для каждой позиции
  const [allocationRows, setAllocationRows] = useState<{ [orderLineId: string]: AllocationRow[] }>({});

  useEffect(() => {
    if (!orderId) return;

    const o = getOrderById(orderId);
    if (!o) {
      showToast('Заказ не найден', 'error');
      navigate('/orders');
      return;
    }

    setOrder(o);
    setOrderLines(getOrderLinesByOrderId(orderId));
    setAllocations(getAllocationsByOrderId(orderId));
    setSuppliers(getSuppliers());

    // Инициализируем строки распределения для каждой позиции
    const lines = getOrderLinesByOrderId(orderId);
    const existingAllocations = getAllocationsByOrderId(orderId);
    
    const rows: { [key: string]: AllocationRow[] } = {};
    lines.forEach(line => {
      const lineAllocations = existingAllocations
        .filter(a => a.orderLineId === line.id)
        .map(a => ({
          id: a.id,
          supplierId: a.supplierId,
          quantity: a.quantity.toString(),
          unit: a.unit,
          pricePerTon: a.pricePerTon.toString(),
        }));
      rows[line.id] = lineAllocations;
    });
    setAllocationRows(rows);
  }, [orderId]);

  const addAllocationRow = (orderLineId: string) => {
    setAllocationRows(prev => ({
      ...prev,
      [orderLineId]: [
        ...(prev[orderLineId] || []),
        { supplierId: '', quantity: '', unit: 'т', pricePerTon: '' }
      ]
    }));
  };

  const updateAllocationRow = (orderLineId: string, index: number, field: keyof AllocationRow, value: string) => {
    setAllocationRows(prev => {
      const rows = [...(prev[orderLineId] || [])];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, [orderLineId]: rows };
    });
  };

  const removeAllocationRow = (orderLineId: string, index: number) => {
    const row = allocationRows[orderLineId]?.[index];
    if (row?.id) {
      // Удалить из БД
      deleteAllocation(row.id);
      setAllocations(getAllocationsByOrderId(orderId!));
    }
    
    setAllocationRows(prev => {
      const rows = [...(prev[orderLineId] || [])];
      rows.splice(index, 1);
      return { ...prev, [orderLineId]: rows };
    });
    showToast('Строка удалена', 'success');
  };

  const saveAllocation = (orderLineId: string, index: number) => {
    const row = allocationRows[orderLineId]?.[index];
    if (!row || !row.supplierId || !row.quantity || !row.pricePerTon) {
      showToast('Заполните все поля', 'error');
      return;
    }

    const qty = parseFloat(row.quantity);
    const price = parseFloat(row.pricePerTon);
    
    if (qty <= 0 || price <= 0) {
      showToast('Количество и цена должны быть больше 0', 'error');
      return;
    }

    const orderLine = orderLines.find(l => l.id === orderLineId);
    if (!orderLine) return;

    const qtyInTons = convertToTons(qty, row.unit);
    
    // Проверяем, не превышает ли распределение заказанное количество
    const existingAllocated = allocations
      .filter(a => a.orderLineId === orderLineId && a.id !== row.id)
      .reduce((sum, a) => sum + a.quantityInTons, 0);
    
    if (existingAllocated + qtyInTons > orderLine.quantityInTons) {
      showToast('Распределено больше, чем заказано!', 'error');
      return;
    }

    const totalSum = qtyInTons * price;

    if (row.id) {
      // Обновить существующую (удалить и создать заново)
      deleteAllocation(row.id);
    }

    const newAllocation = createAllocation({
      orderId: orderId!,
      orderLineId,
      supplierId: row.supplierId,
      itemId: orderLine.itemId,
      quantity: qty,
      unit: row.unit,
      quantityInTons: qtyInTons,
      pricePerTon: price,
      totalSum,
    });

    // Обновляем ID в строке
    setAllocationRows(prev => {
      const rows = [...(prev[orderLineId] || [])];
      rows[index] = { ...rows[index], id: newAllocation.id };
      return { ...prev, [orderLineId]: rows };
    });

    setAllocations(getAllocationsByOrderId(orderId!));
    showToast('Распределение сохранено', 'success');

    if (currentUser) {
      createAuditLog({
        action: 'CREATE_ALLOCATION',
        entityType: 'Allocation',
        entityId: newAllocation.id,
        userId: currentUser.id,
        details: { orderId, orderLineId, supplierId: row.supplierId },
      });
    }
  };

  const calculateRemaining = (orderLine: OrderLine): number => {
    const allocated = allocations
      .filter(a => a.orderLineId === orderLine.id)
      .reduce((sum, a) => sum + a.quantityInTons, 0);
    return orderLine.quantityInTons - allocated;
  };

  const canProceedToFinance = (): boolean => {
    return orderLines.every(line => calculateRemaining(line) === 0);
  };

  const handleProceedToFinance = () => {
    if (!canProceedToFinance()) {
      showToast('Необходимо распределить все позиции полностью', 'error');
      return;
    }

    if (order) {
      updateOrder(order.id, { status: 'distributed' });
      if (currentUser) {
        createAuditLog({
          action: 'UPDATE_ORDER_STATUS',
          entityType: 'Order',
          entityId: order.id,
          userId: currentUser.id,
          details: { status: 'distributed' },
        });
      }
      showToast('Переход в финансы', 'success');
      navigate(`/finance/${order.id}`);
    }
  };

  if (!order) {
    return <div>Загрузка...</div>;
  }

  const creator = getUserById(order.createdBy);

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Распределение заказа {order.orderNumber}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Дата:</span>{' '}
            <span className="font-medium">{formatDate(order.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-600">Создатель:</span>{' '}
            <span className="font-medium">{creator?.fullName || 'Неизвестно'}</span>
          </div>
          <div>
            <span className="text-gray-600">Статус:</span>{' '}
            <span className="font-medium">{order.status}</span>
          </div>
        </div>
      </div>

      {orderLines.map(orderLine => {
        const item = getItemById(orderLine.itemId);
        const remaining = calculateRemaining(orderLine);
        const rows = allocationRows[orderLine.id] || [];
        
        const lineAllocations = allocations.filter(a => a.orderLineId === orderLine.id);
        const totalSum = lineAllocations.reduce((sum, a) => sum + a.totalSum, 0);

        return (
          <div key={orderLine.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Позиция: {item?.name || 'Неизвестно'}
              </h3>
              <div className="text-sm">
                <span className="text-gray-600">Заказано:</span>{' '}
                <span className="font-medium">{orderLine.quantityInTons.toFixed(3)} т</span>
                {' | '}
                <span className="text-gray-600">Остаток:</span>{' '}
                <span className={`font-medium ${remaining === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining.toFixed(3)} т
                </span>
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Поставщик
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Количество
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Ед.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Цена/т
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Сумма
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row, index) => {
                    const qtyInTons = row.quantity ? convertToTons(parseFloat(row.quantity), row.unit) : 0;
                    const sum = qtyInTons * (parseFloat(row.pricePerTon) || 0);
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <Select
                            value={row.supplierId}
                            onChange={(e) => updateAllocationRow(orderLine.id, index, 'supplierId', e.target.value)}
                            options={[
                              { value: '', label: 'Выберите...' },
                              ...suppliers.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            className="text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantity}
                            onChange={(e) => updateAllocationRow(orderLine.id, index, 'quantity', e.target.value)}
                            className="text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={row.unit}
                            onChange={(e) => updateAllocationRow(orderLine.id, index, 'unit', e.target.value)}
                            options={[
                              { value: 'т', label: 'т' },
                              { value: 'кг', label: 'кг' },
                            ]}
                            className="text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.pricePerTon}
                            onChange={(e) => updateAllocationRow(orderLine.id, index, 'pricePerTon', e.target.value)}
                            className="text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatNumber(sum)} ₽
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button
                            onClick={() => saveAllocation(orderLine.id, index)}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => removeAllocationRow(orderLine.id, index)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <Button size="sm" onClick={() => addAllocationRow(orderLine.id)}>
                + Добавить строку
              </Button>
              <div className="text-sm font-medium">
                Итого по позиции: {formatNumber(totalSum)} ₽
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Итого по заказу: {formatNumber(allocations.reduce((sum, a) => sum + a.totalSum, 0))} ₽
          </div>
          <Button
            size="lg"
            onClick={handleProceedToFinance}
            disabled={!canProceedToFinance()}
          >
            Продолжить в финансы →
          </Button>
        </div>
        {!canProceedToFinance() && (
          <p className="text-red-600 text-sm mt-2">
            Необходимо полностью распределить все позиции (остаток должен быть 0)
          </p>
        )}
      </div>
    </div>
  );
};

export default DistributionPage;
