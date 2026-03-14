import React from "react";
import {
  Settings, ScanLine, Gauge, Calendar, ShieldCheck, Heart, AlertTriangle,
  Flag, Leaf, Trophy, Flame, UserCircle, Lock, FileText, Download, Moon,
  Sun, LogOut, ChevronRight
} from "lucide-react";

export function BentoProfile() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121212] max-w-[390px] mx-auto overflow-hidden flex flex-col font-sans relative">
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#e8f5e9] dark:from-[#1B3A1D] to-[#F5F5F7] dark:to-[#121212] pointer-events-none" />

      <div className="pt-[67px] px-5 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-[22px] font-bold text-[#1B1B1B] dark:text-[#E8E8E8]">Alex's Profile</h1>
        <button className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-[#1B1B1B] dark:text-[#E8E8E8]">
          <Settings size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4 relative z-10" style={{ scrollbarWidth: 'none' }}>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] p-5 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#2E7D32] to-[#3DD68C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">A</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#1B1B1B] dark:text-[#E8E8E8] truncate">Alex Johnson</h2>
            <p className="text-sm text-[#666666] dark:text-[#A0A0A0] truncate">alex@example.com</p>
            <p className="text-xs text-[#999999] dark:text-[#787878] mt-0.5">Age 28</p>
          </div>
          <div className="text-sm font-semibold text-[#2E7D32] dark:text-[#66BB6A]">Edit</div>
        </div>

        <div className="flex gap-3">
          {[
            { icon: ScanLine, value: '47', label: 'Total Scans', iconBg: 'bg-[#f0f9f0] dark:bg-[#1B3A1D]', iconColor: 'text-[#2E7D32] dark:text-[#66BB6A]', valueColor: 'text-[#1B1B1B] dark:text-[#E8E8E8]' },
            { icon: Gauge, value: '72', label: 'Avg Score', iconBg: 'bg-[#e6f7f5] dark:bg-[#153D3A]', iconColor: 'text-[#2EC4B6] dark:text-[#4DD0C8]', valueColor: 'text-[#2EC4B6] dark:text-[#4DD0C8]' },
            { icon: Calendar, value: '12', label: 'This Week', iconBg: 'bg-gray-100 dark:bg-[#2C2C2C]', iconColor: 'text-[#666666] dark:text-[#A0A0A0]', valueColor: 'text-[#1B1B1B] dark:text-[#E8E8E8]' },
          ].map((stat, i) => (
            <div key={i} className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 flex flex-col items-center justify-center gap-2">
              <div className={`w-8 h-8 rounded-full ${stat.iconBg} ${stat.iconColor} flex items-center justify-center`}>
                <stat.icon size={16} />
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${stat.valueColor}`}>{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] dark:text-[#787878]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#2E7D32] dark:text-[#66BB6A]" />
            <h3 className="font-semibold text-[#1B1B1B] dark:text-[#E8E8E8]">Health Passport</h3>
            <div className="w-2 h-2 rounded-full bg-[#3DD68C] ml-auto animate-pulse"></div>
          </div>
          <div className="p-4 space-y-4">
            {[
              { icon: Heart, iconBg: 'bg-[#ffebee] dark:bg-[#3D1515]', iconColor: 'text-[#E53935] dark:text-[#EF5350]', label: 'Conditions', value: 'Diabetes (Type 2), Hypertension' },
              { icon: AlertTriangle, iconBg: 'bg-[#fff3e0] dark:bg-[#3D2E15]', iconColor: 'text-[#FB8C00] dark:text-[#FFB74D]', label: 'Allergies', value: 'Gluten, Dairy' },
              { icon: Flag, iconBg: 'bg-[#e8f5e9] dark:bg-[#1B3A1D]', iconColor: 'text-[#2E7D32] dark:text-[#66BB6A]', label: 'Goal', value: 'Lose Weight' },
              { icon: Leaf, iconBg: 'bg-[#e0f2f1] dark:bg-[#153D3A]', iconColor: 'text-[#2EC4B6] dark:text-[#4DD0C8]', label: 'Diet', value: 'Vegetarian' },
            ].map((row, i) => (
              <React.Fragment key={i}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${row.iconBg} ${row.iconColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <row.icon size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] dark:text-[#787878] mb-0.5">{row.label}</div>
                    <div className="text-sm font-medium text-[#1B1B1B] dark:text-[#E8E8E8]">{row.value}</div>
                  </div>
                </div>
                {i < 3 && <div className="h-[1px] bg-gray-100 dark:bg-white/5 w-full ml-11"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-[20px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-[#43A047] dark:text-[#66BB6A]" />
              <h3 className="font-semibold text-[#1B1B1B] dark:text-[#E8E8E8] text-sm">Best Picks</h3>
            </div>
            <div className="space-y-3">
              {[{ name: 'Greek Yogurt', score: 82 }, { name: 'Quinoa Bowl', score: 78 }, { name: 'Almond Milk', score: 75 }].map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-[#666666] dark:text-[#A0A0A0] truncate pr-2">{p.name}</span>
                  <span className="text-xs font-bold text-white bg-[#43A047] px-2 py-0.5 rounded-full">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-[20px] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-[#E53935] dark:text-[#EF5350]" />
              <h3 className="font-semibold text-[#1B1B1B] dark:text-[#E8E8E8] text-sm">Avoid</h3>
            </div>
            <div className="space-y-3">
              {[{ name: 'Soda', score: 22 }, { name: 'Chips', score: 31 }, { name: 'Candy Bar', score: 18 }].map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-[#666666] dark:text-[#A0A0A0] truncate pr-2">{p.name}</span>
                  <span className="text-xs font-bold text-white bg-[#E53935] px-2 py-0.5 rounded-full">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { icon: UserCircle, label: 'Edit Health Profile', borderColor: 'border-[#2E7D32]', iconBg: 'bg-[#f0f9f0] dark:bg-[#1B3A1D]', iconColor: 'text-[#2E7D32] dark:text-[#66BB6A]' },
            { icon: Lock, label: 'Privacy Policy', borderColor: 'border-[#2EC4B6]', iconBg: 'bg-[#e6f7f5] dark:bg-[#153D3A]', iconColor: 'text-[#2EC4B6] dark:text-[#4DD0C8]' },
            { icon: FileText, label: 'Terms of Service', borderColor: 'border-[#2EC4B6]', iconBg: 'bg-[#e6f7f5] dark:bg-[#153D3A]', iconColor: 'text-[#2EC4B6] dark:text-[#4DD0C8]' },
            { icon: Download, label: 'Export My Data', borderColor: 'border-blue-500', iconBg: 'bg-blue-50 dark:bg-[#152A3D]', iconColor: 'text-blue-500 dark:text-[#64B5F6]' },
          ].map((action, i) => (
            <div key={i} className={`bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 ${action.borderColor}`}>
              <div className={`w-10 h-10 rounded-full ${action.iconBg} ${action.iconColor} flex items-center justify-center mr-3`}>
                <action.icon size={20} />
              </div>
              <div className="flex-1 font-medium text-[#1B1B1B] dark:text-[#E8E8E8]">{action.label}</div>
              <ChevronRight size={20} className="text-[#999999] dark:text-[#787878]" />
            </div>
          ))}

          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-purple-500">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400 flex items-center justify-center mr-3">
              <Sun size={20} />
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B] dark:text-[#E8E8E8]">Dark Mode</div>
            <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative">
              <div className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full"></div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-[#E53935] mt-6">
            <div className="w-10 h-10 rounded-full bg-[#ffebee] dark:bg-[#3D1515] text-[#E53935] dark:text-[#EF5350] flex items-center justify-center mr-3">
              <LogOut size={20} />
            </div>
            <div className="flex-1 font-medium text-[#E53935] dark:text-[#EF5350]">Log Out</div>
          </div>
        </div>

        <div className="h-6"></div>
      </div>
    </div>
  );
}
