import React from "react";
import {
  Scan,
  Activity,
  Lightbulb,
  Info,
  Droplets,
  Drumstick,
  Salad,
  ChevronRight
} from "lucide-react";

// --- Types & Data ---

type ScoreLevel = "danger" | "amber" | "green" | "teal";

const getScoreDetails = (score: number) => {
  if (score >= 90) return { level: "teal" as ScoreLevel, fg: "#2EC4B6", bg: "#E0F7FA", ring: "rgba(46, 196, 182, 0.3)" };
  if (score >= 67) return { level: "green" as ScoreLevel, fg: "#43A047", bg: "#E8F5E9", ring: "rgba(67, 160, 71, 0.3)" };
  if (score >= 34) return { level: "amber" as ScoreLevel, fg: "#FB8C00", bg: "#FFF3E0", ring: "rgba(251, 140, 0, 0.3)" };
  return { level: "danger" as ScoreLevel, fg: "#E53935", bg: "#FFEBEE", ring: "rgba(229, 57, 53, 0.3)" };
};

const USER = { name: "Amr", scansUsed: 3, scansTotal: 10, avgScore: 72 };

const RECENT_SCANS = [
  { id: 1, name: "Oreo Original", brand: "Nabisco", score: 12 },
  { id: 2, name: "Greek Yogurt", brand: "Fage", score: 89 },
  { id: 3, name: "Organic Granola", brand: "Nature's Path", score: 76 },
  { id: 4, name: "Coca-Cola Classic", brand: "Coca-Cola", score: 18 },
];

const POPULAR_PRODUCTS = [
  { id: 1, name: "Almond Milk Unsweetened", brand: "Califia Farms", calories: 30, score: 92, icon: Droplets },
  { id: 2, name: "Chicken Breast Grilled", brand: "Perdue", calories: 165, score: 85, icon: Drumstick },
  { id: 3, name: "Avocado Toast Mix", brand: "Trader Joe's", calories: 220, score: 78, icon: Salad },
];

