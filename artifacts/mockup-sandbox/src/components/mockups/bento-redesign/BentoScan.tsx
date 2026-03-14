import React, { useState } from 'react';
import { Search, Barcode, Package, ChevronRight, X } from 'lucide-react';

export function BentoScan() {
  const [searchQuery, setSearchQuery] = useState('');

  const mockData = [
    { name: "Greek Yogurt", brand: "Fage", category: "Dairy" },
    { name: "Protein Bar", brand: "Quest", category: "Snacks" },
    { name: "Almond Milk", brand: "Blue Diamond", category: "Dairy" },
    { name: "Organic Quinoa", brand: "Nature's Best", category: "Grains" },
    { name: "Steel Cut Oats", brand: "Bob's Red Mill", category: "Grains" }
  ];

  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] dark:bg-[#121212] font-sans relative pb-[120px] overflow-hidden flex flex-col">
      <div className="bg-white dark:bg-[#1E1E1E] px-5 pt-[67px] pb-5 rounded-b-[24px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-10 relative">
        <h1 className="text-[22px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] mb-5">Check a Product</h1>

        <div className="bg-gray-100 dark:bg-[#2C2C2C] p-1 rounded-2xl flex items-center">
          <button className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-[#3A3A3A] text-[#1B1B1B] dark:text-[#E8E8E8] py-2.5 rounded-[14px] shadow-sm font-semibold text-sm transition-all">
            <Search className="w-[18px] h-[18px]" />
            <span>Search</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 text-[#666666] dark:text-[#787878] py-2.5 rounded-[14px] font-medium text-sm transition-all">
            <Barcode className="w-[18px] h-[18px]" />
            <span>Scanner</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 flex flex-col gap-6 overflow-y-auto pb-6" style={{ scrollbarWidth: 'none' }}>
        <div className="relative flex items-center group">
          <div className="absolute left-4 text-[#999999] dark:text-[#787878] group-focus-within:text-[#2E7D32] dark:group-focus-within:text-[#66BB6A] transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, brand, or category..."
            className="w-full bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-white/10 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] rounded-2xl py-4 pl-[46px] pr-12 text-[#1B1B1B] dark:text-[#E8E8E8] text-[15px] placeholder:text-[#999999] dark:placeholder:text-[#787878] focus:outline-none focus:ring-2 focus:ring-[#3DD68C]/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 text-[#999999] dark:text-[#787878] p-1">
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {mockData.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-[#1E1E1E] rounded-[20px] p-4 flex items-center gap-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer border border-transparent"
            >
              <div className="w-[48px] h-[48px] rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2C] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#666666] dark:text-[#A0A0A0]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#1B1B1B] dark:text-[#E8E8E8] font-bold text-[16px] truncate leading-tight mb-1.5">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[#666666] dark:text-[#A0A0A0] text-[13px] truncate">{item.brand}</span>
                  <span className="w-[3px] h-[3px] rounded-full bg-[#999999] dark:bg-[#555555] shrink-0"></span>
                  <span className="bg-gray-100 dark:bg-[#2C2C2C] text-[#666666] dark:text-[#A0A0A0] text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {item.category}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999] dark:text-[#555555] shrink-0" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center text-center opacity-40 py-8 pointer-events-none">
          <div className="w-[64px] h-[64px] rounded-[20px] bg-white dark:bg-[#1E1E1E] shadow-sm flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-[#999999] dark:text-[#787878]" />
          </div>
          <h3 className="text-[#1B1B1B] dark:text-[#E8E8E8] font-bold text-[18px] mb-2">Find Any Product</h3>
          <p className="text-[#666666] dark:text-[#A0A0A0] text-[14px] max-w-[240px] leading-relaxed">
            Type a product name or brand to get your personalized score
          </p>
        </div>
      </div>
    </div>
  );
}
