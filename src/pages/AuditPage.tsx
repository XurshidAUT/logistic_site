import React, { useState, useEffect } from 'react';
import { getAuditLogs, getUserById } from '../store';
import type { AuditLog } from '../types';
import { formatDateTime } from '../utils/helpers';

const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    const allLogs = getAuditLogs().sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(allLogs);
  };

  const getActionLabel = (action: string): string => {
    const labels: { [key: string]: string } = {
      CREATE_ORDER: 'Создание заказа',
      UPDATE_ORDER_STATUS: 'Обновление статуса заказа',
      CREATE_ALLOCATION: 'Создание распределения',
      CREATE_PAYMENT: 'Создание платежа',
    };
    return labels[action] || action;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Аудит действий</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата/Время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действие
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип сущности
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Детали
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Нет записей в аудите
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const user = getUserById(log.userId);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.entityType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user?.fullName || 'Неизвестно'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.details ? (
                          <pre className="text-xs text-gray-600 max-w-md overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          '-'
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
    </div>
  );
};

export default AuditPage;
