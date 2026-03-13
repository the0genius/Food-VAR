import React, { useEffect, useState } from "react";
import {
  Settings,
  Scan,
  Activity,
  Clock,
  Shield,
  HeartPulse,
  AlertTriangle,
  Target,
  Leaf,
  ChevronRight,
  LogOut,
  Trophy,
  Flame
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
const getScoreColor = (score: number) => {
  if (score >= 75) return { fg: "#43A047", bg: "#E8F5E9" }; // Green
  if (score >= 50) return { fg: "#2EC4B6", bg: "#E0F7FA" }; // Teal
  if (score >= 35) return { fg: "#FB8C00", bg: "#FFF3E0" }; // Amber
  return { fg: "#E53935", bg: "#FFEBEE" }; // Red
};

export function CardGrid() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getAnimation = (delay: number) => ({
    animation: mounted ? `fadeInDown 500ms ease-out ${delay}ms both` : "none",
    opacity: mounted ? 0 : 1,
  });

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] flex flex-col pb-24 mx-auto w-full max-w-[390px] overflow-hidden">
      
      {/* 1. Minimal top bar */}
      <div className="bg-gradient-to-b from-[#F0FAF4] to-transparent pt-14 pb-4 px-5 flex items-center justify-between z-10">
        <h1 
          className="text-[#1B1B1B] text-[22px] font-[800] leading-none tracking-tight"
          style={getAnimation(0)}
        >
          {USER.name}'s Profile
        </h1>
        <button 
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
          style={getAnimation(50)}
        >
          <Settings className="w-5 h-5 text-[#666666]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-[16px]">
        
        {/* 2. Avatar + Identity Card */}
        <div 
          className="bg-white rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(0,0,0,0.07)]"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", ...getAnimation(100) }}
        >
          <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#3DD68C] to-[#2E7D32] flex items-center justify-center shrink-0 shadow-sm border border-[rgba(0,0,0,0.04)]">
            <span className="text-white text-[24px] font-[800]">{USER.initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h2 className="text-[#1B1B1B] text-[18px] font-[700] truncate">{USER.name}</h2>
              <button className="text-[#2E7D32] text-[13px] font-[600] active:opacity-70 transition-opacity">
                Edit
              </button>
            </div>
            <p className="text-[#666666] text-[13px] truncate">{USER.email}</p>
            <p className="text-[#999999] text-[12px] font-[500] mt-0.5">Age {USER.age}</p>
          </div>
        </div>

        {/* 3. Stat widgets row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Scans */}
          <div 
            className="bg-white rounded-[20px] p-3 flex flex-col justify-between aspect-square border border-[rgba(0,0,0,0.07)]"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", ...getAnimation(150) }}
          >
            <div className="flex justify-end mb-1">
              <Scan className="w-4 h-4 text-[#43A047]" />
            </div>
            <div className="mt-auto">
              <div className="text-[24px] font-[900] text-[#1B1B1B] leading-none tabular-nums tracking-tight">
                {STATS.totalScans}
              </div>
              <div className="text-[11px] font-[500] text-[#666666] mt-1 leading-tight">Total Scans</div>
            </div>
          </div>

          {/* Avg Score */}
          <div 
            className="bg-white rounded-[20px] p-3 flex flex-col justify-between aspect-square border border-[rgba(0,0,0,0.07)]"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", ...getAnimation(200) }}
          >
            <div className="flex justify-end mb-1">
              <Activity className="w-4 h-4 text-[#43A047]" style={{ color: getScoreColor(STATS.avgScore).fg }} />
            </div>
            <div className="mt-auto">
              <div 
                className="text-[24px] font-[900] leading-none tabular-nums tracking-tight"
                style={{ color: getScoreColor(STATS.avgScore).fg }}
              >
                {STATS.avgScore}
              </div>
              <div className="text-[11px] font-[500] text-[#666666] mt-1 leading-tight">Avg Score</div>
            </div>
          </div>

          {/* This Week */}
          <div 
            className="bg-white rounded-[20px] p-3 flex flex-col justify-between aspect-square border border-[rgba(0,0,0,0.07)]"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", ...getAnimation(250) }}
          >
            <div className="flex justify-end mb-1">
              <Clock className="w-4 h-4 text-[#2EC4B6]" />
            </div>
            <div className="mt-auto">
              <div className="text-[24px] font-[900] text-[#1B1B1B] leading-none tabular-nums tracking-tight">
                {STATS.weeklyScans}
              </div>
              <div className="text-[11px] font-[500] text-[#666666] mt-1 leading-tight">This Week</div>
            </div>
          </div>
        </div>

        {/* 4. Health Passport Card */}
        <div 
          className="bg-white rounded-[20px] p-5 border border-[rgba(0,0,0,0.07)]"
          style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", ...getAnimation(300) }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-[#2E7D32]" />
            <h3 className="text-[#1B1B1B] text-[16px] font-[800] tracking-tight">Health Passport</h3>
            <div className="w-1 h-[14px] bg-[#3DD68C] rounded-full ml-1 opacity-70" />
          </div>

          <div className="space-y-0">
            {/* Conditions */}
            <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFEBEE] to-[#FFCDD2] flex items-center justify-center shrink-0">
                <HeartPulse className="w-[16px] h-[16px] text-[#E53935]" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">Conditions</div>
                <div className="text-[14px] font-[600] text-[#1B1B1B] leading-snug">{HEALTH_PROFILE.conditions.join(", ")}</div>
              </div>
            </div>

            {/* Allergies */}
            <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-[16px] h-[16px] text-[#FB8C00]" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">Allergies</div>
                <div className="text-[14px] font-[600] text-[#1B1B1B] leading-snug">{HEALTH_PROFILE.allergies.join(", ")}</div>
              </div>
            </div>

            {/* Goal */}
            <div className="flex items-center gap-3 py-3 border-b border-[#F0F0F0]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center shrink-0">
                <Target className="w-[16px] h-[16px] text-[#43A047]" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">Goal</div>
                <div className="text-[14px] font-[600] text-[#1B1B1B] leading-snug">{HEALTH_PROFILE.goal}</div>
              </div>
            </div>

            {/* Diet */}
            <div className="flex items-center gap-3 pt-3">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2] flex items-center justify-center shrink-0">
                <Leaf className="w-[16px] h-[16px] text-[#2EC4B6]" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">Diet</div>
                <div className="text-[14px] font-[600] text-[#1B1B1B] leading-snug">{HEALTH_PROFILE.diet}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Performance Snapshot */}
        <div className="grid grid-cols-2 gap-3" style={getAnimation(350)}>
          {/* Best Picks */}
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(0,0,0,0.07)]" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#43A047]" />
              <h3 className="text-[#1B1B1B] text-[13px] font-[700]">Best Picks</h3>
            </div>
            <div className="space-y-3">
              {STATS.bestProducts.map((p, i) => {
                const { bg, fg } = getScoreColor(p.score);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ backgroundColor: bg, color: fg }}>
                      {p.score}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[12px] font-[600] text-[#1B1B1B] truncate leading-tight">{p.name}</div>
                      <div className="text-[10px] text-[#666666] truncate mt-0.5">{p.brand}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avoid */}
          <div className="bg-white rounded-[20px] p-4 border border-[rgba(0,0,0,0.07)]" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-[#E53935]" />
              <h3 className="text-[#1B1B1B] text-[13px] font-[700]">Avoid</h3>
            </div>
            <div className="space-y-3">
              {STATS.worstProducts.map((p, i) => {
                const { bg, fg } = getScoreColor(p.score);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ backgroundColor: bg, color: fg }}>
                      {p.score}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-[12px] font-[600] text-[#1B1B1B] truncate leading-tight">{p.name}</div>
                      <div className="text-[10px] text-[#666666] truncate mt-0.5">{p.brand}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Quick Actions */}
        <div className="space-y-3 pt-2" style={getAnimation(400)}>
          <button className="w-full bg-white rounded-[20px] p-4 flex items-center justify-between border border-[rgba(0,0,0,0.07)] shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#3DD68C]" />
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-[#F0FAF4] flex items-center justify-center">
                <Target className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <span className="text-[#1B1B1B] text-[15px] font-[600]">Edit Health Profile</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#999999]" />
          </button>

          <button className="w-full bg-white rounded-[20px] p-4 flex items-center justify-between border border-[rgba(0,0,0,0.07)] shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#E53935]" />
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-[#FFEBEE] flex items-center justify-center">
                <LogOut className="w-4 h-4 text-[#E53935]" />
              </div>
              <span className="text-[#E53935] text-[15px] font-[600]">Log Out</span>
            </div>
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
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
