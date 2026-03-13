import React, { useEffect, useState } from "react";
import {
  User,
  Edit,
  Activity,
  Heart,
  AlertTriangle,
  Leaf,
  Target,
  LogOut,
  Trophy,
  TrendingUp,
  BarChart3
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
    { id: 1, name: "Greek Yogurt", brand: "Fage", score: 89 },
    { id: 2, name: "Organic Granola", brand: "Nature's Path", score: 76 },
    { id: 3, name: "Almond Milk", brand: "Califia", score: 92 },
  ],
  worstProducts: [
    { id: 4, name: "Oreo Original", brand: "Nabisco", score: 12 },
    { id: 5, name: "Coca-Cola", brand: "Coca-Cola", score: 18 },
    { id: 6, name: "Doritos", brand: "Frito-Lay", score: 22 },
  ],
};

// --- Helpers ---
const getScoreColors = (score: number) => {
  if (score >= 75) return { fg: "#43A047", bg: "#E8F5E9" };
  if (score >= 50) return { fg: "#2EC4B6", bg: "#E0F7FA" };
  if (score >= 35) return { fg: "#FB8C00", bg: "#FFF3E0" };
  return { fg: "#E53935", bg: "#FFEBEE" };
};

export function StatsForward() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const avgScoreColors = getScoreColors(STATS.avgScore);

  // Circular progress math
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = mounted ? circumference - (STATS.avgScore / 100) * circumference : circumference;

  return (
    <div className="min-h-screen bg-[#F6F8F7] font-['Inter'] flex flex-col pb-24 mx-auto w-full max-w-[390px] overflow-x-hidden">
      
      {/* 1. Compact Identity Bar */}
      <div 
        className="px-5 pt-12 pb-4 bg-white border-b border-[rgba(0,0,0,0.04)] flex items-center justify-between sticky top-0 z-50"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#3DD68C] to-[#2E7D32] flex items-center justify-center shadow-sm">
            <span className="text-white text-[18px] font-bold">{USER.initial}</span>
          </div>
          <div>
            <h1 className="text-[#1B1B1B] text-[16px] font-[800] leading-tight tracking-tight">
              {USER.name}
            </h1>
            <p className="text-[#666666] text-[13px] font-[400]">
              {USER.email}
            </p>
          </div>
        </div>
        <button className="w-[36px] h-[36px] rounded-full bg-[#F6F8F7] flex items-center justify-center transition-transform active:scale-95 cursor-pointer">
          <Edit className="w-4 h-4 text-[#666666]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 space-y-6">
        
        {/* 2. Hero Stats Strip */}
        <div 
          className="bg-white rounded-[20px] p-2 flex border border-[rgba(0,0,0,0.07)] opacity-0 translate-y-4"
          style={{ 
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
            animationDelay: "50ms"
          }}
        >
          {/* Total Scans */}
          <div className="flex-1 rounded-[16px] bg-[#E8F5E9] p-3 flex flex-col items-center justify-center text-center mr-1">
            <span className="text-[32px] font-[900] text-[#2E7D32] leading-none tracking-tight mb-1">
              {STATS.totalScans}
            </span>
            <span className="text-[11px] font-[600] text-[#43A047] uppercase tracking-wider">
              Total Scans
            </span>
          </div>

          {/* Avg Score */}
          <div 
            className="flex-1 rounded-[16px] p-3 flex flex-col items-center justify-center text-center mx-1"
            style={{ backgroundColor: avgScoreColors.bg }}
          >
            <span 
              className="text-[32px] font-[900] leading-none tracking-tight mb-1"
              style={{ color: avgScoreColors.fg }}
            >
              {STATS.avgScore}
            </span>
            <span 
              className="text-[11px] font-[600] uppercase tracking-wider"
              style={{ color: avgScoreColors.fg, opacity: 0.9 }}
            >
              Avg Score
            </span>
          </div>

          {/* This Week */}
          <div className="flex-1 rounded-[16px] bg-[#E0F7FA] p-3 flex flex-col items-center justify-center text-center ml-1">
            <span className="text-[32px] font-[900] text-[#0097A7] leading-none tracking-tight mb-1">
              {STATS.weeklyScans}
            </span>
            <span className="text-[11px] font-[600] text-[#00BCD4] uppercase tracking-wider">
              This Week
            </span>
          </div>
        </div>

        {/* 3. Score Trend Section */}
        <div 
          className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-5 relative overflow-hidden opacity-0 translate-y-4"
          style={{ 
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
            animationDelay: "150ms"
          }}
        >
          <div className="flex items-center gap-4">
            {/* SVG Ring */}
            <div className="relative w-[80px] h-[80px] shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#F0F0F0"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={avgScoreColors.fg}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[22px] font-[900] tracking-tight" style={{ color: avgScoreColors.fg }}>
                  {STATS.avgScore}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
                <h3 className="text-[16px] font-[800] text-[#1B1B1B]">Your Health Score</h3>
              </div>
              <p className="text-[13px] font-[400] text-[#666666] leading-snug">
                You're making solid choices overall. Keep aiming for green products!
              </p>
            </div>
          </div>
        </div>

        {/* 4. Top Picks & Watch Out */}
        <div className="grid grid-cols-2 gap-3">
          {/* Top Picks */}
          <div 
            className="bg-[#F2F9F4] rounded-[20px] p-4 border border-[rgba(67,160,71,0.15)] flex flex-col opacity-0 translate-y-4"
            style={{ 
              animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
              animationDelay: "250ms"
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#43A047]" />
              <h3 className="text-[13px] font-[800] text-[#2E7D32]">Top Picks</h3>
            </div>
            <div className="space-y-3 flex-1">
              {STATS.bestProducts.map((p) => {
                const c = getScoreColors(p.score);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-white/60 p-2 rounded-[12px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-[600] text-[#1B1B1B] truncate">{p.name}</p>
                    </div>
                    <div 
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: c.fg }}>{p.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Watch Out */}
          <div 
            className="bg-[#FFF5F5] rounded-[20px] p-4 border border-[rgba(229,57,53,0.15)] flex flex-col opacity-0 translate-y-4"
            style={{ 
              animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
              animationDelay: "300ms"
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#E53935]" />
              <h3 className="text-[13px] font-[800] text-[#C62828]">Watch Out</h3>
            </div>
            <div className="space-y-3 flex-1">
              {STATS.worstProducts.map((p) => {
                const c = getScoreColors(p.score);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-white/60 p-2 rounded-[12px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-[600] text-[#1B1B1B] truncate">{p.name}</p>
                    </div>
                    <div 
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: c.fg }}>{p.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Health Profile Grid */}
        <div 
          className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] p-4 opacity-0 translate-y-4"
          style={{ 
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
            animationDelay: "400ms"
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-[18px] h-[18px] text-[#2E7D32]" />
            <h2 className="text-[15px] font-[800] text-[#1B1B1B] tracking-tight">Health Profile</h2>
            <div className="w-[4px] h-[4px] rounded-full bg-[#3DD68C] ml-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Conditions */}
            <div className="bg-[#F6F8F7] p-3 rounded-[16px]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFE8E8] to-[#FFD0D0] flex items-center justify-center mb-2">
                <Activity className="w-[16px] h-[16px] text-[#E53935]" />
              </div>
              <p className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">
                Conditions
              </p>
              <p className="text-[13px] font-[600] text-[#1B1B1B] leading-tight">
                {HEALTH_PROFILE.conditions.join(", ")}
              </p>
            </div>

            {/* Allergies */}
            <div className="bg-[#F6F8F7] p-3 rounded-[16px]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#FFF3E0] to-[#FFE8C0] flex items-center justify-center mb-2">
                <AlertTriangle className="w-[16px] h-[16px] text-[#FB8C00]" />
              </div>
              <p className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">
                Allergies
              </p>
              <p className="text-[13px] font-[600] text-[#1B1B1B] leading-tight">
                {HEALTH_PROFILE.allergies.join(", ")}
              </p>
            </div>

            {/* Goal */}
            <div className="bg-[#F6F8F7] p-3 rounded-[16px]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center mb-2">
                <Target className="w-[16px] h-[16px] text-[#2E7D32]" />
              </div>
              <p className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">
                Goal
              </p>
              <p className="text-[13px] font-[600] text-[#1B1B1B] leading-tight">
                {HEALTH_PROFILE.goal}
              </p>
            </div>

            {/* Diet */}
            <div className="bg-[#F6F8F7] p-3 rounded-[16px]">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2] flex items-center justify-center mb-2">
                <Leaf className="w-[16px] h-[16px] text-[#2EC4B6]" />
              </div>
              <p className="text-[10px] font-[700] text-[#999999] uppercase tracking-wider mb-0.5">
                Diet
              </p>
              <p className="text-[13px] font-[600] text-[#1B1B1B] leading-tight">
                {HEALTH_PROFILE.diet}
              </p>
            </div>
          </div>
        </div>

        {/* 6. Actions */}
        <div 
          className="space-y-4 pt-2 opacity-0 translate-y-4"
          style={{ 
            animation: mounted ? "fadeInUp 500ms ease-out forwards" : "none",
            animationDelay: "500ms"
          }}
        >
          <button className="w-full py-3.5 rounded-full border-2 border-[#2E7D32] bg-white flex items-center justify-center gap-2 transition-transform active:scale-95">
            <Edit className="w-4 h-4 text-[#2E7D32]" />
            <span className="text-[#2E7D32] text-[15px] font-[700]">Edit Health Profile</span>
          </button>

          <button className="w-full py-3 flex items-center justify-center gap-2 transition-opacity active:opacity-50">
            <LogOut className="w-4 h-4 text-[#E53935]" />
            <span className="text-[#E53935] text-[15px] font-[600]">Log Out</span>
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
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
