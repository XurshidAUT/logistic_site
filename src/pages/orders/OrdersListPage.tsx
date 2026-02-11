import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, getOrderLinesByOrderId, getUserById } from '../../store';
import type { Order } from '../../types';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/ui/Button';

const OrdersListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    const allOrders = getOrders().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setOrders(allOrders);
  };

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      distributed: 'bg-blue-100 text-blue-800',
      financial: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };

    const labels = {
      draft: 'Черновик',
      distributed: 'Распределён',
      financial: 'Финансы',
      completed: 'Завершён',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Список заказов</h2>
        <Link to="/orders/create">
          <Button>+ Создать заказ</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Создатель
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Позиций
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Нет заказов. <Link to="/orders/create" className="text-blue-600 hover:text-blue-800">Создать первый заказ</Link>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const lines = getOrderLinesByOrderId(order.id);
                const creator = getUserById(order.createdBy);
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {creator?.fullName || 'Неизвестно'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lines.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/distribution/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Распределение
                      </Link>
                      {order.status !== 'draft' && (
                        <Link
                          to={`/finance/${order.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Финансы
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersListPage;
