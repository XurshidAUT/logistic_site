import React, { useState, useEffect } from 'react';
import {
  isAdminMode,
  setAdminMode,
  getOrders,
  getItems,
  getSuppliers,
  getPayments,
  clearAllData,
  createAuditLog,
  getCurrentUser,
} from '../store';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const AdminPage: React.FC = () => {
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  useEffect(() => {
    setAdminEnabled(isAdminMode());
  }, []);

  const handleToggleAdminMode = () => {
    const newMode = !adminEnabled;
    
    if (newMode) {
      // Show warning when enabling
      if (!window.confirm('⚠️ Внимание! Вы включаете режим администратора. Изменения сохранённых данных будут возможны.')) {
        return;
      }
    }
    
    setAdminMode(newMode);
    setAdminEnabled(newMode);
    
    if (currentUser) {
      createAuditLog({
        action: newMode ? 'ENABLE_ADMIN_MODE' : 'DISABLE_ADMIN_MODE',
        entityType: 'System',
        entityId: 'admin_mode',
        userId: currentUser.id,
        details: { enabled: newMode },
      });
    }
    
    showToast(
      newMode ? 'Режим администратора включен' : 'Режим администратора выключен',
      newMode ? 'warning' : 'success'
    );
    
    // Reload page to update UI
    window.location.reload();
  };

  const handleClearAllData = () => {
    if (currentUser) {
      createAuditLog({
        action: 'CLEAR_ALL_DATA',
        entityType: 'System',
        entityId: 'all_data',
        userId: currentUser.id,
        details: {},
      });
    }
    
    clearAllData();
    setShowClearConfirm(false);
    showToast('Все данные очищены', 'success');
    window.location.reload();
  };

  const handleExportData = () => {
    const data = {
      orders: getOrders(),
      items: getItems(),
      suppliers: getSuppliers(),
      payments: getPayments(),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Данные экспортированы', 'success');
    
    if (currentUser) {
      createAuditLog({
        action: 'EXPORT_DATA',
        entityType: 'System',
        entityId: 'all_data',
        userId: currentUser.id,
        details: {},
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Import data (this is a simplified version)
        if (data.items) localStorage.setItem('logistics_items', JSON.stringify(data.items));
        if (data.suppliers) localStorage.setItem('logistics_suppliers', JSON.stringify(data.suppliers));
        if (data.orders) localStorage.setItem('logistics_orders', JSON.stringify(data.orders));
        if (data.payments) localStorage.setItem('logistics_payments', JSON.stringify(data.payments));
        
        showToast('Данные импортированы', 'success');
        
        if (currentUser) {
          createAuditLog({
            action: 'IMPORT_DATA',
            entityType: 'System',
            entityId: 'all_data',
            userId: currentUser.id,
            details: {},
          });
        }
        
        window.location.reload();
      } catch (error) {
        showToast('Ошибка импорта данных', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Get statistics
  const stats = {
    orders: getOrders().length,
    items: getItems().length,
    suppliers: getSuppliers().length,
    payments: getPayments().length,
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center mb-8">
          <span className="text-4xl mr-4">🔧</span>
          <h2 className="text-3xl font-bold text-gray-800">Панель администратора</h2>
        </div>

        {/* Admin Mode Toggle */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Режим администратора</h3>
              <p className="text-sm text-gray-600">
                {adminEnabled 
                  ? '✅ Режим администратора включен. Редактирование и удаление доступны.'
                  : '❌ Режим администратора выключен. Редактирование и удаление заблокированы.'}
              </p>
            </div>
            <button
              onClick={handleToggleAdminMode}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                adminEnabled
                  ? 'bg-red-600 focus:ring-red-500'
                  : 'bg-gray-300 focus:ring-gray-500'
              }`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                  adminEnabled ? 'translate-x-12' : 'translate-x-1'
                }`}
              />
              <span
                className={`absolute text-xs font-bold ${
                  adminEnabled
                    ? 'left-2 text-white'
                    : 'right-2 text-gray-700'
                }`}
              >
                {adminEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
          
          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-700">
              ⚠️ <strong>Режим администратора</strong> позволяет редактировать и удалять сохранённые данные. 
              Используйте с осторожностью.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Статистика системы
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{stats.orders}</div>
              <div className="text-sm text-gray-600 mt-1">📦 Заказов</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-600">{stats.items}</div>
              <div className="text-sm text-gray-600 mt-1">📋 Позиций</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{stats.suppliers}</div>
              <div className="text-sm text-gray-600 mt-1">🏢 Поставщиков</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-3xl font-bold text-orange-600">{stats.payments}</div>
              <div className="text-sm text-gray-600 mt-1">💳 Финансовых операций</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">⚙️</span>
            Действия
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportData}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
              >
                <span className="mr-2">📥</span>
                Экспорт данных (JSON)
              </Button>
              <label className="cursor-pointer">
                <Button
                  as="span"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                >
                  <span className="mr-2">📤</span>
                  Импорт данных (JSON)
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
            
            <div>
              {!showClearConfirm ? (
                <Button
                  onClick={() => setShowClearConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center"
                >
                  <span className="mr-2">🗑️</span>
                  Очистить все данные
                </Button>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-red-800 font-semibold mb-3">
                    ⚠️ Вы уверены? Это действие нельзя отменить!
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleClearAllData}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Да, удалить всё
                    </Button>
                    <Button
                      onClick={() => setShowClearConfirm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
