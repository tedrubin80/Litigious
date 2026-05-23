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
      '/dashboard': 'Dashboard',
      '/cases': 'Cases',
      '/clients': 'Clients',
      '/tasks': 'Tasks',
      '/documents': 'Documents',
      '/time': 'Time Tracking',
      '/medical': 'Medical Records',
      '/reports': 'Reports',
      '/research': 'Legal Research',
      '/admin/users': 'User Management',
      '/settings': 'Settings'
    };
    
    // Handle dynamic routes like /cases/:id
    if (path.startsWith('/cases/') && path !== '/cases') return 'Case Details';
    if (path.startsWith('/clients/') && path !== '/clients') return 'Client Details';
    
    return titles[path] || 'Legal Eagle';
  };

  return (
    <div className="min-h-screen bg-gray-50">
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