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

  const getScoreBg = (score: number) => {
    if (score <= 35) return 'bg-[#E53935]';
    if (score <= 50) return 'bg-[#FB8C00]';
    if (score <= 74) return 'bg-[#2EC4B6]';
    return 'bg-[#43A047]';
  };

  const getTierLabel = (score: number) => {
    if (score <= 35) return 'Poor';
    if (score <= 50) return 'Fair';
    if (score <= 74) return 'Good';
    return 'Excel';
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] dark:bg-[#121212] font-sans flex flex-col">
      <div className="bg-white dark:bg-[#1E1E1E] px-5 pt-[67px] pb-4 rounded-b-3xl shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-10 sticky top-0">
        <h1 className="text-[28px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] tracking-tight mb-4">History</h1>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#999999] dark:text-[#787878]" />
          </div>
          <input
            type="text"
            placeholder="Search history..."
            className="w-full h-12 bg-[#F5F5F7] dark:bg-[#2C2C2C] border border-gray-100 dark:border-white/10 rounded-2xl pl-11 pr-4 text-[15px] text-[#1B1B1B] dark:text-[#E8E8E8] placeholder-[#999999] dark:placeholder-[#787878] outline-none focus:ring-2 focus:ring-[#3DD68C]/30 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {['Recent', 'Best', 'Worst'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-9 px-4 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#2E7D32] to-[#3DD68C] text-white shadow-sm'
                  : 'bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 text-[#666666] dark:text-[#A0A0A0]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[80px]" style={{ scrollbarWidth: 'none' }}>
        {historyData.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6 last:mb-0">
            <h2 className="text-xs font-semibold text-[#999999] dark:text-[#787878] tracking-[0.15em] mt-6 mb-3">
              {group.dateGroup}
            </h2>

            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#1E1E1E] p-3 rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center gap-3 active:scale-[0.97] transition-transform duration-150 cursor-pointer"
                >
                  <div className="relative">
                    <div className={`w-[46px] h-[46px] rounded-xl flex flex-col items-center justify-center ${getScoreBg(item.score)}`}>
                      <span className="text-[17px] font-bold leading-tight text-white">{item.score}</span>
                      <span className="text-[8px] font-medium uppercase tracking-wider opacity-90 text-white">{getTierLabel(item.score)}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#F5F5F7] dark:bg-[#2C2C2C] rounded-md flex items-center justify-center border border-white dark:border-[#1E1E1E]">
                      {item.access === 'scanned' ? (
                        <Barcode className="w-3 h-3 text-[#666666] dark:text-[#A0A0A0]" />
                      ) : (
                        <SearchIcon className="w-3 h-3 text-[#666666] dark:text-[#A0A0A0]" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="text-[15px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] truncate pr-2">{item.name}</h3>
                      <span className="text-[11px] text-[#999999] dark:text-[#787878] whitespace-nowrap mt-0.5">{item.time}</span>
                    </div>
                    <p className="text-[13px] text-[#666666] dark:text-[#A0A0A0] truncate">
                      {item.brand} · {item.category}
                    </p>
                  </div>

                  <div className="w-8 flex justify-end">
                    <ChevronRight className="w-5 h-5 text-[#D1D1D6] dark:text-[#555555]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
