import React from 'react';
import { X, Share, ShieldCheck, Bot, CheckCircle2, AlertCircle } from 'lucide-react';

function NutritionRow({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-[15px]">
        <span className="text-[#555555] dark:text-[#A0A0A0]">{label}</span>
        <span className="font-medium text-[#1B1B1B] dark:text-[#E8E8E8]">{value}</span>
      </div>
      {progress > 0 && (
        <div className="w-full h-1.5 bg-[#F5F5F7] dark:bg-[#2C2C2C] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function BentoResult() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#121212] font-sans pb-10">
      <div className="max-w-[390px] mx-auto min-h-screen relative overflow-hidden flex flex-col pt-[67px]">

        <div className="flex items-center justify-between px-5 pb-4">
          <button className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1E1E] flex items-center justify-center shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform">
            <X size={20} className="text-[#1B1B1B] dark:text-[#E8E8E8]" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-[#1B1B1B] dark:text-[#E8E8E8] leading-tight">Greek Yogurt</h1>
            <p className="text-sm text-[#666666] dark:text-[#A0A0A0]">Fage · Dairy</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1E1E] flex items-center justify-center shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-[0.97] transition-transform">
            <Share size={18} className="text-[#1B1B1B] dark:text-[#E8E8E8]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-4" style={{ scrollbarWidth: 'none' }}>

          <div className="bg-gradient-to-b from-[#eafaf1] dark:from-[#1B3A1D] to-white dark:to-[#1E1E1E] rounded-[24px] p-6 shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-4">
              <svg width="200" height="200" viewBox="0 0 200 200" className="rotate-[-90deg]">
                <circle cx="100" cy="100" r="85" fill="none" stroke="#E8F5E9" className="dark:opacity-30" strokeWidth="12" />
                <circle cx="100" cy="100" r="85" fill="none" stroke="#2EC4B6" strokeWidth="12" strokeLinecap="round" strokeDasharray="534" strokeDashoffset="96" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="text-[56px] font-bold text-[#2EC4B6] dark:text-[#4DD0C8] leading-none tracking-tight">82</span>
                <span className="text-[13px] font-bold text-[#2EC4B6] dark:text-[#4DD0C8] tracking-widest mt-1">GOOD</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-[#1B1B1B] dark:text-[#E8E8E8] mb-1">Great pick for you</h2>
            <p className="text-[15px] text-[#666666] dark:text-[#A0A0A0]">Matches your high-protein goals.</p>
          </div>

          <div className="bg-[#E8F5E9] dark:bg-[#1B3A1D] border border-[#C8E6C9] dark:border-[#2E7D32]/30 rounded-full py-2.5 px-4 flex items-center justify-center gap-2 shadow-sm">
            <ShieldCheck size={18} className="text-[#2E7D32] dark:text-[#66BB6A]" />
            <span className="text-[14px] font-medium text-[#2E7D32] dark:text-[#66BB6A]">No allergens detected</span>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2EC4B6] dark:bg-[#4DD0C8]"></div>
            <div className="p-5 pl-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#E0F2F1] dark:bg-[#153D3A] flex items-center justify-center">
                  <Bot size={18} className="text-[#2EC4B6] dark:text-[#4DD0C8]" />
                </div>
                <h3 className="font-semibold text-[#1B1B1B] dark:text-[#E8E8E8]">AI Coach</h3>
              </div>
              <p className="text-[15px] text-[#444444] dark:text-[#B0B0B0] leading-relaxed mb-4">
                This Greek yogurt is an excellent choice for you. High in protein (15g), moderate sugar, and great for your weight loss goal. The probiotics support digestive health.
              </p>
              <div className="bg-[#F5F5F7] dark:bg-[#2C2C2C] rounded-xl p-3.5 flex gap-3">
                <span className="text-lg leading-none">💡</span>
                <p className="text-[14px] text-[#555555] dark:text-[#A0A0A0] leading-snug">
                  <strong className="text-[#1B1B1B] dark:text-[#E8E8E8] font-medium">Tip:</strong> Pair with fresh berries for added fiber and antioxidants.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5">
            <h3 className="font-bold text-[#1B1B1B] dark:text-[#E8E8E8] text-lg mb-4">Key Highlights</h3>
            <div className="flex flex-col gap-3.5">
              {[
                { icon: CheckCircle2, color: 'text-[#43A047] dark:text-[#66BB6A]', text: 'Good source of protein (15g)' },
                { icon: CheckCircle2, color: 'text-[#43A047] dark:text-[#66BB6A]', text: 'Low in calories (120 kcal)' },
                { icon: AlertCircle, color: 'text-[#FB8C00] dark:text-[#FFB74D]', text: 'Moderate sugar content (12g)' },
                { icon: CheckCircle2, color: 'text-[#43A047] dark:text-[#66BB6A]', text: 'Rich in calcium and probiotics' },
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5"><h.icon size={18} className={h.color} /></div>
                  <span className="text-[15px] text-[#333333] dark:text-[#D0D0D0]">{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] shadow-[0_4px_6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] p-5">
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="font-bold text-[#1B1B1B] dark:text-[#E8E8E8] text-lg">Nutrition Facts</h3>
              <span className="text-[13px] text-[#666666] dark:text-[#A0A0A0]">per serving (170g)</span>
            </div>
            <div className="flex flex-col gap-4">
              <NutritionRow label="Calories" value="120 kcal" progress={6} color="bg-gray-400 dark:bg-gray-500" />
              <NutritionRow label="Protein" value="15g" progress={30} color="bg-[#43A047]" />
              <NutritionRow label="Carbs" value="18g" progress={7} color="bg-gray-400 dark:bg-gray-500" />
              <NutritionRow label="Sugar" value="12g" progress={24} color="bg-[#FB8C00]" />
              <NutritionRow label="Fat" value="2g" progress={3} color="bg-gray-400 dark:bg-gray-500" />
              <NutritionRow label="Saturated Fat" value="1g" progress={5} color="bg-gray-400 dark:bg-gray-500" />
              <NutritionRow label="Fiber" value="0g" progress={0} color="bg-gray-400" />
              <NutritionRow label="Sodium" value="65mg" progress={3} color="bg-gray-400 dark:bg-gray-500" />
            </div>
          </div>

          <p className="text-center text-[12px] text-[#999999] dark:text-[#787878] px-4 mt-2 mb-2 leading-relaxed">
            This is not medical advice.<br />Always consult your healthcare provider.
          </p>
        </div>
      </div>
    </div>
  );
}
