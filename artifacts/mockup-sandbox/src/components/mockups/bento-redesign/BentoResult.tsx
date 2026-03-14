import React from 'react';
import { X, Share, ShieldCheck, Bot, CheckCircle2, AlertCircle } from 'lucide-react';

export const BentoResult = () => {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1B1B1B] font-sans pb-10">
      {/* Container simulating mobile device max width */}
      <div className="max-w-[390px] mx-auto bg-[#F5F5F7] min-h-screen relative overflow-hidden flex flex-col pt-[67px]">
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pb-4">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <X size={20} className="text-[#1B1B1B]" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-bold leading-tight">Greek Yogurt</h1>
            <p className="text-sm text-[#666666]">Fage · Dairy</p>
          </div>
          
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Share size={18} className="text-[#1B1B1B]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-4">
          
          {/* Score Hero Card */}
          <div className="bg-gradient-to-b from-[#eafaf1] to-white rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            {/* Subtle glow background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#2EC4B6] opacity-5 rounded-full blur-2xl"></div>
            
            <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-4">
              <svg width="200" height="200" viewBox="0 0 200 200" className="rotate-[-90deg]">
                <circle 
                  cx="100" cy="100" r="85" 
                  fill="none" 
                  stroke="#E8F5E9" 
                  strokeWidth="12" 
                />
                <circle 
                  cx="100" cy="100" r="85" 
                  fill="none" 
                  stroke="#2EC4B6" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  strokeDasharray="534"
                  strokeDashoffset="96" 
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                <span className="text-[56px] font-bold text-[#2EC4B6] leading-none tracking-tight">82</span>
                <span className="text-[13px] font-bold text-[#2EC4B6] tracking-widest mt-1">GOOD</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-[#1B1B1B] mb-1">Great pick for you</h2>
            <p className="text-[15px] text-[#666666]">Matches your high-protein goals.</p>
          </div>

          {/* Allergen Chip */}
          <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-full py-2.5 px-4 flex items-center justify-center gap-2 shadow-sm">
            <ShieldCheck size={18} className="text-[#2E7D32]" />
            <span className="text-[14px] font-medium text-[#2E7D32]">No allergens detected</span>
          </div>

          {/* AI Advice Card */}
          <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2EC4B6]"></div>
            <div className="p-5 pl-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#E0F2F1] flex items-center justify-center">
                  <Bot size={18} className="text-[#2EC4B6]" />
                </div>
                <h3 className="font-semibold text-[#1B1B1B]">AI Coach</h3>
              </div>
              <p className="text-[15px] text-[#444444] leading-relaxed mb-4">
                This Greek yogurt is an excellent choice for you. High in protein (15g), moderate sugar, and great for your weight loss goal. The probiotics support digestive health.
              </p>
              <div className="bg-[#F5F5F7] rounded-xl p-3.5 flex gap-3">
                <span className="text-lg leading-none">💡</span>
                <p className="text-[14px] text-[#555555] leading-snug">
                  <strong className="text-[#1B1B1B] font-medium">Tip:</strong> Pair with fresh berries for added fiber and antioxidants.
                </p>
              </div>
            </div>
          </div>

          {/* Highlights Card */}
          <div className="bg-white rounded-[24px] shadow-sm p-5">
            <h3 className="font-bold text-[#1B1B1B] text-lg mb-4">Key Highlights</h3>
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 size={18} className="text-[#43A047]" /></div>
                <span className="text-[15px] text-[#333333]">Good source of protein (15g)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 size={18} className="text-[#43A047]" /></div>
                <span className="text-[15px] text-[#333333]">Low in calories (120 kcal)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><AlertCircle size={18} className="text-[#FB8C00]" /></div>
                <span className="text-[15px] text-[#333333]">Moderate sugar content (12g)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><CheckCircle2 size={18} className="text-[#43A047]" /></div>
                <span className="text-[15px] text-[#333333]">Rich in calcium and probiotics</span>
              </div>
            </div>
          </div>

          {/* Nutrition Facts */}
          <div className="bg-white rounded-[24px] shadow-sm p-5">
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="font-bold text-[#1B1B1B] text-lg">Nutrition Facts</h3>
              <span className="text-[13px] text-[#666666]">per serving (170g)</span>
            </div>
            
            <div className="flex flex-col gap-4">
              <NutritionRow label="Calories" value="120 kcal" progress={20} color="bg-[#E0E0E0]" />
              <NutritionRow label="Protein" value="15g" progress={30} color="bg-[#43A047]" />
              <NutritionRow label="Carbs" value="18g" progress={15} color="bg-[#E0E0E0]" />
              <NutritionRow label="Sugar" value="12g" progress={45} color="bg-[#FB8C00]" />
              <NutritionRow label="Fat" value="2g" progress={5} color="bg-[#E0E0E0]" />
              <NutritionRow label="Saturated Fat" value="1g" progress={8} color="bg-[#E0E0E0]" />
              <NutritionRow label="Fiber" value="0g" progress={0} color="bg-[#E0E0E0]" />
              <NutritionRow label="Sodium" value="65mg" progress={10} color="bg-[#E0E0E0]" />
            </div>
          </div>

          {/* Medical disclaimer */}
          <p className="text-center text-[12px] text-[#999999] px-4 mt-2 mb-2 leading-relaxed">
            This is not medical advice.<br/>Always consult your healthcare provider.
          </p>
        </div>
      </div>
    </div>
  );
};

function NutritionRow({ label, value, progress, color }: { label: string, value: string, progress: number, color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-[15px]">
        <span className="text-[#555555]">{label}</span>
        <span className="font-medium text-[#1B1B1B]">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color}`} 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
}
