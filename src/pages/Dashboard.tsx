import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const cards = [
    { title: 'Заказы', path: '/orders', icon: '📦', color: 'blue' },
    { title: 'Распределение', path: '/distribution', icon: '🚚', color: 'green' },
    { title: 'Финансы', path: '/finance', icon: '💰', color: 'yellow' },
    { title: 'Справочники', path: '/references', icon: '📚', color: 'purple' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Главная панель</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-t-4 border-${card.color}-500`}
          >
            <div className="text-4xl mb-4">{card.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
