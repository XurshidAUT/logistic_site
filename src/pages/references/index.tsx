import React from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import ItemsPage from './ItemsPage';
import SuppliersPage from './SuppliersPage';

const ReferencesPage: React.FC = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Справочники</h2>
        <div className="flex space-x-4 border-b border-gray-200">
          <Link
            to="/references/items"
            className="px-4 py-2 border-b-2 border-transparent hover:border-blue-500"
          >
            Позиции
          </Link>
          <Link
            to="/references/suppliers"
            className="px-4 py-2 border-b-2 border-transparent hover:border-blue-500"
          >
            Поставщики
          </Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/references/items" replace />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
      </Routes>
    </div>
  );
};

export default ReferencesPage;
