import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      '/app/dashboard': 'Dashboard',
      '/app/cases': 'Cases',
      '/app/clients': 'Clients',
      '/app/tasks': 'Tasks',
      '/app/documents': 'Documents',
      '/app/time': 'Time Tracking',
      '/app/medical': 'Medical Records',
      '/app/reports': 'Reports',
      '/app/research': 'Legal Research',
      '/app/admin/users': 'User Management',
      '/app/settings': 'Settings'
    };

    if (path.startsWith('/app/cases/') && path !== '/app/cases') return 'Case Details';
    if (path.startsWith('/app/clients/') && path !== '/app/clients') return 'Client Details';

    return titles[path] || 'LegalEstate';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'oklch(0.97 0.005 60)' }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="lg:pl-64">
        <Header
          setSidebarOpen={setSidebarOpen}
          pageTitle={getPageTitle()}
        />

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
