import React, { useState } from 'react';
import { Home, ScanBarcode, Clock, User } from 'lucide-react';

export default function NotchedDock() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] flex flex-col items-center justify-end overflow-hidden pb-10">
      {/* Container simulating a phone screen max-width */}
      <div className="w-full max-w-[390px] h-[800px] bg-[#F6F8F7] relative flex flex-col justify-end shadow-2xl overflow-hidden rounded-[40px] border-[8px] border-white">
        
        {/* Hint of content above */}
        <div className="absolute top-0 left-0 right-0 bottom-[80px] p-6 flex flex-col gap-4 overflow-hidden">
          <div className="w-1/2 h-8 bg-black/5 rounded-full mb-4"></div>
          <div className="w-full bg-white rounded-3xl h-64 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0]"></div>
          <div className="w-full bg-white rounded-3xl h-40 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] opacity-50"></div>
          <div className="w-full bg-white rounded-3xl h-40 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-[#F0F0F0] opacity-20"></div>
        </div>

        {/* The Tab Bar */}
        <div className="relative w-full">
          {/* SVG Notch (Optional but much better looking than a white circle bump) 
              The prompt suggests "simplest approach: white circle (70px)", 
              we'll use the white circle bump approach as requested to overlap top edge. */}
          
          <div 
            className="absolute left-1/2 -top-6 -translate-x-1/2 w-[70px] h-[70px] bg-white rounded-full flex items-center justify-center z-10"
            style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.04)' }}
          >
            {/* The FAB */}
            <button 
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
              style={{ 
                background: 'linear-gradient(135deg, #3DD68C 0%, #2E7D32 100%)',
                boxShadow: '0 4px 12px rgba(46,125,50,0.3)' 
              }}
              aria-label="Scan food"
            >
              <ScanBarcode size={24} color="white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Bar Background */}
          <div 
            className="bg-white h-[60px] w-full rounded-t-[20px] flex items-center justify-between px-2 relative z-20"
            style={{ boxShadow: '0 -2px 16px rgba(0,0,0,0.06)' }}
          >
            {/* Left side tabs */}
            <div className="flex-1 flex justify-around">
              <TabItem 
                icon={<Home size={22} />} 
                label="HOME" 
                isActive={activeTab === 'home'} 
                onClick={() => setActiveTab('home')} 
              />
              <TabItem 
                // Placeholder to keep spacing for the center FAB
                isPlaceholder 
              />
            </div>
            
            {/* Center spacing for FAB */}
            <div className="w-[80px]"></div>

            {/* Right side tabs */}
            <div className="flex-1 flex justify-around">
              <TabItem 
                icon={<Clock size={22} />} 
                label="HISTORY" 
                isActive={activeTab === 'history'} 
                onClick={() => setActiveTab('history')} 
              />
              <TabItem 
                icon={<User size={22} />} 
                label="PROFILE" 
                isActive={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
              />
            </div>
          </div>
          
          {/* Mask to hide the shadow of the circle bump bleeding downwards into the bar */}
          <div className="absolute top-0 left-0 w-full h-full bg-white z-10 rounded-t-[20px] pointer-events-none"></div>

          {/* Re-render the bar content on top of the mask so it's visible */}
          <div className="absolute top-0 left-0 w-full h-[60px] flex items-center justify-between px-2 z-30 pointer-events-none">
            <div className="flex-1 flex justify-around pointer-events-auto">
              <TabItem 
                icon={<Home size={22} />} 
                label="HOME" 
                isActive={activeTab === 'home'} 
                onClick={() => setActiveTab('home')} 
              />
              <div className="w-16"></div>
            </div>
            <div className="w-[80px]"></div>
            <div className="flex-1 flex justify-around pointer-events-auto">
              <TabItem 
                icon={<Clock size={22} />} 
                label="HISTORY" 
                isActive={activeTab === 'history'} 
                onClick={() => setActiveTab('history')} 
              />
              <TabItem 
                icon={<User size={22} />} 
                label="PROFILE" 
                isActive={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')} 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function TabItem({ 
  icon, 
  label, 
  isActive, 
  onClick,
  isPlaceholder
}: { 
  icon?: React.ReactNode; 
  label?: string; 
  isActive?: boolean; 
  onClick?: () => void;
  isPlaceholder?: boolean;
}) {
  if (isPlaceholder) {
    return <div className="w-16 flex flex-col items-center justify-center"></div>;
  }

  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center w-16 h-full gap-1 pt-1 group"
    >
      <div 
        className={`transition-colors duration-200 ${isActive ? 'text-[#2E7D32]' : 'text-[#999999]'}`}
      >
        {icon}
      </div>
      <span 
        className={`text-[10px] tracking-wider uppercase font-medium transition-colors duration-200 ${
          isActive ? 'text-[#2E7D32]' : 'text-[#999999]'
        }`}
      >
        {label}
      </span>
      {/* Active Indicator Bar */}
      <div 
        className={`w-5 h-[3px] rounded-full mt-0.5 transition-all duration-300 ${
          isActive ? 'bg-[#2E7D32] opacity-100 scale-100' : 'bg-transparent opacity-0 scale-50'
        }`}
      />
    </button>
  );
}
