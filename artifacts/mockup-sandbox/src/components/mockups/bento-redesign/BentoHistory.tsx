import React, { useState } from 'react';
import { Search, ChevronRight, Barcode, Search as SearchIcon } from 'lucide-react';

export function BentoHistory() {
  const [activeTab, setActiveTab] = useState('Recent');

  const historyData = [
    {
      dateGroup: 'TODAY',
      items: [
        { id: 1, name: 'Greek Yogurt', brand: 'Fage', category: 'Dairy', score: 82, access: 'scanned', time: '10:30 AM' },
        { id: 2, name: 'Protein Bar', brand: 'Quest', category: 'Snacks', score: 65, access: 'searched', time: '9:15 AM' },
      ]
    },
    {
      dateGroup: 'YESTERDAY',
      items: [
        { id: 3, name: 'Orange Juice', brand: 'Tropicana', category: 'Beverages', score: 45, access: 'scanned', time: '3:20 PM' },
        { id: 4, name: 'Whole Wheat Bread', brand: "Dave's", category: 'Bakery', score: 71, access: 'searched', time: '11:45 AM' },
      ]
    },
    {
      dateGroup: 'THIS WEEK',
      items: [
        { id: 5, name: 'Soda', brand: 'Coca-Cola', category: 'Beverages', score: 22, access: 'scanned', time: 'Mon 2:10 PM' },
        { id: 6, name: 'Steel Cut Oats', brand: "Bob's", category: 'Grains', score: 88, access: 'searched', time: 'Sun 9:00 AM' },
      ]
    }
  ];

  const getScoreColor = (score: number) => {
    if (score <= 35) return { bg: 'bg-[#E53935]', text: 'text-white' };
    if (score <= 50) return { bg: 'bg-[#FB8C00]', text: 'text-white' };
    if (score <= 74) return { bg: 'bg-[#2EC4B6]', text: 'text-white' };
    return { bg: 'bg-[#43A047]', text: 'text-white' };
  };

  const getTierLabel = (score: number) => {
    if (score <= 35) return 'Poor';
    if (score <= 50) return 'Fair';
    if (score <= 74) return 'Good';
    return 'Excel';
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] font-sans flex flex-col">
      {/* Header Area */}
      <div className="bg-white px-5 pt-[67px] pb-4 rounded-b-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] z-10 sticky top-0">
        <h1 className="text-[28px] font-bold text-[#1B1B1B] tracking-tight mb-4">History</h1>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#999999]" />
          </div>
          <input 
            type="text" 
            placeholder="Search history..." 
            className="w-full h-12 bg-[#F5F5F7] border border-gray-100 rounded-2xl pl-11 pr-4 text-[15px] text-[#1B1B1B] placeholder-[#999999] outline-none focus:ring-2 focus:ring-[#3DD68C]/30 transition-all"
          />
        </div>

        {/* Sort Pills */}
        <div className="flex gap-2">
          {['Recent', 'Best', 'Worst'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-9 px-4 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-[#2E7D32] to-[#3DD68C] text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-[#666666] hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto px-5 pb-[80px]">
        {historyData.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6 last:mb-0">
            <h2 className="text-xs font-semibold text-[#999999] tracking-[0.15em] mt-6 mb-3">
              {group.dateGroup}
            </h2>
            
            <div className="flex flex-col gap-3">
              {group.items.map((item) => {
                const colors = getScoreColor(item.score);
                
                return (
                  <div 
                    key={item.id} 
                    className="bg-white p-3 rounded-2xl shadow-[0_2px_12px_-6px_rgba(0,0,0,0.05)] flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    {/* Left: Score Badge & Access Icon */}
                    <div className="relative">
                      <div className={`w-[46px] h-[46px] rounded-xl flex flex-col items-center justify-center ${colors.bg}`}>
                        <span className={`text-[17px] font-bold leading-tight ${colors.text}`}>
                          {item.score}
                        </span>
                        <span className={`text-[8px] font-medium uppercase tracking-wider opacity-90 ${colors.text}`}>
                          {getTierLabel(item.score)}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#F5F5F7] rounded-md flex items-center justify-center border border-white">
                        {item.access === 'scanned' ? (
                          <Barcode className="w-3 h-3 text-[#666666]" />
                        ) : (
                          <SearchIcon className="w-3 h-3 text-[#666666]" />
                        )}
                      </div>
                    </div>

                    {/* Center: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="text-[15px] font-bold text-[#1B1B1B] truncate pr-2">
                          {item.name}
                        </h3>
                        <span className="text-[11px] text-[#999999] whitespace-nowrap mt-0.5">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#666666] truncate">
                        {item.brand} • {item.category}
                      </p>
                    </div>

                    {/* Right: Chevron */}
                    <div className="w-8 flex justify-end">
                      <ChevronRight className="w-5 h-5 text-[#D1D1D6]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}