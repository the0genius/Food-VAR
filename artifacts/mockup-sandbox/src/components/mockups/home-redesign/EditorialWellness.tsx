import React from "react";
import { User, Search, Bell, ChevronRight, Activity, Zap, Star } from "lucide-react";

// Mock Data
const user = { name: "Amr" };
const scansToday = 3;
const totalScans = 10;
const avgScore = 72;
const recentScans = [
  { name: "Oreo Original", brand: "Nabisco", score: 12 },
  { name: "Greek Yogurt", brand: "Fage", score: 89 },
  { name: "Organic Granola", brand: "Nature's Path", score: 76 },
  { name: "Coca-Cola Classic", brand: "Coca-Cola", score: 18 },
];
const popularProducts = [
  { name: "Almond Milk Unsweetened", brand: "Califia Farms", calories: 30 },
  { name: "Chicken Breast Grilled", brand: "Perdue", calories: 165 },
  { name: "Avocado Toast Mix", brand: "Trader Joe's", calories: 220 },
];
const insight = "Your choices are looking great! Keep making smart picks.";

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-[#43A047] bg-[#E8F5E9]";
  if (score >= 40) return "text-[#FB8C00] bg-[#FFF3E0]";
  return "text-[#E53935] bg-[#FFEBEE]";
};

export function EditorialWellness() {
  const timeOfDay = "evening";
  const greeting = `Good ${timeOfDay}, ${user.name}`;

  return (
    <div className="min-h-screen bg-[#FAF9F7] font-['Inter'] text-[#1B1B1B] selection:bg-[#E8F5E9] pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-14 pb-6">
        <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-medium shadow-sm">
          {user.name.charAt(0)}
        </div>
        <div className="flex gap-4">
          <button className="text-[#1B1B1B] hover:text-[#2E7D32] transition-colors">
            <Search size={22} strokeWidth={1.5} />
          </button>
          <button className="text-[#1B1B1B] hover:text-[#2E7D32] transition-colors relative">
            <Bell size={22} strokeWidth={1.5} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#E53935] rounded-full"></span>
          </button>
        </div>
      </header>

      <main className="px-6 space-y-12">
        {/* Hero Section */}
        <section className="space-y-6">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-[#1B1B1B]">
            {greeting}
          </h1>
          
          <div className="bg-[#FFFDFB] rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E8E6E1]">
            <p className="text-[16px] text-[#4A4A4A] leading-[1.7] font-light">
              <span className="font-medium text-[#2E7D32]">Daily Insight</span> — {insight}
            </p>
          </div>
        </section>

        {/* Stats Row Typography */}
        <section>
          <div className="flex items-center space-x-3 text-[#666666] text-[15px] font-light tracking-wide">
            <span>{scansToday} of {totalScans} scans today</span>
            <span className="text-[#D4D4D4]">•</span>
            <span>
              Average score: <span className="font-medium text-[#1B1B1B] relative inline-block">
                {avgScore}
                <span className="absolute bottom-1 left-0 w-full h-[3px] bg-[#3DD68C]/40 -z-10 rounded-full"></span>
              </span>
            </span>
          </div>
          
          {/* Progress Bar Minimal */}
          <div className="mt-4 w-full h-1 bg-[#EBEBEB] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2E7D32] rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${(scansToday / totalScans) * 100}%` }}
            />
          </div>
        </section>

        {/* Recent Scans (Editorial List) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium tracking-tight">Recent Scans</h2>
            <button className="text-sm text-[#666666] hover:text-[#1B1B1B] flex items-center gap-1 font-light">
              View all <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentScans.map((scan, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer p-4 -mx-4 rounded-xl hover:bg-[#F0EFEA] transition-colors">
                <div>
                  <h3 className="text-[16px] font-medium text-[#1B1B1B]">{scan.name}</h3>
                  <p className="text-[14px] text-[#666666] font-light mt-0.5">{scan.brand}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getScoreColor(scan.score)}`}>
                  {scan.score}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Products (Minimal List) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium tracking-tight">Trending</h2>
          </div>
          
          <div className="space-y-0">
            {popularProducts.map((product, i) => (
              <div key={i} className="flex items-center justify-between py-5 border-b border-[rgba(0,0,0,0.05)] last:border-0 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FFFDFB] border border-[#E8E6E1] flex items-center justify-center text-[#2E7D32]">
                    <Star size={18} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-[#1B1B1B]">{product.name}</h3>
                    <p className="text-[13px] text-[#666666] font-light">{product.brand}</p>
                  </div>
                </div>
                <div className="text-[13px] text-[#999999] flex items-center gap-1">
                  <Zap size={14} /> {product.calories} cal
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-8 left-0 w-full px-6 flex justify-center">
        <button className="bg-[#1B1B1B] text-white px-8 py-4 rounded-[2rem] font-medium text-[16px] flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-transform">
          <Activity size={20} strokeWidth={2} />
          Scan a Product
        </button>
      </div>
    </div>
  );
}
