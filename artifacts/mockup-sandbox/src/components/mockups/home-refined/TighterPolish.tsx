import React from 'react';
import { 
  Scan, Leaf, ChevronRight, Activity, Award, ArrowRight,
  TrendingUp, Clock, AlertTriangle, CheckCircle, Package, Droplets, Beef, Wheat, Camera, Search
} from 'lucide-react';

export function TighterPolish() {
  const user = { name: "Amr", greeting: "Good morning" };
  const stats = { scansUsed: 3, scansTotal: 10, avgScore: 72 };
  const recentScans = [
    { name: "Oreo Original", brand: "Nabisco", score: 12, type: "danger" },
    { name: "Greek Yogurt", brand: "Fage", score: 89, type: "green" },
    { name: "Organic Granola", brand: "Nature's Path", score: 76, type: "green" },
    { name: "Coca-Cola Classic", brand: "Coca-Cola", score: 18, type: "danger" }
  ];
  const popular = [
    { name: "Almond Milk Unsweetened", brand: "Califia Farms", calories: 30, icon: Droplets, iconColor: "text-blue-500", iconBg: "bg-blue-50" },
    { name: "Chicken Breast Grilled", brand: "Perdue", calories: 165, icon: Beef, iconColor: "text-orange-500", iconBg: "bg-orange-50" },
    { name: "Avocado Toast Mix", brand: "Trader Joe's", calories: 220, icon: Wheat, iconColor: "text-amber-500", iconBg: "bg-amber-50" }
  ];

  const getScoreColors = (score: number) => {
    if (score >= 70) return "bg-[#E8F5E9] text-[#43A047]";
    if (score >= 40) return "bg-[#FFF3E0] text-[#FB8C00]";
    return "bg-[#FFEBEE] text-[#E53935]";
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] pb-24 mx-auto max-w-[390px] overflow-hidden shadow-2xl relative">
      {/* Header Background */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#F0FAF4] to-[#F6F8F7] -z-10" />

      {/* Header */}
      <header className="px-6 pt-14 pb-4 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-[#666666]">{user.greeting},</p>
          <h1 className="text-2xl font-bold text-[#1B1B1B]">{user.name}</h1>
        </div>
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white ring-1 ring-[#2E7D32]">
            <img 
              src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      <main className="px-6">
        {/* Progress Bar Stacked */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-semibold text-[#1B1B1B]">{stats.scansUsed} of {stats.scansTotal} scans</span>
            <span className="text-xs font-medium text-[#666666]">Reset in 12h</span>
          </div>
          <div className="h-1.5 w-full bg-[#E8F5E9] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2E7D32] rounded-full" 
              style={{ width: `${(stats.scansUsed / stats.scansTotal) * 100}%` }}
            />
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-[20px] p-6 mb-6 relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-[0.5px] border-[rgba(0,0,0,0.07)]">
          <Leaf className="absolute top-4 right-4 w-8 h-8 text-[#2E7D32] opacity-10" />
          <h2 className="text-xl font-bold text-[#1B1B1B] mb-2 leading-tight w-[70%]">Scan Smart.<br/>Eat Right.</h2>
          <p className="text-sm text-[#666666] mb-6 w-[80%]">Discover the truth behind every ingredient. Your body will thank you.</p>
          <button className="bg-gradient-to-r from-[#3DD68C] to-[#2E7D32] text-white font-semibold py-3 px-6 rounded-full flex items-center justify-center space-x-2 w-full shadow-sm">
            <Scan className="w-5 h-5" />
            <span>Scan a Product</span>
          </button>
        </div>

        {/* Insight Card - Simplified */}
        <div className="bg-white rounded-[20px] p-4 mb-6 shadow-[0_0_0_0_rgba(0,0,0,0)] border-[0.5px] border-[rgba(0,0,0,0.07)] border-l-4 border-l-[#3DD68C] flex items-center">
          <p className="text-sm font-medium text-[#1B1B1B] leading-snug flex-1">
            "Your choices are looking great! Keep making smart picks."
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex space-x-3 mb-6">
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-[0.5px] border-[rgba(0,0,0,0.07)] flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#999999] mb-1">Scans Today</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-[#1B1B1B]">{stats.scansUsed}</span>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border-[0.5px] border-[rgba(0,0,0,0.07)] flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#999999] mb-1">Avg Score</span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-[#2EC4B6]">{stats.avgScore}</span>
              <span className="text-xs font-bold text-[#2EC4B6]">/100</span>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">Recent Scans</h3>
            <button className="p-1">
              <ArrowRight className="w-4 h-4 text-[#666666]" />
            </button>
          </div>
          
          <div className="flex overflow-x-auto space-x-3 pb-2 -mx-6 px-6 hide-scrollbar">
            {recentScans.map((scan, i) => (
              <div key={i} className="min-w-[140px] bg-white rounded-[20px] p-4 shadow-[0_2px_4px_rgba(0,0,0,0.04)] border-[0.5px] border-[rgba(0,0,0,0.07)] flex flex-col relative">
                <div className={`absolute top-0 right-0 rounded-tr-[20px] rounded-bl-[12px] px-2 py-1 flex items-center justify-center font-bold text-xs ${getScoreColors(scan.score)}`}>
                  {scan.score}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-[#F6F8F7] flex items-center justify-center mb-3 mt-1">
                  <Package className="w-5 h-5 text-[#999999]" />
                </div>
                
                <h4 className="text-sm font-semibold text-[#1B1B1B] leading-tight mb-1 truncate">{scan.name}</h4>
                <p className="text-xs text-[#666666] truncate">{scan.brand}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Products */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">Popular Right Now</h3>
          </div>
          
          <div className="space-y-3">
            {popular.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-[20px] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)] border-[0.5px] border-[rgba(0,0,0,0.07)] flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-[14px] ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#1B1B1B] leading-tight truncate">{item.name}</h4>
                    <p className="text-xs text-[#666666] truncate">{item.brand}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end pr-1">
                    <span className="text-xs font-semibold text-[#1B1B1B]">{item.calories}</span>
                    <span className="text-[10px] text-[#999999]">kcal</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contribute Card */}
        <div className="bg-[#E8F5E9] rounded-[20px] p-5 shadow-[0_2px_4px_rgba(0,0,0,0.04)] border-[0.5px] border-[rgba(0,0,0,0.07)] flex flex-row items-center justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-bold text-[#1B1B1B] mb-1">Help Grow FoodVAR</h3>
            <p className="text-xs text-[#666666]">Submit products to earn contributor badges.</p>
          </div>
          <button className="bg-white text-[#2E7D32] px-4 py-2 rounded-full font-semibold text-xs shadow-sm whitespace-nowrap">
            Contribute
          </button>
        </div>
      </main>

      {/* Floating Action Bar - mock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white rounded-full shadow-lg border-[0.5px] border-[rgba(0,0,0,0.07)] px-6 py-3 flex justify-between items-center z-10">
        <div className="flex flex-col items-center space-y-1 opacity-100">
          <Activity className="w-5 h-5 text-[#2E7D32]" />
          <span className="text-[10px] font-medium text-[#2E7D32]">Home</span>
        </div>
        <div className="flex flex-col items-center space-y-1 opacity-40">
          <Search className="w-5 h-5 text-[#1B1B1B]" />
          <span className="text-[10px] font-medium text-[#1B1B1B]">Discover</span>
        </div>
        <div className="flex flex-col items-center space-y-1 opacity-40">
          <Award className="w-5 h-5 text-[#1B1B1B]" />
          <span className="text-[10px] font-medium text-[#1B1B1B]">Profile</span>
        </div>
      </div>
    </div>
  );
}

// Add custom scrollbar hiding styles via inline style tag for convenience, 
// normally this would be in index.css
const style = document.createElement('style');
style.textContent = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);
