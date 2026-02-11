import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, createOrder, createOrderLine, getCurrentUser, createAuditLog } from '../../store';
import type { Item } from '../../types';
import { convertToTons, generateOrderNumber } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: 'т' | 'кг';
  quantityInTons: number;
}

const CreateOrderPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'т' | 'кг'>('т');
  const [cart, setCart] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  useEffect(() => {
    setItems(getItems());
  }, []);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || parseFloat(quantity) <= 0) {
      showToast('Выберите позицию и укажите количество', 'error');
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    const qty = parseFloat(quantity);
    const qtyInTons = convertToTons(qty, unit);

    // Проверяем, есть ли эта позиция уже в корзине
    const existingIndex = cart.findIndex(c => c.itemId === selectedItemId);
    
    if (existingIndex >= 0) {
      // Если есть, суммируем количество
      const updated = [...cart];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + qty,
        quantityInTons: updated[existingIndex].quantityInTons + qtyInTons,
      };
      setCart(updated);
      showToast('Количество увеличено', 'success');
    } else {
      // Если нет, добавляем новую строку
      setCart([...cart, {
        itemId: selectedItemId,
        itemName: item.name,
        quantity: qty,
        unit: unit,
        quantityInTons: qtyInTons,
      }]);
      showToast('Позиция добавлена в корзину', 'success');
    }

    // Сброс формы
    setSelectedItemId('');
    setQuantity('');
    setUnit('т');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    showToast('Позиция удалена из корзины', 'success');
  };

  const handleEditCartItem = (index: number) => {
    const item = cart[index];
    setSelectedItemId(item.itemId);
    setQuantity(item.quantity.toString());
    setUnit(item.unit);
    handleRemoveFromCart(index);
  };

  const handleSaveOrder = () => {
    if (cart.length === 0) {
      showToast('Добавьте позиции в заказ', 'error');
      return;
    }

    if (!currentUser) {
      showToast('Необходимо авторизоваться', 'error');
      return;
    }

    const orderNumber = generateOrderNumber();
    const order = createOrder({
      orderNumber,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      status: 'draft',
    });

    // Создаём строки заказа
    cart.forEach(cartItem => {
      createOrderLine({
        orderId: order.id,
        itemId: cartItem.itemId,
        quantity: cartItem.quantity,
        unit: cartItem.unit,
        quantityInTons: cartItem.quantityInTons,
      });
    });

    // Логируем действие
    createAuditLog({
      action: 'CREATE_ORDER',
      entityType: 'Order',
      entityId: order.id,
      userId: currentUser.id,
      details: { orderNumber, itemsCount: cart.length },
    });

    showToast('Заказ создан', 'success');
    navigate(`/distribution/${order.id}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Создать заказ</h2>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Добавить позицию</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <Select
              label="Позиция"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              options={[
                { value: '', label: 'Выберите позицию...' },
                ...items.map(item => ({ value: item.id, label: item.name }))
              ]}
            />
          </div>

          <Input
            label="Количество"
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
          />

          <Select
            label="Единица"
            value={unit}
            onChange={(e) => setUnit(e.target.value as 'т' | 'кг')}
            options={[
              { value: 'т', label: 'Тонны (т)' },
              { value: 'кг', label: 'Кг' },
            ]}
          />
        </div>

        <Button onClick={handleAddToCart} className="mt-4">
          Добавить в корзину
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Корзина заказа</h3>

        {cart.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Корзина пуста</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Позиция
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Количество
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ед.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      В тоннах
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cart.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{item.itemName}</td>
                      <td className="px-6 py-4">{item.quantity}</td>
                      <td className="px-6 py-4">{item.unit}</td>
                      <td className="px-6 py-4">{item.quantityInTons.toFixed(3)} т</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditCartItem(index)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveOrder} size="lg">
                Далее: распределение →
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateOrderPage;
