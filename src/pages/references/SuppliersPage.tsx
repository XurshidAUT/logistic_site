import React, { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../store';
import type { Supplier } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contacts: '',
    notes: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    setSuppliers(getSuppliers());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
      showToast('Поставщик обновлён', 'success');
    } else {
      createSupplier(formData);
      showToast('Поставщик создан', 'success');
    }
    resetForm();
    loadSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contacts: supplier.contacts || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить этого поставщика?')) {
      deleteSupplier(id);
      showToast('Поставщик удалён', 'success');
      loadSuppliers();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', contacts: '', notes: '' });
    setEditingSupplier(null);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Поставщики</h2>
        <Button onClick={() => setIsModalOpen(true)}>+ Добавить поставщика</Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контакты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Примечание
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Нет поставщиков
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{supplier.name}</td>
                  <td className="px-6 py-4">{supplier.contacts || '-'}</td>
                  <td className="px-6 py-4">{supplier.notes || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="text-red-600 hover:text-red-900"
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
        title={editingSupplier ? 'Редактировать поставщика' : 'Новый поставщик'}
        footer={
          <>
            <Button onClick={resetForm} variant="secondary">
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="ml-2">
              {editingSupplier ? 'Сохранить' : 'Создать'}
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
          <Input
            label="Контакты (опционально)"
            value={formData.contacts}
            onChange={(e) => setFormData({ ...formData, contacts: e.target.value })}
            placeholder="Телефон, email, адрес"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечание (опционально)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;
