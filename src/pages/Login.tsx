import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserByUsername, setCurrentUser } from '../store';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const user = getUserByUsername(username);
    if (user && user.password === password) {
      setCurrentUser(user);
      showToast('Успешный вход!', 'success');
      navigate('/orders');
    } else {
      showToast('Неверное имя пользователя или пароль', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Логистика</h1>
          <p className="text-gray-600">Войдите в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Имя пользователя"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
          />

          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
          />

          <Button type="submit" className="w-full">
            Войти
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>По умолчанию:</p>
          <p className="font-mono">admin / admin</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
