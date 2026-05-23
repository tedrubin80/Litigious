import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  XMarkIcon,
  HomeIcon,
  DocumentIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  ClockIcon,
  HeartIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon
} from '../Icons';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, isAdmin, isAttorney, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: HomeIcon },
    { name: 'Cases', href: '/app/cases', icon: DocumentIcon },
    { name: 'Clients', href: '/app/clients', icon: UserGroupIcon },
    { name: 'Tasks', href: '/app/tasks', icon: ClipboardDocumentListIcon },
    { name: 'Documents', href: '/app/documents', icon: FolderIcon },
    { name: 'Legal Research', href: '/app/research', icon: MagnifyingGlassIcon },
    { name: 'Video Meetings', href: '/app/meetings', icon: VideoCameraIcon },
    { name: 'Time Tracking', href: '/app/time', icon: ClockIcon },
    { name: 'Medical Records', href: '/app/medical', icon: HeartIcon },
    { name: 'Reports', href: '/app/reports', icon: ChartBarIcon },
  ];

  const adminNavigation = [
    { name: 'User Management', href: '/app/admin/users', icon: UsersIcon },
  ];

  const settingsNavigation = [
    { name: 'Settings', href: '/app/settings', icon: CogIcon },
  ];

  const isCurrentPath = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white border-r border-gray-200">
      <div className="flex items-center flex-shrink-0 px-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LE</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">Legal Eagle</h1>
            <p className="text-xs text-gray-500">Practice Management</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex-grow flex flex-col">
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const current = isCurrentPath(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  current
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={`${
                    current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="pt-6">
                <div className="px-3 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                {adminNavigation.map((item) => {
                  const current = isCurrentPath(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        current
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={`${
                          current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Settings Section */}
          <div className="pt-6">
            {settingsNavigation.map((item) => {
              const current = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    current
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`${
                      current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } flex-shrink-0 -ml-1 mr-3 h-6 w-6`}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 group block">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-blue-600 hover:text-blue-500 mt-1"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14" />
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;