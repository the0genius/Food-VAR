import React, { useState } from "react";
import { 
  Settings, 
  ScanLine, 
  Gauge, 
  Calendar, 
  ShieldCheck, 
  Heart, 
  AlertTriangle, 
  Flag, 
  Leaf, 
  Trophy, 
  Flame, 
  UserCircle, 
  Lock, 
  FileText, 
  Download, 
  Moon, 
  Sun,
  LogOut,
  ChevronRight
} from "lucide-react";

export default function BentoProfile() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F7] max-w-[390px] mx-auto overflow-hidden flex flex-col font-sans relative">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#e8f5e9] to-[#F5F5F7] pointer-events-none" />

      {/* Header */}
      <div className="pt-[67px] px-5 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-[22px] font-bold text-[#1B1B1B]">Alex's Profile</h1>
        <button className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center text-[#1B1B1B] hover:bg-white/80 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4 relative z-10 no-scrollbar">
        
        {/* Identity Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-sm hover:scale-[0.98] transition-transform duration-150 cursor-pointer flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#2E7D32] to-[#3DD68C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#1B1B1B] truncate">Alex Johnson</h2>
            <p className="text-sm text-[#666666] truncate">alex@example.com</p>
            <p className="text-xs text-[#999999] mt-0.5">Age 28</p>
          </div>
          <div className="text-sm font-semibold text-[#2E7D32]">Edit</div>
        </div>

        {/* 3 Stat Tiles Row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] transition-transform duration-150 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#f0f9f0] text-[#2E7D32] flex items-center justify-center">
              <ScanLine size={16} />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#1B1B1B]">47</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999]">Total Scans</div>
            </div>
          </div>
          
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] transition-transform duration-150 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#e6f7f5] text-[#2EC4B6] flex items-center justify-center">
              <Gauge size={16} />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#2EC4B6]">72</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999]">Avg Score</div>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] transition-transform duration-150 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-[#666666] flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#1B1B1B]">12</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999]">This Week</div>
            </div>
          </div>
        </div>

        {/* Health Passport */}
        <div className="bg-white rounded-[24px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#2E7D32]" />
            <h3 className="font-semibold text-[#1B1B1B]">Health Passport</h3>
            <div className="w-2 h-2 rounded-full bg-[#3DD68C] ml-auto animate-pulse"></div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ffebee] text-[#E53935] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Heart size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] mb-0.5">Conditions</div>
                <div className="text-sm font-medium text-[#1B1B1B]">Diabetes (Type 2), Hypertension</div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full ml-11"></div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#fff3e0] text-[#FB8C00] flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] mb-0.5">Allergies</div>
                <div className="text-sm font-medium text-[#1B1B1B]">Gluten, Dairy</div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full ml-11"></div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e8f5e9] text-[#2E7D32] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Flag size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] mb-0.5">Goal</div>
                <div className="text-sm font-medium text-[#1B1B1B]">Lose Weight</div>
              </div>
            </div>
            <div className="h-[1px] bg-gray-100 w-full ml-11"></div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e0f2f1] text-[#2EC4B6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Leaf size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999999] mb-0.5">Diet</div>
                <div className="text-sm font-medium text-[#1B1B1B]">Vegetarian</div>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst side-by-side */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm hover:scale-[0.98] transition-transform duration-150">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-[#43A047]" />
              <h3 className="font-semibold text-[#1B1B1B] text-sm">Best Picks</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Greek Yogurt</span>
                <span className="text-xs font-bold text-white bg-[#43A047] px-2 py-0.5 rounded-full">82</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Quinoa Bowl</span>
                <span className="text-xs font-bold text-white bg-[#43A047] px-2 py-0.5 rounded-full">78</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Almond Milk</span>
                <span className="text-xs font-bold text-white bg-[#43A047] px-2 py-0.5 rounded-full">75</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 bg-white rounded-[20px] p-4 shadow-sm hover:scale-[0.98] transition-transform duration-150">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-[#E53935]" />
              <h3 className="font-semibold text-[#1B1B1B] text-sm">Avoid</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Soda</span>
                <span className="text-xs font-bold text-white bg-[#E53935] px-2 py-0.5 rounded-full">22</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Chips</span>
                <span className="text-xs font-bold text-white bg-[#E53935] px-2 py-0.5 rounded-full">31</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#666666] truncate pr-2">Candy Bar</span>
                <span className="text-xs font-bold text-white bg-[#E53935] px-2 py-0.5 rounded-full">18</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Rows */}
        <div className="space-y-3 pt-2">
          
          <div className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-[#2E7D32]">
            <div className="w-10 h-10 rounded-full bg-[#f0f9f0] text-[#2E7D32] flex items-center justify-center mr-3">
              <UserCircle size={20} />
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B]">Edit Health Profile</div>
            <ChevronRight size={20} className="text-[#999999]" />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-[#2EC4B6]">
            <div className="w-10 h-10 rounded-full bg-[#e6f7f5] text-[#2EC4B6] flex items-center justify-center mr-3">
              <Lock size={20} />
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B]">Privacy Policy</div>
            <ChevronRight size={20} className="text-[#999999]" />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-[#2EC4B6]">
            <div className="w-10 h-10 rounded-full bg-[#e6f7f5] text-[#2EC4B6] flex items-center justify-center mr-3">
              <FileText size={20} />
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B]">Terms of Service</div>
            <ChevronRight size={20} className="text-[#999999]" />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-blue-500">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
              <Download size={20} />
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B]">Export My Data</div>
            <ChevronRight size={20} className="text-[#999999]" />
          </div>

          <div 
            className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-purple-500"
            onClick={() => setDarkMode(!darkMode)}
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-3">
              {darkMode ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div className="flex-1 font-medium text-[#1B1B1B]">Dark Mode</div>
            <div className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors duration-300" style={{ backgroundColor: darkMode ? '#3DD68C' : '#E5E5EA' }}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm hover:scale-[0.98] active:scale-[0.97] transition-transform duration-150 cursor-pointer flex items-center border-l-4 border-[#E53935] mt-6">
            <div className="w-10 h-10 rounded-full bg-[#ffebee] text-[#E53935] flex items-center justify-center mr-3">
              <LogOut size={20} />
            </div>
            <div className="flex-1 font-medium text-[#E53935]">Log Out</div>
          </div>

        </div>

        <div className="h-6"></div> {/* Bottom spacing */}
      </div>
    </div>
  );
}
