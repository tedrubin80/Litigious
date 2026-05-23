import React, { useState } from 'react';
import { Bars3Icon, BellIcon, MagnifyingGlassIcon } from '../Icons';
import { useAuth } from '../../contexts/AuthContext';
import VideoConferenceOptionsModal from '../VideoConference/VideoConferenceOptionsModal';

const Header = ({ setSidebarOpen, pageTitle }) => {
  const { user } = useAuth();
  const [showVideoModal, setShowVideoModal] = useState(false);

  const initials = [user?.firstName?.charAt(0), user?.lastName?.charAt(0)]
    .filter(Boolean).join('') || '?';

  return (
    <div
      className="sticky top-0 z-10 flex-shrink-0 flex h-14"
      style={{
        backgroundColor: 'oklch(0.99 0.003 60)',
        borderBottom: '1px solid oklch(0.88 0.005 60)',
      }}
    >
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        className="px-4 lg:hidden"
        style={{ color: 'oklch(0.55 0.006 60)', borderRight: '1px solid oklch(0.88 0.005 60)' }}
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-5 w-5" />
      </button>

      <div className="flex-1 px-4 flex justify-between items-center">
        {/* Search */}
        <div className="flex-1 flex max-w-xs">
          <div className="w-full flex md:ml-0">
            <label htmlFor="search-field" className="sr-only">Search</label>
            <div className="relative w-full" style={{ color: 'oklch(0.60 0.005 60)' }}>
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4" />
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-7 pr-3 py-2 bg-transparent border-0 text-sm focus:outline-none focus:ring-0"
                style={{
                  color: 'oklch(0.18 0.008 60)',
                }}
                placeholder="Search cases, clients..."
                type="search"
                name="search"
              />
            </div>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-3">
          {/* Page title */}
          <div className="hidden md:block">
            <h1 className="text-base font-semibold" style={{ color: 'oklch(0.18 0.008 60)' }}>
              {pageTitle}
            </h1>
          </div>

          {/* Video conference button */}
          <button
            type="button"
            onClick={() => setShowVideoModal(true)}
            className="p-1.5 rounded flex items-center justify-center transition-colors"
            style={{ color: 'oklch(0.42 0.022 240)' }}
            title="Start Video Conference"
          >
            <span className="sr-only">Start Video Conference</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="p-1.5 rounded"
            style={{ color: 'oklch(0.55 0.006 60)' }}
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-5 w-5" />
          </button>

          {/* User avatar + name */}
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{
                backgroundColor: 'oklch(0.91 0.010 240)',
                color: 'oklch(0.25 0.018 240)',
              }}
            >
              {initials}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'oklch(0.18 0.008 60)' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs capitalize leading-none" style={{ color: 'oklch(0.55 0.006 60)' }}>
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <VideoConferenceOptionsModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        meetingId={`header_${Date.now()}`}
      />
    </div>
  );
};

export default Header;
