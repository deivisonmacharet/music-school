import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  FaHome, FaUsers, FaChalkboardTeacher, FaBook, 
  FaDollarSign, FaCalendarAlt, FaClipboardList, 
  FaSignOutAlt, FaBars, FaTimes, FaMusic 
} from 'react-icons/fa';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = getMenuItems(user?.role);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-primary-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <FaMusic className="text-2xl mr-2" />
          <span className="font-bold">Music School</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white shadow-lg transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="hidden lg:flex items-center p-6 border-b">
              <FaMusic className="text-3xl text-primary-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Music School</h1>
                <p className="text-xs text-gray-600">Sistema de Gestão</p>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b">
              <p className="font-semibold text-gray-800">{user?.name || user?.email}</p>
              <p className="text-sm text-gray-600 capitalize">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'employee' ? 'Funcionário' : 'Aluno'}
              </p>
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${isActive(item.path) 
                          ? 'bg-primary-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      <item.icon className="text-xl mr-3" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FaSignOutAlt className="text-xl mr-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getMenuItems(role) {
  const items = [
    { path: '/dashboard', label: 'Dashboard', icon: FaHome, roles: ['admin', 'employee', 'student'] },
    { path: '/students', label: 'Alunos', icon: FaUsers, roles: ['admin', 'employee'] },
    { path: '/teachers', label: 'Professores', icon: FaChalkboardTeacher, roles: ['admin', 'employee'] },
    { path: '/classes', label: 'Turmas', icon: FaBook, roles: ['admin', 'employee'] },
    { path: '/payments', label: 'Pagamentos', icon: FaDollarSign, roles: ['admin', 'employee'] },
    { path: '/events', label: 'Eventos', icon: FaCalendarAlt, roles: ['admin', 'employee'] },
    { path: '/attendance', label: 'Chamada', icon: FaClipboardList, roles: ['admin', 'employee'] },
  ];

  return items.filter(item => item.roles.includes(role));
}
