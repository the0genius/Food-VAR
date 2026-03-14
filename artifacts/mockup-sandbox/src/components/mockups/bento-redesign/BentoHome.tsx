import React from 'react';
import { TrendingUp, Scan, Barcode, Lightbulb, ChevronRight, Info } from 'lucide-react';

export default function BentoHome() {
  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] font-sans pb-10 overflow-y-auto">
      {/* Container with top padding for status bar */}
      <div className="pt-[67px] px-5 flex flex-col gap-4">
        
        {/* 1. Header */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[#666666] text-[15px] font-normal">Good morning,</p>
            <h1 className="text-[#1B1B1B] text-[28px] font-bold leading-tight">Alex</h1>
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#2E7D32] to-[#3DD68C] flex items-center justify-center text-white text-xl font-bold shadow-sm">
              A
            </div>
            <div className="absolute -bottom-1 -right-2 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#2E7D32]">3/10</span>
            </div>
          </div>
        </div>

        {/* 2. 2-column stat tiles */}
        <div className="flex gap-4">
          {/* Left Stat */}
          <div className="flex-1 bg-white rounded-[24px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#2EC4B6]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#2EC4B6]" />
              </div>
              <span className="text-[#666666] text-sm font-semibold">Avg Score</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[32px] font-bold text-[#2EC4B6] leading-none">72</span>
              <span className="text-[#999999] text-sm font-medium">/100</span>
            </div>
          </div>

          {/* Right Stat */}
          <div className="flex-1 bg-white rounded-[24px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#3DD68C]/10 flex items-center justify-center">
                <Scan size={16} className="text-[#2E7D32]" />
              </div>
              <span className="text-[#666666] text-sm font-semibold">Today</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[32px] font-bold text-[#1B1B1B] leading-none">3</span>
              <span className="text-[#999999] text-sm font-medium">items</span>
            </div>
          </div>
        </div>

        {/* 3. Hero CTA card */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.05)] flex justify-between items-center hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
          <div className="flex-1">
            <h2 className="text-[22px] font-bold text-[#1B1B1B] leading-tight">Scan Smart.</h2>
            <h2 className="text-[22px] font-bold text-[#1B1B1B] leading-tight">Eat Right.</h2>
            <p className="text-[#666666] text-sm mt-1 mb-4">Discover healthier alternatives instantly.</p>
            <button className="bg-gradient-to-r from-[#3DD68C] to-[#2E7D32] rounded-full py-2.5 px-4 flex items-center gap-2 text-white font-semibold text-sm shadow-md active:scale-95 transition-transform">
              <Barcode size={16} />
              Scan Product
            </button>
          </div>
          <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-[#3DD68C]/20 to-[#2E7D32]/10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[#3DD68C]/20 rounded-full blur-xl"></div>
            <Barcode size={40} className="text-[#2E7D32] relative z-10" strokeWidth={1.5} />
          </div>
        </div>

        {/* 4. Insight card */}
        <div className="bg-white rounded-[20px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] flex gap-3 items-center border-l-[4px] border-[#FB8C00]">
          <div className="w-10 h-10 rounded-full bg-[#FB8C00]/10 flex-shrink-0 flex items-center justify-center">
            <Lightbulb size={20} className="text-[#FB8C00]" />
          </div>
          <p className="text-[#1B1B1B] text-sm font-medium leading-snug">
            Your choices are looking great! Keep making smart picks.
          </p>
        </div>

        {/* 5. Recent Scans */}
        <div className="mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[12px] uppercase tracking-wider text-[#999999] font-bold">Recent Scans</h3>
            <button className="text-[#2E7D32] text-sm font-semibold">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {/* Card 1 */}
            <div className="bg-white rounded-[24px] w-[150px] h-[160px] flex-shrink-0 snap-start shadow-[0_4px_6px_rgba(0,0,0,0.05)] relative flex flex-col justify-end overflow-hidden hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
              <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#43A047] flex items-center justify-center shadow-sm z-10">
                <span className="text-white font-bold text-sm">82</span>
              </div>
              <div className="p-4 relative z-10 bg-gradient-to-t from-white via-white to-transparent pt-12">
                <h4 className="font-semibold text-[#1B1B1B] text-base leading-tight">Greek Yogurt</h4>
                <p className="text-[#666666] text-xs mt-0.5">Chobani</p>
              </div>
              <div className="h-1.5 w-full bg-[#43A047]"></div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-[24px] w-[150px] h-[160px] flex-shrink-0 snap-start shadow-[0_4px_6px_rgba(0,0,0,0.05)] relative flex flex-col justify-end overflow-hidden hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
              <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#2EC4B6] flex items-center justify-center shadow-sm z-10">
                <span className="text-white font-bold text-sm">65</span>
              </div>
              <div className="p-4 relative z-10 bg-gradient-to-t from-white via-white to-transparent pt-12">
                <h4 className="font-semibold text-[#1B1B1B] text-base leading-tight">Protein Bar</h4>
                <p className="text-[#666666] text-xs mt-0.5">RXBAR</p>
              </div>
              <div className="h-1.5 w-full bg-[#2EC4B6]"></div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-[24px] w-[150px] h-[160px] flex-shrink-0 snap-start shadow-[0_4px_6px_rgba(0,0,0,0.05)] relative flex flex-col justify-end overflow-hidden hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
              <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#FB8C00] flex items-center justify-center shadow-sm z-10">
                <span className="text-white font-bold text-sm">45</span>
              </div>
              <div className="p-4 relative z-10 bg-gradient-to-t from-white via-white to-transparent pt-12">
                <h4 className="font-semibold text-[#1B1B1B] text-base leading-tight">Orange Juice</h4>
                <p className="text-[#666666] text-xs mt-0.5">Simply Orange</p>
              </div>
              <div className="h-1.5 w-full bg-[#FB8C00]"></div>
            </div>
          </div>
        </div>

        {/* 6. Trending */}
        <div className="mt-2">
          <h3 className="text-[12px] uppercase tracking-wider text-[#999999] font-bold mb-3">Trending Health Choices</h3>
          <div className="bg-white rounded-[24px] p-2 shadow-[0_4px_6px_rgba(0,0,0,0.05)] flex flex-col gap-1">
            
            {/* Row 1 */}
            <div className="flex items-center p-2 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#2E7D32]/10 flex items-center justify-center mr-3">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32]/20 border border-[#2E7D32]/30"></div>
              </div>
              <div className="flex-1">
                <h4 className="text-[#1B1B1B] font-semibold text-[15px]">Organic Quinoa</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[#666666] text-xs">Nature's Best</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-[#999999] text-xs">120 kcal</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>

            <div className="h-[1px] w-full bg-gray-100 ml-16"></div>

            {/* Row 2 */}
            <div className="flex items-center p-2 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#2E7D32]/10 flex items-center justify-center mr-3">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32]/20 border border-[#2E7D32]/30"></div>
              </div>
              <div className="flex-1">
                <h4 className="text-[#1B1B1B] font-semibold text-[15px]">Almond Milk</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[#666666] text-xs">Blue Diamond</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-[#999999] text-xs">60 kcal</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>

            <div className="h-[1px] w-full bg-gray-100 ml-16"></div>

            {/* Row 3 */}
            <div className="flex items-center p-2 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#2E7D32]/10 flex items-center justify-center mr-3">
                <div className="w-8 h-8 rounded-full bg-[#2E7D32]/20 border border-[#2E7D32]/30"></div>
              </div>
              <div className="flex-1">
                <h4 className="text-[#1B1B1B] font-semibold text-[15px]">Steel Cut Oats</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[#666666] text-xs">Bob's Red Mill</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-[#999999] text-xs">150 kcal</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>

          </div>
        </div>

        {/* 7. Contribute card */}
        <div className="mt-4 mb-6 bg-[#E8F5E9]/50 rounded-[20px] p-4 flex items-center gap-4 border border-[#2E7D32]/10">
          <div className="w-10 h-10 rounded-full bg-[#2E7D32]/10 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-[#2E7D32]" />
          </div>
          <div className="flex-1">
            <h4 className="text-[#1B1B1B] font-semibold text-sm">Missing a product?</h4>
            <p className="text-[#666666] text-xs mt-0.5">Help expand our database</p>
          </div>
          <button className="bg-white border border-gray-200 px-4 py-1.5 rounded-full text-sm font-semibold text-[#1B1B1B] shadow-sm active:scale-95 transition-transform">
            Add
          </button>
        </div>

      </div>
    </div>
  );
}
