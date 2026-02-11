import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DistributionPage from './DistributionPage';
import DistributionListPage from './DistributionListPage';

const DistributionModule: React.FC = () => {
  return (
    <Routes>
      <Route path="/:orderId" element={<DistributionPage />} />
      <Route path="/" element={<DistributionListPage />} />
    </Routes>
  );
};

export default DistributionModule;
