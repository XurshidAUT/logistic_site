import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getOrderById,
  getAllocationsByOrderId,
  getPayments,
  getPaymentsByAllocationId,
  getSupplierById,
  getItemById,
  getUserById,
  createPayment,
  getCurrentUser,
  createAuditLog,
  updateOrder,
} from '../../store';
import type { Order, Allocation, PaymentOperation } from '../../types';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const FinancePage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentOperation[]>([]);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [paymentType, setPaymentType] = useState<'PREPAYMENT' | 'PAYOFF'>('PREPAYMENT');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentComment, setPaymentComment] = useState('');

  useEffect(() => {
    if (!orderId) return;

    const o = getOrderById(orderId);
    if (o) {
      setOrder(o);
      setAllocations(getAllocationsByOrderId(orderId));
      setAllPayments(getPayments());
    }
  }, [orderId]);

  const calculatePaid = (allocationId: string): number => {
    return getPaymentsByAllocationId(allocationId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateRemaining = (allocation: Allocation): number => {
    return allocation.totalSum - calculatePaid(allocation.id);
  };

  const getPaymentStatus = (allocation: Allocation): string => {
    const remaining = calculateRemaining(allocation);
    if (remaining === 0) return 'Оплачено';
    if (remaining === allocation.totalSum) return 'Не оплачено';
    return 'Частично оплачено';
  };

  const openPaymentModal = (allocation: Allocation, type: 'PREPAYMENT' | 'PAYOFF') => {
    setSelectedAllocation(allocation);
    setPaymentType(type);
    const remaining = calculateRemaining(allocation);
    setPaymentAmount(type === 'PAYOFF' ? remaining.toString() : '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentComment('');
    setIsPaymentModalOpen(true);
  };

  const handlePayment = () => {
    if (!selectedAllocation || !currentUser || !paymentAmount) {
      showToast('Заполните все обязательные поля', 'error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      showToast('Сумма должна быть больше 0', 'error');
      return;
    }

    const remaining = calculateRemaining(selectedAllocation);
    if (amount > remaining) {
      showToast('Сумма превышает остаток к оплате', 'error');
      return;
    }

    const payment = createPayment({
      allocationId: selectedAllocation.id,
      type: paymentType,
      amount,
      date: paymentDate,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      comment: paymentComment || undefined,
      currency: selectedAllocation.currency || 'USD', // наследуем валюту от распределения
    });

    createAuditLog({
      action: 'CREATE_PAYMENT',
      entityType: 'PaymentOperation',
      entityId: payment.id,
      userId: currentUser.id,
      details: { 
        allocationId: selectedAllocation.id, 
        type: paymentType, 
        amount 
      },
    });

    showToast(paymentType === 'PREPAYMENT' ? 'Предоплата создана' : 'Погашение создано', 'success');
    setAllPayments(getPayments());
    setIsPaymentModalOpen(false);

    // Проверяем, все ли оплачено
    const allAllocations = getAllocationsByOrderId(orderId!);
    const allPaid = allAllocations.every(a => calculateRemaining(a) === 0);
    if (allPaid && order && order.status === 'distributed') {
      updateOrder(order.id, { status: 'financial' });
      const updatedOrder = getOrderById(orderId!);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
    }
  };

  if (!order) {
    return <div>Загрузка...</div>;
  }

  const creator = getUserById(order.createdBy);
  const orderPayments = allPayments.filter(p => 
    allocations.some(a => a.id === p.allocationId)
  );

  // Группировка по поставщикам
  const supplierGroups = allocations.reduce((groups, allocation) => {
    const supplierId = allocation.supplierId;
    if (!groups[supplierId]) {
      groups[supplierId] = [];
    }
    groups[supplierId].push(allocation);
    return groups;
  }, {} as { [key: string]: Allocation[] });

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Финансы — Наш груз (Заказ {order.orderNumber})
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

      {Object.entries(supplierGroups).map(([supplierId, supplierAllocations]) => {
        const supplier = getSupplierById(supplierId);
        // Группируем суммы по валютам для этого поставщика
        const totalsByCurrency = supplierAllocations.reduce((acc, a) => {
          const currency = a.currency || 'USD';
          acc[currency] = acc[currency] || { total: 0, paid: 0 };
          acc[currency].total += a.totalSum;
          acc[currency].paid += calculatePaid(a.id);
          return acc;
        }, {} as Record<string, { total: number; paid: number }>);
        
        return (
          <div key={supplierId} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Поставщик: {supplier?.name || 'Неизвестно'}
            </h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Позиция
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Количество
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Цена/т
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Сумма
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Оплачено
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Остаток
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierAllocations.map(allocation => {
                    const item = getItemById(allocation.itemId);
                    const paid = calculatePaid(allocation.id);
                    const remaining = calculateRemaining(allocation);
                    const status = getPaymentStatus(allocation);
                    const currency = allocation.currency || 'USD';

                    return (
                      <tr key={allocation.id}>
                        <td className="px-4 py-2">{item?.name || 'Неизвестно'}</td>
                        <td className="px-4 py-2">
                          {allocation.quantity} {allocation.unit} ({allocation.quantityInTons.toFixed(3)} т)
                        </td>
                        <td className="px-4 py-2">{formatCurrency(allocation.pricePerTon, currency)}</td>
                        <td className="px-4 py-2">{formatCurrency(allocation.totalSum, currency)}</td>
                        <td className="px-4 py-2">{formatCurrency(paid, currency)}</td>
                        <td className="px-4 py-2">{formatCurrency(remaining, currency)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            status === 'Оплачено' ? 'bg-green-100 text-green-800' :
                            status === 'Частично оплачено' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          {remaining > 0 && (
                            <>
                              <button
                                onClick={() => openPaymentModal(allocation, 'PREPAYMENT')}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                Предоплата
                              </button>
                              <button
                                onClick={() => openPaymentModal(allocation, 'PAYOFF')}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Погасить
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end text-sm font-medium">
              <div className="space-y-1">
                {Object.entries(totalsByCurrency).map(([currency, amounts]) => (
                  <div key={currency}>
                    <div>Итого по поставщику: {formatCurrency(amounts.total, currency as 'USD' | 'UZS')}</div>
                    <div>Оплачено: {formatCurrency(amounts.paid, currency as 'USD' | 'UZS')}</div>
                    <div className="text-red-600">Остаток: {formatCurrency(amounts.total - amounts.paid, currency as 'USD' | 'UZS')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">История операций</h3>
        {orderPayments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Нет операций</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Тип
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Пользователь
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Комментарий
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderPayments
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(payment => {
                    const user = getUserById(payment.createdBy);
                    const currency = payment.currency || 'USD';
                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatDateTime(payment.date)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.type === 'PREPAYMENT' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {payment.type === 'PREPAYMENT' ? 'Предоплата' : 'Погашение'}
                          </span>
                        </td>
                        <td className="px-4 py-2">{formatCurrency(payment.amount, currency)}</td>
                        <td className="px-4 py-2">{user?.fullName || 'Неизвестно'}</td>
                        <td className="px-4 py-2">{payment.comment || '-'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-lg font-bold mb-2">Итого по заказу:</div>
        <div className="space-y-2">
          {(() => {
            const totalsByCurrency = allocations.reduce((acc, a) => {
              const currency = a.currency || 'USD';
              acc[currency] = acc[currency] || { total: 0, paid: 0, remaining: 0 };
              acc[currency].total += a.totalSum;
              acc[currency].paid += calculatePaid(a.id);
              acc[currency].remaining += calculateRemaining(a);
              return acc;
            }, {} as Record<string, { total: number; paid: number; remaining: number }>);
            
            return Object.entries(totalsByCurrency).map(([currency, amounts]) => (
              <div key={currency} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center text-base font-semibold">
                  <span>Всего:</span>
                  <span>{formatCurrency(amounts.total, currency as 'USD' | 'UZS')}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                  <span>Оплачено:</span>
                  <span>{formatCurrency(amounts.paid, currency as 'USD' | 'UZS')}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-red-600 mt-1">
                  <span>Остаток:</span>
                  <span>{formatCurrency(amounts.remaining, currency as 'USD' | 'UZS')}</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={paymentType === 'PREPAYMENT' ? 'Предоплата' : 'Погасить'}
        footer={
          <>
            <Button onClick={() => setIsPaymentModalOpen(false)} variant="secondary">
              Отмена
            </Button>
            <Button onClick={handlePayment} className="ml-2">
              Создать
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedAllocation && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div className="font-medium">
                {getItemById(selectedAllocation.itemId)?.name}
              </div>
              <div className="text-gray-600">
                Остаток к оплате: {formatCurrency(calculateRemaining(selectedAllocation), selectedAllocation.currency || 'USD')}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Валюта: {selectedAllocation.currency || 'USD'}
              </div>
            </div>
          )}
          <Input
            label={`Сумма (${selectedAllocation?.currency || 'USD'})`}
            type="number"
            step="0.01"
            min="0"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
          />
          <Input
            label="Дата операции"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий (опционально)
            </label>
            <textarea
              value={paymentComment}
              onChange={(e) => setPaymentComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FinancePage;
