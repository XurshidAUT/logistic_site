import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, createOrder, createOrderLine, getCurrentUser, createAuditLog } from '../../store';
import type { Item } from '../../types';
import { convertToTons, generateOrderNumber, formatQuantity, formatNumber, calculateContainers } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: 'т' | 'кг' | 'конт.';
  quantityInTons: number;
  containerTonnage?: number;
}

const CreateOrderPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'т' | 'кг' | 'конт.'>('т');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [containerTonnage, setContainerTonnage] = useState<number>(26);
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
    const qtyInTons = convertToTons(qty, unit, containerTonnage);

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
        containerTonnage: unit === 'конт.' ? containerTonnage : undefined,
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
      status: 'locked', // Заказ закрывается после сохранения
      containerTonnage,
    });

    // Создаём строки заказа
    cart.forEach(cartItem => {
      createOrderLine({
        orderId: order.id,
        itemId: cartItem.itemId,
        quantity: cartItem.quantity,
        unit: cartItem.unit,
        quantityInTons: cartItem.quantityInTons,
        containerTonnage: cartItem.containerTonnage,
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
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Создать заказ</h2>

      {/* Add Item Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800">Добавить позицию</h3>
          </div>
          
          {/* Container tonnage toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Контейнер:</span>
            <button
              onClick={() => setContainerTonnage(26)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                containerTonnage === 26 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              26т/конт
            </button>
            <button
              onClick={() => setContainerTonnage(27)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                containerTonnage === 27 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              27т/конт
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
            onChange={(e) => setUnit(e.target.value as 'т' | 'кг' | 'конт.')}
            options={[
              { value: 'т', label: 'Тонны (т)' },
              { value: 'кг', label: 'Кг' },
              { value: 'конт.', label: 'Контейнеры (конт.)' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">В контейнерах</label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-semibold text-center">
              {quantity && parseFloat(quantity) > 0
                ? formatNumber(calculateContainers(convertToTons(parseFloat(quantity), unit, containerTonnage), containerTonnage))
                : '0'} конт.
            </div>
          </div>
        </div>

        <Button onClick={handleAddToCart} className="mt-6">
          <span className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Добавить
          </span>
        </Button>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800">Корзина заказа</h3>
          {cart.length > 0 && (
            <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {cart.length} {cart.length === 1 ? 'позиция' : 'позиций'}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 text-lg">Корзина пуста</p>
            <p className="text-gray-400 text-sm mt-1">Добавьте позиции выше</p>
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
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                      В контейнерах
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cart.map((item, index) => (
                    <tr key={index} className={`hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.itemName}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatQuantity(item.quantity, item.unit, item.quantityInTons, item.containerTonnage || containerTonnage)}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">{formatNumber(item.quantityInTons)} т</td>
                      <td className="px-6 py-4 text-blue-700 font-semibold">{formatNumber(calculateContainers(item.quantityInTons, item.containerTonnage || containerTonnage))} конт.</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditCartItem(index)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Изменить
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(index)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Всего позиций: <span className="font-bold text-gray-900">{cart.length}</span>
                {' | '}
                Всего контейнеров: <span className="font-bold text-blue-600">
                  {formatNumber(cart.reduce((sum, item) => sum + calculateContainers(item.quantityInTons, containerTonnage), 0))} конт.
                </span>
              </div>
              <Button onClick={handleSaveOrder} size="lg" className="shadow-lg">
                <span className="flex items-center">
                  Далее: распределение
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateOrderPage;
