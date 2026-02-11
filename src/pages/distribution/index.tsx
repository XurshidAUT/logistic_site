import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DistributionPage from './DistributionPage';

const DistributionModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/:orderId" element={<DistributionPage />} />
      <Route path="/" element={
        <div className="text-center py-12">
          <p className="text-gray-600">Выберите заказ для распределения</p>
        </div>
      } />
    </Routes>
  );
};

export default DistributionModule;
