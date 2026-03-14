import React from 'react';
import { TrendingUp, Scan, Barcode, Lightbulb, ChevronRight, Info, Package } from 'lucide-react';

export function BentoHome() {
  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-[#F5F5F7] dark:bg-[#121212] font-sans pb-10 overflow-y-auto">
      <div className="pt-[67px] px-5 flex flex-col gap-4">

        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[#666666] dark:text-[#A0A0A0] text-[15px] font-normal">Good morning,</p>
            <h1 className="text-[#1B1B1B] dark:text-[#E8E8E8] text-[28px] font-bold leading-tight">Alex</h1>
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#2E7D32] to-[#3DD68C] flex items-center justify-center text-white text-xl font-bold shadow-sm">
              A
            </div>
            <div className="absolute -bottom-1 -right-2 bg-white dark:bg-[#1E1E1E] rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#2E7D32] dark:text-[#66BB6A]">3/10</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-[24px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#2EC4B6]/10 dark:bg-[#2EC4B6]/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#2EC4B6]" />
              </div>
              <span className="text-[#666666] dark:text-[#A0A0A0] text-sm font-semibold">Avg Score</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[32px] font-bold text-[#2EC4B6] leading-none">72</span>
              <span className="text-[#999999] dark:text-[#787878] text-sm font-medium">/100</span>
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-[24px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#3DD68C]/10 dark:bg-[#3DD68C]/20 flex items-center justify-center">
                <Scan size={16} className="text-[#2E7D32] dark:text-[#66BB6A]" />
              </div>
              <span className="text-[#666666] dark:text-[#A0A0A0] text-sm font-semibold">Today</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[32px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] leading-none">3</span>
              <span className="text-[#999999] dark:text-[#787878] text-sm font-medium">items</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex justify-between items-center active:scale-[0.97] transition-transform duration-150 cursor-pointer">
          <div className="flex-1">
            <h2 className="text-[22px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] leading-tight">Scan Smart.</h2>
            <h2 className="text-[22px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8] leading-tight">Eat Right.</h2>
            <p className="text-[#666666] dark:text-[#A0A0A0] text-sm mt-1 mb-4">Discover healthier alternatives instantly.</p>
            <button className="bg-gradient-to-r from-[#3DD68C] to-[#2E7D32] rounded-full py-2.5 px-4 flex items-center gap-2 text-white font-semibold text-sm shadow-md active:scale-[0.95] transition-transform">
              <Barcode size={16} />
              Scan Product
            </button>
          </div>
          <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-[#3DD68C]/20 to-[#2E7D32]/10 flex items-center justify-center relative overflow-hidden">
            <Barcode size={40} className="text-[#2E7D32] dark:text-[#3DD68C] relative z-10" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-[20px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex gap-3 items-center border-l-[4px] border-[#FB8C00]">
          <div className="w-10 h-10 rounded-full bg-[#FB8C00]/10 dark:bg-[#FB8C00]/20 flex-shrink-0 flex items-center justify-center">
            <Lightbulb size={20} className="text-[#FB8C00] dark:text-[#FFB74D]" />
          </div>
          <p className="text-[#1B1B1B] dark:text-[#E8E8E8] text-sm font-medium leading-snug">
            Your choices are looking great! Keep making smart picks.
          </p>
        </div>

        <div className="mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[12px] uppercase tracking-wider text-[#999999] dark:text-[#787878] font-bold">Recent Scans</h3>
            <button className="text-[#2E7D32] dark:text-[#66BB6A] text-sm font-semibold">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 snap-x" style={{ scrollbarWidth: 'none' }}>
            {[
              { name: 'Greek Yogurt', brand: 'Chobani', score: 82, color: '#43A047' },
              { name: 'Protein Bar', brand: 'RXBAR', score: 65, color: '#2EC4B6' },
              { name: 'Orange Juice', brand: 'Simply Orange', score: 45, color: '#FB8C00' },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-[24px] w-[150px] h-[160px] flex-shrink-0 snap-start shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative flex flex-col justify-end overflow-hidden active:scale-[0.97] transition-transform duration-150 cursor-pointer">
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10" style={{ backgroundColor: item.color }}>
                  <span className="text-white font-bold text-sm">{item.score}</span>
                </div>
                <div className="p-4 relative z-10">
                  <h4 className="font-semibold text-[#1B1B1B] dark:text-[#E8E8E8] text-base leading-tight">{item.name}</h4>
                  <p className="text-[#666666] dark:text-[#A0A0A0] text-xs mt-0.5">{item.brand}</p>
                </div>
                <div className="h-1.5 w-full" style={{ backgroundColor: item.color }}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <h3 className="text-[12px] uppercase tracking-wider text-[#999999] dark:text-[#787878] font-bold mb-3">Trending Health Choices</h3>
          <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] p-2 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex flex-col gap-1">
            {[
              { name: 'Organic Quinoa', brand: "Nature's Best", kcal: 120 },
              { name: 'Almond Milk', brand: 'Blue Diamond', kcal: 60 },
              { name: 'Steel Cut Oats', brand: "Bob's Red Mill", kcal: 150 },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors cursor-pointer active:scale-[0.97] transition-transform duration-150">
                  <div className="w-12 h-12 rounded-full bg-[#E8F5E9] dark:bg-[#1B3A1D] flex items-center justify-center mr-3">
                    <Package size={20} className="text-[#2E7D32] dark:text-[#66BB6A]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#1B1B1B] dark:text-[#E8E8E8] font-semibold text-[15px]">{item.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[#666666] dark:text-[#A0A0A0] text-xs">{item.brand}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                      <span className="text-[#999999] dark:text-[#787878] text-xs">{item.kcal} kcal</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 dark:text-gray-600" />
                </div>
                {i < 2 && <div className="h-[1px] w-full bg-gray-100 dark:bg-white/5 ml-16"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 mb-6 bg-[#E8F5E9]/50 dark:bg-[#1B3A1D]/50 rounded-[20px] p-4 flex items-center gap-4 border border-[#2E7D32]/10 dark:border-[#66BB6A]/20">
          <div className="w-10 h-10 rounded-full bg-[#2E7D32]/10 dark:bg-[#66BB6A]/20 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-[#2E7D32] dark:text-[#66BB6A]" />
          </div>
          <div className="flex-1">
            <h4 className="text-[#1B1B1B] dark:text-[#E8E8E8] font-semibold text-sm">Missing a product?</h4>
            <p className="text-[#666666] dark:text-[#A0A0A0] text-xs mt-0.5">Help expand our database</p>
          </div>
          <button className="bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-white/10 px-4 py-1.5 rounded-full text-sm font-semibold text-[#1B1B1B] dark:text-[#E8E8E8] shadow-sm active:scale-[0.95] transition-transform">
            Add
          </button>
        </div>

      </div>
    </div>
  );
}
