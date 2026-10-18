import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { UploadModal } from '../video/UploadModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-[#F9FAFB] overflow-x-hidden">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenUpload={() => setUploadOpen(true)}
      />

      <div className="flex-1 flex w-full max-w-[1920px] mx-auto overflow-x-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          <Outlet />
        </main>
      </div>

      <Footer />
      <MobileBottomNav />

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
};
