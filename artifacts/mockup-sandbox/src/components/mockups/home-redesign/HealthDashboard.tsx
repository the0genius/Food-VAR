import React, { useState, useEffect } from 'react';
import { Bell, Search, Activity, Droplet, Flame, ArrowUpRight, TrendingUp, CalendarDays, History, Crown, Info, ScanLine, ScanFace, QrCode } from 'lucide-react';

// Design Tokens (mapped to Tailwind arbitrary values)
const tokens = {
  primaryGreen: '#2E7D32',
  mintGreen: '#3DD68C',
  teal: '#2EC4B6',
  background: '#F6F8F7',
  card: '#FFFFFF',
  tinted: '#E8F5E9',
  text: '#1B1B1B',
  muted: '#666666',
  placeholder: '#999999',
  border: 'rgba(0,0,0,0.07)',
  danger: '#E53935',
  dangerBg: '#FFEBEE',
  amber: '#FB8C00',
  amberBg: '#FFF3E0',
  green: '#43A047',
  greenBg: '#E8F5E9',
  tealScore: '#2EC4B6',
  tealBg: '#E0F7FA',
};

// Helper to determine score color
const getScoreColors = (score: number) => {
  if (score >= 70) return { text: tokens.primaryGreen, bg: tokens.greenBg, icon: tokens.mintGreen };
  if (score >= 40) return { text: tokens.amber, bg: tokens.amberBg, icon: tokens.amber };
  return { text: tokens.danger, bg: tokens.dangerBg, icon: tokens.danger };
};

