import React, { useState } from 'react';
import { Home, ScanBarcode, Clock, User } from 'lucide-react';

const MinimalEdgeTabBar = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col items-center font-['Inter']">
      {/* App Content Hint */}
      <div className="flex-1 w-full max-w-[390px] flex flex-col justify-end p-4 pb-8">
        {/* Faded cards to imply content behind/above */}
        <div className="w-full h-32 bg-white rounded-2xl shadow-sm mb-4 opacity-50 relative overflow-hidden">
          <div className="absolute top-4 left-4 w-12 h-12 bg-[#F0F0F0] rounded-full" />
          <div className="absolute top-6 left-20 w-32 h-4 bg-[#F0F0F0] rounded-md" />
          <div className="absolute top-12 left-20 w-24 h-3 bg-[#F0F0F0] rounded-md" />
        </div>
        <div className="w-full h-48 bg-white rounded-2xl shadow-sm opacity-80 relative overflow-hidden">
          <div className="absolute top-4 left-4 w-12 h-12 bg-[#F0F0F0] rounded-full" />
          <div className="absolute top-6 left-20 w-40 h-4 bg-[#F0F0F0] rounded-md" />
          <div className="absolute top-12 left-20 w-32 h-3 bg-[#F0F0F0] rounded-md" />
          <div className="absolute top-24 left-4 right-4 h-16 bg-[#F6F8F7] rounded-xl" />
        </div>
      </div>

      {/* Tab Bar Container */}
      <div className="w-full max-w-[390px] bg-white border-t border-[rgba(0,0,0,0.06)] pb-[20px] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        {/* Tab Bar Items */}
        <div className="h-[52px] flex items-center justify-between px-6">
          {/* Home Tab */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center justify-center w-12 h-full transition-all duration-200 ease-in-out"
          >
            <Home
              size={22}
              color={activeTab === 'home' ? '#2E7D32' : '#999999'}
              strokeWidth={activeTab === 'home' ? 2.5 : 2}
            />
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out flex items-center justify-center ${
                activeTab === 'home' ? 'h-[14px] opacity-100 mt-0.5' : 'h-0 opacity-0 mt-0'
              }`}
            >
              <span className="text-[10px] font-medium text-[#2E7D32] leading-none">Home</span>
            </div>
          </button>

          {/* Scan Pill */}
          <button
            onClick={() => setActiveTab('scan')}
            className="group relative flex items-center justify-center w-[120px] h-[40px] rounded-full overflow-hidden transition-transform active:scale-95 shadow-[0_2px_8px_rgba(46,125,50,0.2)] bg-gradient-to-br from-[#3DD68C] to-[#2E7D32] hover:from-[#35C681] hover:to-[#256A29] mx-1"
          >
            <div className="relative flex items-center justify-center gap-1.5 z-10">
              <ScanBarcode size={18} color="white" strokeWidth={2.5} />
              <span className="text-[12px] font-bold text-white tracking-wide">Scan</span>
            </div>
          </button>

          {/* History Tab */}
          <button
            onClick={() => setActiveTab('history')}
            className="flex flex-col items-center justify-center w-12 h-full transition-all duration-200 ease-in-out"
          >
            <Clock
              size={22}
              color={activeTab === 'history' ? '#2E7D32' : '#999999'}
              strokeWidth={activeTab === 'history' ? 2.5 : 2}
            />
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out flex items-center justify-center ${
                activeTab === 'history' ? 'h-[14px] opacity-100 mt-0.5' : 'h-0 opacity-0 mt-0'
              }`}
            >
              <span className="text-[10px] font-medium text-[#2E7D32] leading-none">History</span>
            </div>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center justify-center w-12 h-full transition-all duration-200 ease-in-out"
          >
            <User
              size={22}
              color={activeTab === 'profile' ? '#2E7D32' : '#999999'}
              strokeWidth={activeTab === 'profile' ? 2.5 : 2}
            />
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out flex items-center justify-center ${
                activeTab === 'profile' ? 'h-[14px] opacity-100 mt-0.5' : 'h-0 opacity-0 mt-0'
              }`}
            >
              <span className="text-[10px] font-medium text-[#2E7D32] leading-none">Profile</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinimalEdgeTabBar;
