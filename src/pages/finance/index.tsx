import React from 'react';
import { Routes, Route } from 'react-router-dom';
import FinancePage from './FinancePage';
import FinanceListPage from './FinanceListPage';

const FinanceModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/:orderId" element={<FinancePage />} />
      <Route path="/" element={<FinanceListPage />} />
    </Routes>
  );
};

export default FinanceModule;
