import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CreateOrderPage from './CreateOrderPage';
import OrdersListPage from './OrdersListPage';
import OrderDetailsPage from './OrderDetailsPage';

const OrdersPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<OrdersListPage />} />
      <Route path="/create" element={<CreateOrderPage />} />
      <Route path="/:orderId" element={<OrderDetailsPage />} />
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
};

export default OrdersPage;
