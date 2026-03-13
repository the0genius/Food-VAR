import React, { useEffect, useState } from "react";
import {
  Heart,
  AlertTriangle,
  Trophy,
  Target,
  Leaf,
  Activity,
  LogOut,
  ChevronRight,
  Edit2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

// --- Mock Data ---
const USER = {
  name: "Amr",
  email: "amr@email.com",
  age: 28,
  initial: "A",
  isPro: false,
};

const HEALTH_PROFILE = {
  conditions: ["Diabetes (Type 2)", "Hypertension"],
  allergies: ["Peanuts", "Shellfish"],
  goal: "Lose Weight",
  diet: "Vegetarian",
};

const STATS = {
  totalScans: 47,
  avgScore: 72,
  weeklyScans: 12,
  bestProducts: [
    { name: "Greek Yogurt", brand: "Fage", score: 89 },
    { name: "Organic Granola", brand: "Nature's Path", score: 76 },
    { name: "Almond Milk", brand: "Califia", score: 92 },
  ],
  worstProducts: [
    { name: "Oreo Original", brand: "Nabisco", score: 12 },
    { name: "Coca-Cola", brand: "Coca-Cola", score: 18 },
    { name: "Doritos", brand: "Frito-Lay", score: 22 },
  ],
};

// --- Helpers ---
const getScoreColors = (score: number) => {
  if (score >= 75) return { fg: "#43A047", bg: "#E8F5E9" }; // Green
  if (score >= 50) return { fg: "#2EC4B6", bg: "#E0F7FA" }; // Teal
  if (score >= 35) return { fg: "#FB8C00", bg: "#FFF3E0" }; // Amber
  return { fg: "#E53935", bg: "#FFEBEE" }; // Danger
};

export function IdentityFirst() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const avgScoreColors = getScoreColors(STATS.avgScore);

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] flex flex-col mx-auto w-full max-w-[390px] overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24 hide-scrollbar">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] pt-16 pb-12 px-6 rounded-b-[28px] relative">
          <div
            className="flex flex-col items-center text-center opacity-0 translate-y-[-10px]"
            style={{
              animation: mounted ? "fadeInDown 600ms ease-out forwards" : "none",
            }}
          >
            <div className="relative mb-3 group cursor-pointer">
              <div className="w-[76px] h-[76px] rounded-full bg-gradient-to-br from-[#3DD68C] to-[#2EC4B6] p-[3px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center border-2 border-white">
                  <span className="text-[32px] font-[800] text-[#2E7D32] leading-none">
                    {USER.initial}
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-sm border border-[rgba(0,0,0,0.05)]">
                <Edit2 className="w-[14px] h-[14px] text-[#666666]" />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[22px] font-[800] text-white tracking-tight leading-none">
                {USER.name}
              </h1>
              <div className="bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                <span className="text-white text-[11px] font-[600]">
                  {USER.age} yo
                </span>
              </div>
            </div>
            
            <p className="text-white/70 text-[13px] font-[400]">
              {USER.email}
            </p>
          </div>
        </div>

        <div className="px-5">
          {/* MOTIVATIONAL CARD (Overlapping) */}
          <div
            className="bg-white rounded-[20px] p-4 flex items-center gap-3 -mt-6 relative z-10 opacity-0 translate-y-[-10px]"
            style={{
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.07)",
              borderLeft: `3px solid ${avgScoreColors.fg}`,
              animation: mounted ? "fadeInDown 600ms ease-out 100ms forwards" : "none",
            }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: avgScoreColors.bg }}>
              {STATS.avgScore >= 55 ? (
                <Sparkles className="w-4 h-4" style={{ color: avgScoreColors.fg }} />
              ) : (
                <TrendingUp className="w-4 h-4" style={{ color: avgScoreColors.fg }} />
              )}
            </div>
            <p className="text-[13px] font-[500] text-[#1B1B1B] leading-snug">
              You're on the right track — small changes add up.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {/* HEALTH PASSPORT (Vertical Stack) */}
            <div 
              className="bg-white rounded-[20px] p-4 border border-[rgba(0,0,0,0.07)] opacity-0 translate-y-[-10px]"
              style={{ 
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                animation: mounted ? "fadeInDown 600ms ease-out 200ms forwards" : "none",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-[18px] h-[18px] text-[#2E7D32]" fill="currentColor" />
                <h2 className="text-[15px] font-[700] text-[#1B1B1B] tracking-tight">Health Profile</h2>
                <div className="h-[2px] w-[20px] bg-[#3DD68C] rounded-full ml-1 opacity-60" />
              </div>

              <div className="space-y-0">
                {/* Condition */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFEBEE] to-[#FFCDD2] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-[#E53935]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-[700] text-[#999999] tracking-wider uppercase mb-0.5">Condition</p>
                    <p className="text-[14px] font-[500] text-[#1B1B1B]">{HEALTH_PROFILE.conditions.join(", ")}</p>
                  </div>
                </div>

                {/* Allergies */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[#FB8C00]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-[700] text-[#999999] tracking-wider uppercase mb-0.5">Allergies</p>
                    <p className="text-[14px] font-[500] text-[#1B1B1B]">{HEALTH_PROFILE.allergies.join(", ")}</p>
                  </div>
                </div>

                {/* Goal */}
                <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-[#2E7D32]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-[700] text-[#999999] tracking-wider uppercase mb-0.5">Goal</p>
                    <p className="text-[14px] font-[500] text-[#1B1B1B]">{HEALTH_PROFILE.goal}</p>
                  </div>
                </div>

                {/* Diet */}
                <div className="flex items-center gap-3 pt-3">
                  <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2] flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4 text-[#2EC4B6]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-[700] text-[#999999] tracking-wider uppercase mb-0.5">Diet</p>
                    <p className="text-[14px] font-[500] text-[#1B1B1B]">{HEALTH_PROFILE.diet}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPACT STAT ROW */}
            <div 
              className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] flex flex-row items-center justify-between py-4 px-2 opacity-0 translate-y-[-10px]"
              style={{ 
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                animation: mounted ? "fadeInDown 600ms ease-out 300ms forwards" : "none",
              }}
            >
              <div className="flex-1 flex flex-col items-center border-r border-[#F0F0F0]">
                <span className="text-[22px] font-[800] text-[#1B1B1B] leading-none mb-1">{STATS.totalScans}</span>
                <span className="text-[11px] font-[500] text-[#666666]">Total Scans</span>
              </div>
              <div className="flex-1 flex flex-col items-center border-r border-[#F0F0F0]">
                <span className="text-[22px] font-[800] leading-none mb-1" style={{ color: avgScoreColors.fg }}>
                  {STATS.avgScore}
                </span>
                <span className="text-[11px] font-[500] text-[#666666]">Avg Score</span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[22px] font-[800] text-[#1B1B1B] leading-none mb-1">{STATS.weeklyScans}</span>
                <span className="text-[11px] font-[500] text-[#666666]">This Week</span>
              </div>
            </div>

            {/* FAVORITES (Combined Card) */}
            <div 
              className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden opacity-0 translate-y-[-10px]"
              style={{ 
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                animation: mounted ? "fadeInDown 600ms ease-out 400ms forwards" : "none",
              }}
            >
              {/* Best Products Section */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-[18px] h-[18px] text-[#43A047]" fill="currentColor" />
                  <h2 className="text-[15px] font-[700] text-[#1B1B1B] tracking-tight">Your Top Picks</h2>
                </div>
                
                <div className="space-y-3">
                  {STATS.bestProducts.map((product, i) => {
                    const colors = getScoreColors(product.score);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div 
                          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <span className="text-[13px] font-[800]" style={{ color: colors.fg }}>
                            {product.score}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-[600] text-[#1B1B1B] truncate">{product.name}</p>
                          <p className="text-[11px] font-[400] text-[#666666] truncate">{product.brand}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-[1px] w-full bg-[#F0F0F0]" />

              {/* Worst Products Section */}
              <div className="p-4 bg-[#FFEBEE]/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-[18px] h-[18px] text-[#E53935]" fill="currentColor" />
                  <h2 className="text-[15px] font-[700] text-[#1B1B1B] tracking-tight">Watch Out For</h2>
                </div>
                
                <div className="space-y-3">
                  {STATS.worstProducts.map((product, i) => {
                    const colors = getScoreColors(product.score);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div 
                          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <span className="text-[13px] font-[800]" style={{ color: colors.fg }}>
                            {product.score}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-[600] text-[#1B1B1B] truncate">{product.name}</p>
                          <p className="text-[11px] font-[400] text-[#666666] truncate">{product.brand}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div 
              className="pt-2 opacity-0 translate-y-[-10px]"
              style={{
                animation: mounted ? "fadeInDown 600ms ease-out 500ms forwards" : "none",
              }}
            >
              <button className="w-full flex items-center justify-between p-4 bg-white border border-[#2E7D32]/20 rounded-[16px] mb-4 hover:bg-[#2E7D32]/5 transition-colors cursor-pointer active:scale-[0.98]">
                <span className="text-[14px] font-[600] text-[#2E7D32]">Edit Health Profile</span>
                <ChevronRight className="w-4 h-4 text-[#2E7D32]" />
              </button>

              <button className="w-full flex items-center justify-center gap-2 py-3 mb-6 hover:opacity-80 transition-opacity cursor-pointer">
                <LogOut className="w-[14px] h-[14px] text-[#E53935]" />
                <span className="text-[14px] font-[600] text-[#E53935]">Log Out</span>
              </button>
            </div>
            
          </div>
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
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </div>
  );
}
