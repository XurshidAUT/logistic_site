import React from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../store';

const Dashboard: React.FC = () => {
  const currentUser = getCurrentUser();
  const currentDate = new Date().toLocaleDateString('ru-RU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const cards = [
    { 
      title: 'Заказы', 
      path: '/orders', 
      gradient: 'from-blue-500 to-blue-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      description: 'Управление заказами',
      count: '12'
    },
    { 
      title: 'Распределение', 
      path: '/distribution',
      gradient: 'from-emerald-500 to-green-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      description: 'Распределение товаров',
      count: '8'
    },
    { 
      title: 'Финансы', 
      path: '/finance',
      gradient: 'from-amber-500 to-orange-600',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'Финансовый учет',
      count: '5'
    },
    { 
      title: 'Справочники', 
      path: '/references',
      gradient: 'from-purple-500 to-indigo-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      description: 'Справочная информация',
      count: '3'
    },
  ];

  const stats = [
    { label: 'Всего заказов', value: '248', change: '+12%' },
    { label: 'Поставщиков', value: '42', change: '+3%' },
    { label: 'Позиций товаров', value: '1,234', change: '+8%' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Добро пожаловать, {currentUser?.fullName}! 👋
        </h1>
        <p className="text-gray-600 capitalize">{currentDate}</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-105"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
            
            {/* Content */}
            <div className="relative p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  {card.icon}
                </div>
                {card.count && (
                  <div className="px-3 py-1 bg-white/30 rounded-full text-sm font-bold backdrop-blur-sm">
                    {card.count}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-white/90 text-sm">{card.description}</p>
              
              {/* Arrow Icon */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Статистика</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
              <p className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</p>
              <p className="text-gray-600 font-medium mb-1">{stat.label}</p>
              <p className="text-green-600 text-sm font-semibold">{stat.change}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Быстрые действия</h3>
            <p className="text-white/90">Начните работу с создания нового заказа</p>
          </div>
          <Link
            to="/orders/create"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 duration-200"
          >
            + Создать заказ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
