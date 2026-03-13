import React from 'react';
import { Scan, User, Activity, Flame, ChevronRight, BarChart3, Plus, Search, Hexagon } from 'lucide-react';

export function ActionMinimal() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#3DD68C'; // Mint Green
    if (score >= 40) return '#FB8C00'; // Amber
    return '#E53935'; // Danger
  };

  const recentScans = [
    { name: "Oreo Original", brand: "Nabisco", score: 12 },
    { name: "Greek Yogurt", brand: "Fage", score: 89 },
    { name: "Organic Granola", brand: "Nature's Path", score: 76 },
    { name: "Coca-Cola Classic", brand: "Coca-Cola", score: 18 }
  ];

  const popularProducts = [
    { name: "Almond Milk Unsweetened", brand: "Califia Farms", calories: 30 },
    { name: "Chicken Breast Grilled", brand: "Perdue", calories: 165 },
    { name: "Avocado Toast Mix", brand: "Trader Joe's", calories: 220 }
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-['Inter'] flex justify-center selection:bg-[#3DD68C] selection:text-[#0D1117]">
      <div className="w-full max-w-[390px] relative pb-24 shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <header className="px-6 pt-14 pb-4 flex justify-between items-center z-10">
          <div>
            <p className="text-[10px] tracking-widest text-gray-500 uppercase font-semibold mb-1">{getGreeting()}</p>
            <h1 className="text-xl font-medium tracking-tight">Hey Amr</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#161B22] border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors group">
            <User size={18} className="text-gray-400 group-hover:text-white transition-colors" />
          </button>
        </header>

        {/* HERO - ACTION CENTER */}
        <section className="flex flex-col items-center justify-center pt-8 pb-12 z-10">
          <div className="relative group cursor-pointer mb-6">
            <div className="absolute inset-0 bg-[#3DD68C] rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <button className="relative w-28 h-28 bg-[#3DD68C] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(61,214,140,0.3)] hover:scale-105 active:scale-95 transition-all duration-300">
              <Scan size={40} className="text-[#0D1117]" />
            </button>
          </div>
          <h2 className="text-lg font-medium mb-3 tracking-tight">Tap to Scan</h2>
          <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><Activity size={14} className="text-[#3DD68C]" /> 3/10 Scans</span>
            <span className="w-1 h-1 rounded-full bg-gray-700"></span>
            <span className="flex items-center gap-1.5"><Hexagon size={14} className="text-[#3DD68C]" /> Avg 72</span>
          </div>
        </section>

        {/* MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 px-6 space-y-10 z-10">
          
          {/* RECENT SCANS */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-[10px] tracking-widest text-gray-500 uppercase font-bold">Recent Scans</h3>
              <button className="text-[10px] tracking-widest text-[#3DD68C] uppercase font-bold hover:text-white transition-colors">View All</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {recentScans.map((scan, idx) => (
                <div key={idx} className="bg-[#161B22] rounded-xl overflow-hidden flex flex-col border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                  <div className="h-1 w-full" style={{ backgroundColor: getScoreColor(scan.score) }} />
                  <div className="p-3.5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xl font-bold tracking-tighter" style={{ color: getScoreColor(scan.score) }}>
                        {scan.score}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-100 truncate group-hover:text-white transition-colors">{scan.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{scan.brand}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* POPULAR PRODUCTS */}
          <section>
            <h3 className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-4">Popular Choices</h3>
            <div className="bg-[#161B22] rounded-2xl border border-white/5 overflow-hidden">
              {popularProducts.map((product, idx) => (
                <div key={idx} className={`flex items-center justify-between p-4 hover:bg-white/[0.02] cursor-pointer transition-colors ${idx !== popularProducts.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0D1117] flex items-center justify-center border border-white/5">
                      <Search size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{product.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{product.brand}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A2E24] border border-[#3DD68C]/20 text-[#3DD68C]">
                    <Flame size={10} />
                    <span className="text-[10px] font-bold">{product.calories}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* INSIGHT BANNER */}
          <section className="pb-8">
            <div className="bg-[#161B22] rounded-xl border border-white/5 border-l-2 border-l-[#3DD68C] p-4 flex items-start gap-3">
              <BarChart3 size={16} className="text-[#3DD68C] shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300 leading-relaxed">
                Your choices are looking great! Keep making smart picks.
              </p>
            </div>
          </section>

        </div>

        {/* BOTTOM NAV / FLOATING FAB */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#161B22]/90 backdrop-blur-md px-2 py-2 rounded-full border border-white/10 shadow-2xl z-50">
           <button className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
             <Activity size={20} />
           </button>
           <button className="w-12 h-12 rounded-full bg-white text-[#0D1117] flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
             <Scan size={20} />
           </button>
           <button className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
             <User size={20} />
           </button>
        </div>

      </div>
    </div>
  );
}
