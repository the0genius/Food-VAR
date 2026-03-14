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
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] font-sans relative pb-[120px] shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-[67px] pb-5 rounded-b-[24px] shadow-sm z-10 relative">
        <h1 className="text-[22px] font-bold text-[#1B1B1B] mb-5">Check a Product</h1>
        
        {/* Segmented Toggle */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center">
          <button className="flex-1 flex items-center justify-center gap-2 bg-white text-[#1B1B1B] py-2.5 rounded-[14px] shadow-sm font-semibold text-sm transition-all">
            <Search className="w-[18px] h-[18px]" />
            <span>Search</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 text-[#666666] py-2.5 rounded-[14px] font-medium text-sm transition-all hover:text-[#1B1B1B]">
            <Barcode className="w-[18px] h-[18px]" />
            <span>Scanner</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 flex flex-col gap-6 overflow-y-auto pb-6">
        {/* Search Input */}
        <div className="relative flex items-center group">
          <div className="absolute left-4 text-[#999999] group-focus-within:text-[#2E7D32] transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, brand, or category..."
            className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl py-4 pl-[46px] pr-12 text-[#1B1B1B] text-[15px] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-[#3DD68C]/20 focus:border-[#3DD68C] transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-[#999999] hover:text-[#1B1B1B] transition-colors p-1"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3">
          {mockData.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-[20px] p-4 flex items-center gap-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all cursor-pointer hover:shadow-md border border-transparent hover:border-gray-50"
            >
              <div className="w-[48px] h-[48px] rounded-[14px] bg-[#F5F5F7] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#666666]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#1B1B1B] font-bold text-[16px] truncate leading-tight mb-1.5">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[#666666] text-[13px] truncate">{item.brand}</span>
                  <span className="w-[3px] h-[3px] rounded-full bg-[#999999] shrink-0"></span>
                  <span className="bg-gray-100 text-[#666666] text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {item.category}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999] shrink-0" />
            </div>
          ))}
        </div>

        {/* Empty State Reference (Grayed out) */}
        <div className="mt-8 flex flex-col items-center justify-center text-center opacity-40 py-8 pointer-events-none">
          <div className="w-[64px] h-[64px] rounded-[20px] bg-white shadow-sm flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-[#999999]" />
          </div>
          <h3 className="text-[#1B1B1B] font-bold text-[18px] mb-2">Find Any Product</h3>
          <p className="text-[#666666] text-[14px] max-w-[240px] leading-relaxed">
            Search our database of over 2 million food products to check their health scores.
          </p>
        </div>
      </div>
    </div>
  );
}