export function HealthDashboard() {
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else if (hour >= 17) setGreeting('Good Evening');
  }, []);

  const userData = {
    name: 'Amr',
    scansToday: 3,
    scansTotal: 10,
    avgScore: 72,
    weekTrend: '+4',
    streakDays: 12
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
    <div 
      className="min-h-screen pb-24 font-['Inter'] relative w-full max-w-[390px] mx-auto overflow-hidden"
      style={{ backgroundColor: tokens.background, color: tokens.text }}
    >
      {/* Header - Clinical, clean white */}
      <header className="px-5 pt-14 pb-4 sticky top-0 z-20 backdrop-blur-xl bg-white/80" style={{ borderBottom: `1px solid ${tokens.border}`}}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg" style={{ backgroundColor: tokens.mintGreen, color: '#fff' }}>
              A
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: tokens.muted }}>{greeting},</p>
              <h1 className="text-base font-bold tracking-tight">{userData.name}</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm" style={{ border: `1px solid ${tokens.border}`}}>
            <Bell size={18} color={tokens.text} />
          </button>
        </div>
      </header>

      <main className="px-5 py-6 space-y-8">
        
        {/* Hero Circular Gauge */}
        <section className="flex flex-col items-center justify-center pt-2 pb-6 relative">
          <div className="relative w-56 h-56 flex flex-col items-center justify-center">
            {/* SVG Gauge */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background track */}
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke={tokens.tinted} 
                strokeWidth="8" 
                strokeLinecap="round" 
              />
              {/* Progress */}
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="url(#gradient)" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeDasharray="282.7" 
                strokeDashoffset={282.7 - (282.7 * userData.avgScore) / 100}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={tokens.mintGreen} />
                  <stop offset="100%" stopColor={tokens.teal} />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute flex flex-col items-center justify-center text-center mt-2">
              <span className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: tokens.muted }}>Avg Score</span>
              <span className="text-6xl font-black tabular-nums tracking-tighter" style={{ color: tokens.primaryGreen }}>{userData.avgScore}</span>
              <span className="text-xs font-medium mt-1 px-3 py-1 rounded-full" style={{ backgroundColor: tokens.tinted, color: tokens.primaryGreen }}>
                Top 15%
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center px-4">
            <p className="text-sm font-medium leading-relaxed" style={{ color: tokens.muted }}>
              <span className="inline-block mr-1">💡</span> 
              Your choices are looking great! Keep making smart picks.
            </p>
          </div>
        </section>

        {/* 2x2 Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 flex flex-col justify-between h-28" style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}>
            <div className="flex justify-between items-start">
              <ScanLine size={16} color={tokens.teal} />
              <span className="text-xs font-medium" style={{ color: tokens.muted }}>Today</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{userData.scansToday}</span>
                <span className="text-sm font-medium" style={{ color: tokens.muted }}>/ {userData.scansTotal}</span>
              </div>
              <p className="text-[11px] font-medium mt-1" style={{ color: tokens.muted }}>Scans</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col justify-between h-28" style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}>
            <div className="flex justify-between items-start">
              <TrendingUp size={16} color={tokens.mintGreen} />
              <span className="text-xs font-medium" style={{ color: tokens.muted }}>Weekly</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{userData.weekTrend}</span>
                <span className="text-sm font-medium" style={{ color: tokens.muted }}>pts</span>
              </div>
              <p className="text-[11px] font-medium mt-1" style={{ color: tokens.muted }}>Score Trend</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col justify-between h-28" style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}>
            <div className="flex justify-between items-start">
              <Flame size={16} color={tokens.amber} />
              <span className="text-xs font-medium" style={{ color: tokens.muted }}>Active</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">{userData.streakDays}</span>
                <span className="text-sm font-medium" style={{ color: tokens.muted }}>days</span>
              </div>
              <p className="text-[11px] font-medium mt-1" style={{ color: tokens.muted }}>Current Streak</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col justify-between h-28 relative overflow-hidden" style={{ backgroundColor: tokens.primaryGreen, color: '#fff' }}>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Crown size={80} />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <Activity size={16} color="#fff" />
              <span className="text-xs font-medium opacity-80">Goal</span>
            </div>
            <div className="relative z-10">
              <span className="text-3xl font-bold tracking-tight">80</span>
              <p className="text-[11px] font-medium mt-1 opacity-80">Target Score</p>
            </div>
          </div>
        </section>

        {/* Recent Scans (Horizontal) */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold tracking-tight">Recent Scans</h2>
            <button className="text-xs font-semibold flex items-center gap-1" style={{ color: tokens.primaryGreen }}>
              See All <ArrowUpRight size={14} />
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x -mx-5 px-5 hide-scrollbar">
            {recentScans.map((scan, i) => {
              const colors = getScoreColors(scan.score);
              return (
                <div 
                  key={i} 
                  className="snap-start shrink-0 w-36 rounded-2xl p-4 flex flex-col justify-between"
                  style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.background }}>
                      <History size={14} style={{ color: tokens.muted }} />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.icon }}></div>
                      {scan.score}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm leading-tight mb-1 truncate">{scan.name}</h3>
                    <p className="text-[11px] font-medium truncate" style={{ color: tokens.muted }}>{scan.brand}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Popular Products (Vertical List) */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold tracking-tight">Trending Health Picks</h2>
          </div>
          
          <div className="space-y-3">
            {popularProducts.map((product, i) => (
              <div 
                key={i} 
                className="flex items-center gap-4 p-3 rounded-2xl"
                style={{ backgroundColor: tokens.card, border: `1px solid ${tokens.border}` }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tokens.tinted }}>
                  <Droplet size={20} color={tokens.primaryGreen} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate mb-0.5">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium truncate" style={{ color: tokens.muted }}>{product.brand}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <p className="text-xs font-medium" style={{ color: tokens.muted }}>{product.calories} kcal</p>
                  </div>
                </div>
                
                <button className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: tokens.background }}>
                  <ArrowUpRight size={16} color={tokens.text} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Contribute CTA */}
        <section className="mt-8">
          <div className="rounded-2xl p-5 flex items-center justify-between" style={{ backgroundColor: tokens.background, border: `1px dashed ${tokens.placeholder}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm">
                <Search size={18} color={tokens.teal} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Missing a product?</h4>
                <p className="text-xs mt-0.5" style={{ color: tokens.muted }}>Help expand our database</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: tokens.text }}>
              Contribute
            </button>
          </div>
        </section>

      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button 
          className="flex items-center gap-2 px-6 py-4 rounded-full shadow-xl shadow-black/10 transform transition-transform active:scale-95"
          style={{ backgroundColor: tokens.text, color: '#fff' }}
        >
          <QrCode size={20} />
          <span className="font-bold text-sm">Scan Product</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export default HealthDashboard;
