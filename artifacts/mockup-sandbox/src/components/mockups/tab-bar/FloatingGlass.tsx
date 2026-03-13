import React, { useState } from "react";
import { Home, ScanBarcode, Clock, User } from "lucide-react";

export default function FloatingGlass() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex flex-col items-center w-full font-['Inter'] relative overflow-hidden">
      {/* Faded background content hint */}
      <div className="w-full max-w-[390px] h-full flex flex-col p-4 pt-12 gap-4 flex-1">
        <div className="w-1/3 h-8 bg-black/5 rounded-lg mb-4" />
        <div className="w-full h-40 bg-white rounded-2xl shadow-sm border border-black/[0.03] opacity-60" />
        <div className="w-full h-64 bg-white rounded-2xl shadow-sm border border-black/[0.03] opacity-40" />
        <div className="w-full h-32 bg-white rounded-2xl shadow-sm border border-black/[0.03] opacity-20" />
      </div>

      {/* Tab Bar Container */}
      <div className="absolute bottom-[30px] w-full max-w-[390px] px-[24px] pointer-events-none z-10 flex justify-center">
        {/* Glass Bar */}
        <div className="w-full h-[68px] rounded-[28px] bg-white/70 backdrop-blur-lg border border-white/20 flex flex-row items-center justify-between px-2 relative pointer-events-auto shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.08)]">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab("home")}
            className="flex-1 h-full flex flex-col items-center justify-center relative group"
          >
            <Home
              size={activeTab === "home" ? 24 : 22}
              className={`transition-all duration-300 ${
                activeTab === "home"
                  ? "text-[#2E7D32] opacity-100"
                  : "text-[#1B1B1B] opacity-50"
              }`}
              strokeWidth={activeTab === "home" ? 2.5 : 2}
            />
            {/* Active Dot */}
            <div
              className={`absolute bottom-2 w-1 h-1 rounded-full bg-[#2E7D32] transition-all duration-300 ${
                activeTab === "home"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-0"
              }`}
            />
          </button>

          {/* Separator */}
          <div className="w-[1px] h-6 bg-black/[0.05]" />

          {/* Tab 2: Scan (Center FAB) - Visual center offset since it's 4 items total */}
          <div className="flex-1 h-full flex items-center justify-center relative">
            <button
              onClick={() => setActiveTab("scan")}
              className="absolute -top-[14px] w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#3DD68C] to-[#2E7D32] flex items-center justify-center shadow-[0_6px_20px_rgba(61,214,140,0.4)] hover:scale-105 active:scale-95 transition-transform"
            >
              <ScanBarcode size={26} color="white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Separator */}
          <div className="w-[1px] h-6 bg-black/[0.05]" />

          {/* Tab 3: History */}
          <button
            onClick={() => setActiveTab("history")}
            className="flex-1 h-full flex flex-col items-center justify-center relative group"
          >
            <Clock
              size={activeTab === "history" ? 24 : 22}
              className={`transition-all duration-300 ${
                activeTab === "history"
                  ? "text-[#2E7D32] opacity-100"
                  : "text-[#1B1B1B] opacity-50"
              }`}
              strokeWidth={activeTab === "history" ? 2.5 : 2}
            />
            {/* Active Dot */}
            <div
              className={`absolute bottom-2 w-1 h-1 rounded-full bg-[#2E7D32] transition-all duration-300 ${
                activeTab === "history"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-0"
              }`}
            />
          </button>

          {/* Separator */}
          <div className="w-[1px] h-6 bg-black/[0.05]" />

          {/* Tab 4: Profile */}
          <button
            onClick={() => setActiveTab("profile")}
            className="flex-1 h-full flex flex-col items-center justify-center relative group"
          >
            <User
              size={activeTab === "profile" ? 24 : 22}
              className={`transition-all duration-300 ${
                activeTab === "profile"
                  ? "text-[#2E7D32] opacity-100"
                  : "text-[#1B1B1B] opacity-50"
              }`}
              strokeWidth={activeTab === "profile" ? 2.5 : 2}
            />
            {/* Active Dot */}
            <div
              className={`absolute bottom-2 w-1 h-1 rounded-full bg-[#2E7D32] transition-all duration-300 ${
                activeTab === "profile"
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
