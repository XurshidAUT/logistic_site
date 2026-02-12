import React, { useState, useEffect } from 'react';
import { getItems, createItem, updateItem, deleteItem, isAdminMode } from '../../store';
import type { Item } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

const ItemsPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'т' as 'т' | 'кг' | 'конт.',
    category: '',
    description: '',
  });
  const { showToast } = useToast();
  const adminMode = isAdminMode();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    setItems(getItems());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItem(editingItem.id, formData);
      showToast('Позиция обновлена', 'success');
    } else {
      createItem(formData);
      showToast('Позиция создана', 'success');
    }
    resetForm();
    loadItems();
  };

  const handleEdit = (item: Item) => {
    if (!adminMode) {
      showToast('Включите режим администратора для редактирования', 'error');
      return;
    }
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      category: item.category || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!adminMode) {
      showToast('Включите режим администратора для удаления', 'error');
      return;
    }
    if (confirm('Удалить эту позицию?')) {
      deleteItem(id);
      showToast('Позиция удалена', 'success');
      loadItems();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', unit: 'т', category: '', description: '' });
    setEditingItem(null);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Позиции (номенклатура)</h2>
        <Button onClick={() => setIsModalOpen(true)}>+ Добавить позицию</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ед. измерения
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Категория
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Описание
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Нет позиций
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.category || '-'}</td>
                  <td className="px-6 py-4">{item.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={!adminMode}
                      className={`${
                        adminMode 
                          ? 'text-blue-600 hover:text-blue-900 cursor-pointer' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title={!adminMode ? 'Включите режим администратора' : ''}
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={!adminMode}
                      className={`${
                        adminMode 
                          ? 'text-red-600 hover:text-red-900 cursor-pointer' 
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title={!adminMode ? 'Включите режим администратора' : ''}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingItem ? 'Редактировать позицию' : 'Новая позиция'}
        footer={
          <>
            <Button onClick={resetForm} variant="secondary">
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="ml-2">
              {editingItem ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Название"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Select
            label="Единица измерения"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'т' | 'кг' | 'конт.' })}
            options={[
              { value: 'т', label: 'Тонны (т)' },
              { value: 'кг', label: 'Килограммы (кг)' },
              { value: 'конт.', label: 'Контейнеры (конт.)' },
            ]}
          />
          <Input
            label="Категория (опционально)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (опционально)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ItemsPage;
