import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getOrderById, 
  getOrderLinesByOrderId, 
  getUserById, 
  getItemById,
  updateOrder,
  deleteOrder,
  deleteOrderLine,
  getCurrentUser,
  createAuditLog
} from '../../store';
import type { Order, OrderLine } from '../../types';
import { formatDate, formatQuantity, formatNumber, calculateContainers } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

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
  }, [orderId]);

  const handleUnlock = () => {
    if (!order || !currentUser) return;

    updateOrder(order.id, { status: 'draft' });
    
    createAuditLog({
      action: 'UNLOCK_ORDER',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { orderNumber: order.orderNumber },
    });

    showToast('Заказ открыт для изменений', 'success');
    setOrder({ ...order, status: 'draft' });
  };

  const handleLock = () => {
    if (!order || !currentUser) return;

    updateOrder(order.id, { status: 'locked' });
    
    createAuditLog({
      action: 'LOCK_ORDER',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { orderNumber: order.orderNumber },
    });

    showToast('Заказ закрыт для изменений', 'success');
    setOrder({ ...order, status: 'locked' });
  };

  const handleDelete = () => {
    if (!order || !currentUser) return;

    if (order.status !== 'draft') {
      showToast('Нельзя удалить закрытый заказ. Сначала откройте его для изменений.', 'error');
      return;
    }

    if (!confirm(`Удалить заказ ${order.orderNumber}?`)) {
      return;
    }

    // Удаляем все строки заказа
    orderLines.forEach(line => deleteOrderLine(line.id));
    
    // Удаляем заказ
    deleteOrder(order.id);

    createAuditLog({
      action: 'DELETE_ORDER',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { orderNumber: order.orderNumber },
    });

    showToast('Заказ удалён', 'success');
    navigate('/orders');
  };

  if (!order) {
    return <div>Загрузка...</div>;
  }

  const creator = getUserById(order.createdBy);
  const isEditable = order.status === 'draft';
  const totalContainers = orderLines.reduce((sum, line) => 
    sum + calculateContainers(line.quantityInTons, order.containerTonnage || 26), 0
  );

  const getStatusInfo = (status: Order['status']) => {
    const statusConfig = {
      draft: { label: '🔓 Открыт', color: 'bg-gray-100 text-gray-800' },
      locked: { label: '🔒 Закрыт', color: 'bg-orange-100 text-orange-800' },
      distributed: { label: 'Распределён', color: 'bg-blue-100 text-blue-800' },
      financial: { label: 'Финансы', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Завершён', color: 'bg-green-100 text-green-800' },
    };
    return statusConfig[status];
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Заказ {order.orderNumber}
        </h2>
        <div className="flex gap-3">
          <Link to="/orders">
            <Button variant="secondary">
              Назад к списку
            </Button>
          </Link>
        </div>
      </div>

      {/* Order Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-600">Дата создания:</span>
            <p className="font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Создатель:</span>
            <p className="font-semibold text-gray-900">{creator?.fullName || 'Неизвестно'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Статус:</span>
            <p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Контейнер:</span>
            <p className="font-semibold text-gray-900">{order.containerTonnage || 26} т/конт</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t">
          {order.status === 'locked' && (
            <Button onClick={handleUnlock}>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Открыть для изменений
              </span>
            </Button>
          )}
          {order.status === 'draft' && (
            <>
              <Button onClick={handleLock} variant="secondary">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Закрыть для изменений
                </span>
              </Button>
              <Button 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Удалить заказ
                </span>
              </Button>
            </>
          )}
          <Link to={`/distribution/${order.id}`}>
            <Button variant="secondary">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Распределение
              </span>
            </Button>
          </Link>
          {order.status !== 'draft' && (
            <Link to={`/finance/${order.id}`}>
              <Button variant="secondary">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Финансы
                </span>
              </Button>
            </Link>
          )}
        </div>

        {!isEditable && order.status !== 'draft' && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Заказ закрыт для изменений.</strong> Невозможно редактировать или удалять позиции. 
              Нажмите "Открыть для изменений" чтобы разблокировать заказ.
            </p>
          </div>
        )}
      </div>

      {/* Order Lines */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Позиции заказа</h3>
        
        {orderLines.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет позиций в заказе</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                      Позиция
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                      Количество
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                      В тоннах
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderLines.map((line, index) => {
                    const item = getItemById(line.itemId);
                    return (
                      <tr key={line.id} className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {item?.name || 'Неизвестно'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {formatQuantity(line.quantity, line.unit, line.quantityInTons, order.containerTonnage || 26)}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-semibold">
                          {formatNumber(line.quantityInTons)} т
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <strong>Всего позиций:</strong> {orderLines.length}
                </div>
                <div className="text-sm font-bold text-blue-700">
                  <strong>Всего контейнеров:</strong> {formatNumber(totalContainers)} конт.
                </div>
                <div className="text-sm font-bold text-gray-900">
                  <strong>Всего тонн:</strong> {formatNumber(orderLines.reduce((sum, line) => sum + line.quantityInTons, 0))} т
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;