export function DetailRefinement() {
  const progressPercentage = (USER.scansUsed / USER.scansTotal) * 100;

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] flex flex-col pb-24 mx-auto w-full max-w-[390px] overflow-hidden">
      
      {/* HEADER */}
      <div className="relative bg-gradient-to-b from-[#F0FAF4] to-[#F6F8F7] pt-14 pb-4">
        <div className="px-5 flex items-center justify-between">
          <div>
            <p className="text-[#666666] text-[14px] font-medium mb-1">Good morning,</p>
            <h1 className="text-[#1B1B1B] text-[26px] font-[800] leading-none tracking-tight">
              {USER.name}
            </h1>
          </div>
          <div className="relative">
            <div className="w-[48px] h-[48px] rounded-full bg-white shadow-sm overflow-hidden border border-[rgba(0,0,0,0.07)]">
              <img 
                src="https://i.pravatar.cc/150?u=amr" 
                alt="User" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Small Progress Badge */}
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2 py-0.5 shadow-sm border border-[rgba(0,0,0,0.07)]">
              <span className="text-[10px] font-bold text-[#2E7D32]">
                {USER.scansUsed}/{USER.scansTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Edge-to-edge thin progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[rgba(0,0,0,0.04)]">
          <div 
            className="h-full bg-gradient-to-r from-[#3DD68C] to-[#2E7D32] rounded-r-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-6 px-5 space-y-[24px]">
        
        {/* HERO BANNER - Tier 1 Depth */}
        <div 
          className="rounded-[20px] bg-[#EDF5EE] overflow-hidden relative"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="p-5 flex flex-col h-full relative z-10">
            <h2 className="text-[#1B1B1B] text-[20px] font-[900] tracking-tight mb-2 max-w-[200px] leading-[1.1]">
              Scan Smart.<br/>Eat Right.
            </h2>
            <p className="text-[#666666] text-[12px] font-[400] mb-6 max-w-[180px]">
              Discover the truth about your food in seconds.
            </p>
            
            <button className="self-start rounded-full bg-gradient-to-r from-[#3DD68C] to-[#2E7D32] px-6 py-3 flex items-center gap-2 shadow-sm transform transition-all hover:scale-105 active:scale-95">
              <Scan className="w-4 h-4 text-white" />
              <span className="text-white text-[14px] font-bold">Scan Product</span>
            </button>
          </div>

          {/* Refined Graphic */}
          <div className="absolute bottom-4 right-4 w-[90px] h-[90px] flex items-center justify-center">
            {/* Subtle gradient circle */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3DD68C20] to-transparent pointer-events-none" />
            <Scan className="w-10 h-10 text-[#3DD68C] opacity-80 z-10" />
          </div>
        </div>

        {/* STATS ROW - Tier 1 Depth */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="bg-white rounded-[20px] p-4 flex flex-col justify-between"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-full bg-[#E8F5E9]">
                <Activity className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <span className="text-[12px] font-medium text-[#666666]">Avg Score</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[30px] font-[900] text-[#1B1B1B] leading-none tracking-tight">
                {USER.avgScore}
              </span>
              <span className="text-[12px] font-[500] text-[#666666] mb-0.5">/100</span>
            </div>
          </div>

          <div 
            className="bg-white rounded-[20px] p-4 flex flex-col justify-between"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-full bg-[#E8F5E9]">
                <Scan className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <span className="text-[12px] font-medium text-[#666666]">Today</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[30px] font-[900] text-[#1B1B1B] leading-none tracking-tight">
                {USER.scansUsed}
              </span>
              <span className="text-[12px] font-[500] text-[#666666] mb-0.5">items</span>
            </div>
          </div>
        </div>

        {/* INSIGHT CARD - Tier 3 Depth */}
        <div 
          className="bg-white rounded-[20px] p-4 border border-[rgba(0,0,0,0.07)] relative overflow-hidden"
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="w-[14px] h-[14px] text-[#FB8C00] mt-[3px] shrink-0" />
            <p className="text-[14px] font-[500] text-[#666666] leading-snug">
              Your choices are looking great! Keep making smart picks.
            </p>
          </div>
        </div>

        {/* RECENT SCANS */}
        <div className="space-y-[12px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-[700] uppercase tracking-wider text-[#999999]">
              Recent Scans
            </h3>
            <button className="text-[13px] font-[600] text-[#2E7D32]">
              See all
            </button>
          </div>
          
          <div className="flex overflow-x-auto -mx-5 px-5 pb-4 gap-3 snap-x hide-scrollbar">
            {RECENT_SCANS.map((item) => {
              const { fg, bg } = getScoreDetails(item.score);
              return (
                <div 
                  key={item.id}
                  className="bg-white rounded-[20px] w-[148px] shrink-0 snap-start border border-[rgba(0,0,0,0.07)] relative overflow-hidden flex flex-col"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="p-3 pb-4 flex-1 flex flex-col">
                    <div className="flex justify-start mb-3">
                      {/* Circular score badge */}
                      <div 
                        className="w-[32px] h-[32px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: bg }}
                      >
                        <span className="text-[12px] font-bold" style={{ color: fg }}>
                          {item.score}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-[600] text-[#1B1B1B] leading-tight mb-1 line-clamp-2">
                        {item.name}
                      </h4>
                      <p className="text-[12px] font-[400] text-[#666666] truncate">
                        {item.brand}
                      </p>
                    </div>
                  </div>
                  {/* Bottom Ribbon */}
                  <div className="h-[2px] w-full" style={{ backgroundColor: fg }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* POPULAR PRODUCTS */}
        <div className="space-y-[12px]">
          <h3 className="text-[11px] font-[700] uppercase tracking-wider text-[#999999]">
            Trending Health Choices
          </h3>
          
          <div className="space-y-2">
            {POPULAR_PRODUCTS.map((product) => {
              const { fg, ring } = getScoreDetails(product.score);
              const Icon = product.icon;
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-[20px] p-4 border border-[rgba(0,0,0,0.07)] flex items-center gap-3"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  {/* Left-aligned score dot with subtle ring */}
                  <div 
                    className="w-[8px] h-[8px] rounded-full ml-1 shrink-0" 
                    style={{ 
                      backgroundColor: fg,
                      boxShadow: `0 0 0 1px ${ring}`
                    }} 
                  />
                  
                  <div className="w-[48px] h-[48px] rounded-[12px] bg-[#E8F5E9] flex items-center justify-center shrink-0 border border-[rgba(0,0,0,0.04)]">
                    <Icon className="w-5 h-5 text-[#2E7D32]" />
                  </div>
                  
                  <div className="flex-1 min-w-0 ml-1">
                    <h4 className="text-[14px] font-[500] text-[#1B1B1B] truncate mb-0.5">
                      {product.name}
                    </h4>
                    <p className="text-[12px] font-[400] text-[#666666] truncate">
                      {product.brand} • {product.calories} kcal
                    </p>
                  </div>
                  
                  <button className="w-[32px] h-[32px] rounded-full bg-[#F6F8F7] flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-[#999]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTRIBUTE CARD - Tier 2 (Dashed) */}
        <div 
          className="rounded-[20px] p-4 border border-dashed flex items-center justify-between gap-3 mt-2"
          style={{ borderColor: "rgba(61, 214, 140, 0.4)", backgroundColor: "rgba(61, 214, 140, 0.02)" }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-[40px] h-[40px] rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-[#2E7D32]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-[600] text-[#1B1B1B] mb-0.5 truncate">
                Missing a product?
              </h4>
              <p className="text-[12px] font-[400] text-[#666666] truncate">
                Scan unlisted items.
              </p>
            </div>
          </div>
          <button className="text-[13px] font-[600] text-[#2E7D32] whitespace-nowrap pl-2">
            Add Product
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
