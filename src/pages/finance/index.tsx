import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FinancePage from './FinancePage';

const FinanceModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/:orderId" element={<FinancePage />} />
      <Route path="/" element={
        <div className="text-center py-12">
          <p className="text-gray-600">Выберите заказ для просмотра финансов</p>
        </div>
      } />
    </Routes>
  );
};

export default FinanceModule;
