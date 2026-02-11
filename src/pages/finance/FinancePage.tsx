import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getOrderById,
  getAllocationsByOrderId,
  getPayments,
  getPaymentsByAllocationId,
  getPaymentsBySupplierAndOrder,
  getSupplierById,
  getItemById,
  getUserById,
  createPayment,
  getCurrentUser,
  createAuditLog,
  updateOrder,
} from '../../store';
import type { Order, Allocation, PaymentOperation } from '../../types';
import { formatDate, formatDateTime, formatCurrency, formatQuantity } from '../../utils/helpers';
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
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'UZS'>('USD');
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

  // Calculate paid amount for a single allocation (backward compatibility)
  const calculatePaidForAllocation = (allocationId: string): number => {
    return getPaymentsByAllocationId(allocationId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Calculate paid amount for supplier in specific currency
  const calculatePaidForSupplier = (supplierId: string, currency: 'USD' | 'UZS'): number => {
    // New supplier-level payments
    const supplierPayments = getPaymentsBySupplierAndOrder(supplierId, orderId!)
      .filter(p => p.currency === currency)
      .reduce((sum, p) => sum + p.amount, 0);
    
    // Legacy allocation-level payments
    const supplierAllocations = allocations.filter(a => a.supplierId === supplierId && a.currency === currency);
    const legacyPayments = supplierAllocations.reduce((sum, a) => {
      return sum + calculatePaidForAllocation(a.id);
    }, 0);
    
    return supplierPayments + legacyPayments;
  };

  const openPaymentModal = (supplierId: string, currency: 'USD' | 'UZS', type: 'PREPAYMENT' | 'PAYOFF') => {
    setSelectedSupplierId(supplierId);
    setSelectedCurrency(currency);
    setPaymentType(type);
    
    // Calculate remaining for this supplier in this currency
    const supplierAllocations = allocations.filter(a => a.supplierId === supplierId && a.currency === currency);
    const total = supplierAllocations.reduce((sum, a) => sum + a.totalSum, 0);
    const paid = calculatePaidForSupplier(supplierId, currency);
    const remaining = total - paid;
    
    setPaymentAmount(type === 'PAYOFF' ? remaining.toString() : '');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentComment('');
    setIsPaymentModalOpen(true);
  };

  const handlePayment = () => {
    if (!selectedSupplierId || !currentUser || !paymentAmount || !orderId) {
      showToast('Заполните все обязательные поля', 'error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      showToast('Сумма должна быть больше 0', 'error');
      return;
    }

    // Calculate remaining
    const supplierAllocations = allocations.filter(a => a.supplierId === selectedSupplierId && a.currency === selectedCurrency);
    const total = supplierAllocations.reduce((sum, a) => sum + a.totalSum, 0);
    const paid = calculatePaidForSupplier(selectedSupplierId, selectedCurrency);
    const remaining = total - paid;

    if (amount > remaining) {
      showToast('Сумма превышает остаток к оплате', 'error');
      return;
    }

    const payment = createPayment({
      orderId: orderId,
      supplierId: selectedSupplierId,
      type: paymentType,
      amount,
      date: paymentDate,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      comment: paymentComment || undefined,
      currency: selectedCurrency,
    });

    createAuditLog({
      action: 'CREATE_PAYMENT',
      entityType: 'PaymentOperation',
      entityId: payment.id,
      userId: currentUser.id,
      details: { 
        orderId,
        supplierId: selectedSupplierId, 
        type: paymentType, 
        amount,
        currency: selectedCurrency,
      },
    });

    showToast(paymentType === 'PREPAYMENT' ? 'Предоплата создана' : 'Погашение создано', 'success');
    setAllPayments(getPayments());
    setIsPaymentModalOpen(false);

    // Check if everything is paid
    const allAllocations = getAllocationsByOrderId(orderId);
    const allPaid = allAllocations.every(a => {
      const aPaid = calculatePaidForAllocation(a.id);
      return a.totalSum === aPaid;
    }) && Object.entries(getSupplierTotals()).every(([supplierId, currencies]) => {
      return Object.entries(currencies).every(([currency, amounts]) => {
        const paid = calculatePaidForSupplier(supplierId, currency as 'USD' | 'UZS');
        return amounts.total === paid;
      });
    });

    if (allPaid && order && order.status === 'distributed') {
      updateOrder(order.id, { status: 'financial' });
      const updatedOrder = getOrderById(orderId);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
    }
  };

  const getSupplierTotals = () => {
    return allocations.reduce((groups, allocation) => {
      const supplierId = allocation.supplierId;
      const currency = allocation.currency || 'USD';
      
      if (!groups[supplierId]) {
        groups[supplierId] = {};
      }
      if (!groups[supplierId][currency]) {
        groups[supplierId][currency] = { total: 0, allocations: [] };
      }
      
      groups[supplierId][currency].total += allocation.totalSum;
      groups[supplierId][currency].allocations.push(allocation);
      
      return groups;
    }, {} as { [supplierId: string]: { [currency: string]: { total: number; allocations: Allocation[] } } });
  };

  if (!order) {
    return <div>Загрузка...</div>;
  }

  const creator = getUserById(order.createdBy);
  const orderPayments = allPayments.filter(p => 
    (p.orderId === orderId) || allocations.some(a => a.id === p.allocationId)
  );

  const supplierTotals = getSupplierTotals();

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

      {Object.entries(supplierTotals).map(([supplierId, currencies]) => {
        const supplier = getSupplierById(supplierId);
        
        return (
          <div key={supplierId} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Поставщик: {supplier?.name || 'Неизвестно'}
            </h3>
            
            {Object.entries(currencies).map(([currency, data]) => {
              const paid = calculatePaidForSupplier(supplierId, currency as 'USD' | 'UZS');
              const remaining = data.total - paid;
              const status = remaining === 0 ? 'Оплачено' : 
                           remaining === data.total ? 'Не оплачено' : 
                           'Частично оплачено';
              
              return (
                <div key={currency} className="mb-6 last:mb-0">
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
                            Валюта
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.allocations.map(allocation => {
                          const item = getItemById(allocation.itemId);
                          return (
                            <tr key={allocation.id}>
                              <td className="px-4 py-2">{item?.name || 'Неизвестно'}</td>
                              <td className="px-4 py-2">
                                {formatQuantity(allocation.quantity, allocation.unit, allocation.quantityInTons)}
                              </td>
                              <td className="px-4 py-2">{formatCurrency(allocation.pricePerTon, currency as 'USD' | 'UZS')}</td>
                              <td className="px-4 py-2">{formatCurrency(allocation.totalSum, currency as 'USD' | 'UZS')}</td>
                              <td className="px-4 py-2">{currency}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-8">
                          <span className="text-gray-600">ИТОГО:</span>
                          <span className="font-semibold">{formatCurrency(data.total, currency as 'USD' | 'UZS')}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-gray-600">Оплачено:</span>
                          <span className="font-semibold">{formatCurrency(paid, currency as 'USD' | 'UZS')}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span className="text-gray-600">Остаток:</span>
                          <span className="font-semibold text-red-600">{formatCurrency(remaining, currency as 'USD' | 'UZS')}</span>
                        </div>
                        <div className="flex justify-between gap-8 mt-2">
                          <span className="text-gray-600">Статус:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            status === 'Оплачено' ? 'bg-green-100 text-green-800' :
                            status === 'Частично оплачено' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </div>
                      </div>
                      
                      {remaining > 0 && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openPaymentModal(supplierId, currency as 'USD' | 'UZS', 'PREPAYMENT')}
                          >
                            Предоплата
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openPaymentModal(supplierId, currency as 'USD' | 'UZS', 'PAYOFF')}
                          >
                            Погасить
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    Поставщик
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
                    
                    // Get supplier - either from new model or legacy allocation
                    let supplierName = 'Неизвестно';
                    if (payment.supplierId) {
                      const supplier = getSupplierById(payment.supplierId);
                      supplierName = supplier?.name || 'Неизвестно';
                    } else if (payment.allocationId) {
                      const allocation = allocations.find(a => a.id === payment.allocationId);
                      if (allocation) {
                        const supplier = getSupplierById(allocation.supplierId);
                        supplierName = supplier?.name || 'Неизвестно';
                      }
                    }
                    
                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatDateTime(payment.date)}
                        </td>
                        <td className="px-4 py-2">{supplierName}</td>
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
              return acc;
            }, {} as Record<string, { total: number; paid: number; remaining: number }>);
            
            // Calculate paid per currency from all suppliers
            Object.keys(totalsByCurrency).forEach(currency => {
              const curr = currency as 'USD' | 'UZS';
              let totalPaid = 0;
              Object.keys(supplierTotals).forEach(supplierId => {
                totalPaid += calculatePaidForSupplier(supplierId, curr);
              });
              totalsByCurrency[currency].paid = totalPaid;
              totalsByCurrency[currency].remaining = totalsByCurrency[currency].total - totalPaid;
            });
            
            return Object.entries(totalsByCurrency).map(([currency, amounts]) => (
              <div key={currency} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between items-center text-base font-semibold">
                  <span>Всего ({currency}):</span>
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
          {selectedSupplierId && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div className="font-medium">
                {getSupplierById(selectedSupplierId)?.name}
              </div>
              <div className="text-gray-600">
                Остаток к оплате: {(() => {
                  const supplierAllocations = allocations.filter(a => a.supplierId === selectedSupplierId && a.currency === selectedCurrency);
                  const total = supplierAllocations.reduce((sum, a) => sum + a.totalSum, 0);
                  const paid = calculatePaidForSupplier(selectedSupplierId, selectedCurrency);
                  return formatCurrency(total - paid, selectedCurrency);
                })()}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Валюта: {selectedCurrency}
              </div>
            </div>
          )}
          <Input
            label={`Сумма (${selectedCurrency})`}
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
