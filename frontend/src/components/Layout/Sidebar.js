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
  ArrowPathIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon
} from '../Icons';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const navGroups = [
    {
      label: null,
      items: [
        { name: 'Dashboard', href: '/app/dashboard', icon: HomeIcon },
      ],
    },
    {
      label: 'Casework',
      items: [
        { name: 'Cases', href: '/app/cases', icon: DocumentIcon },
        { name: 'Clients', href: '/app/clients', icon: UserGroupIcon },
        { name: 'Tasks', href: '/app/tasks', icon: ClipboardDocumentListIcon },
        { name: 'Documents', href: '/app/documents', icon: FolderIcon },
      ],
    },
    {
      label: 'Practice',
      items: [
        { name: 'Time Tracking', href: '/app/time', icon: ClockIcon },
        { name: 'Medical Records', href: '/app/medical', icon: HeartIcon },
        { name: 'Reports', href: '/app/reports', icon: ChartBarIcon },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Legal Research', href: '/app/research', icon: MagnifyingGlassIcon },
        { name: 'Video Meetings', href: '/app/meetings', icon: VideoCameraIcon },
      ],
    },
  ];

  const adminNavigation = [
    { name: 'User Management', href: '/app/admin/users', icon: UsersIcon },
    { name: 'LMS Import', href: '/app/admin/import', icon: ArrowPathIcon },
    { name: 'AI Provider Keys', href: '/app/admin/ai-keys', icon: CogIcon },
  ];

  const settingsNavigation = [
    { name: 'Settings', href: '/app/settings', icon: CogIcon },
  ];

  const isCurrentPath = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col flex-grow overflow-y-auto bg-[oklch(0.96_0.004_60)] border-r border-[oklch(0.88_0.005_60)]">
      {/* Wordmark */}
      <div className="flex-shrink-0 px-4 py-5">
        <span className="text-[oklch(0.18_0.008_60)] font-bold text-base tracking-tight">Litigious</span>
      </div>

      {/* Nav groups */}
      <div className="flex-grow flex flex-col">
        <nav className="flex-1 px-2 pb-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 pt-5 pb-1">
                  <span className="text-[10px] font-semibold text-[oklch(0.50_0.005_60)] uppercase tracking-widest">
                    {group.label}
                  </span>
                </div>
              )}
              {group.items.map((item) => {
                const current = isCurrentPath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      current
                        ? 'bg-[oklch(0.91_0.010_240)] text-[oklch(0.25_0.018_240)] font-semibold'
                        : 'text-[oklch(0.35_0.006_60)] hover:bg-[oklch(0.93_0.004_60)] hover:text-[oklch(0.18_0.008_60)]'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div>
              <div className="px-3 pt-5 pb-1">
                <span className="text-[10px] font-semibold text-[oklch(0.50_0.005_60)] uppercase tracking-widest">
                  Administration
                </span>
              </div>
              {adminNavigation.map((item) => {
                const current = isCurrentPath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      current
                        ? 'bg-[oklch(0.91_0.010_240)] text-[oklch(0.25_0.018_240)] font-semibold'
                        : 'text-[oklch(0.35_0.006_60)] hover:bg-[oklch(0.93_0.004_60)] hover:text-[oklch(0.18_0.008_60)]'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Settings */}
          <div className="mt-4 pt-4 border-t border-[oklch(0.88_0.005_60)]">
            {settingsNavigation.map((item) => {
              const current = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                    current
                      ? 'bg-[oklch(0.91_0.010_240)] text-[oklch(0.25_0.018_240)] font-semibold'
                      : 'text-[oklch(0.35_0.006_60)] hover:bg-[oklch(0.93_0.004_60)] hover:text-[oklch(0.18_0.008_60)]'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-[oklch(0.88_0.005_60)] p-4">
          <div className="flex items-center">
            <div>
              <p className="text-sm font-medium text-[oklch(0.18_0.008_60)]">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-[oklch(0.50_0.005_60)] capitalize">
                {user?.role?.toLowerCase()}
              </p>
              <button
                onClick={logout}
                className="text-xs text-[oklch(0.40_0.012_240)] hover:text-[oklch(0.25_0.018_240)] mt-1 transition-colors"
              >
                Sign out
              </button>
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
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-[oklch(0.96_0.004_60)]">
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
