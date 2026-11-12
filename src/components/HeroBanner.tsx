import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Headphones,
  Laptop,
  RotateCcw,
  Shield,
  Shirt,
  Sparkles,
  Truck,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface HeroBannerProps {
  onSelectCategory: (category: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSelectCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Flash Sale Countdown State (HH:MM:SS)
  const [timeLeft, setTimeLeft] = useState({
    hours: 8,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const slides = [
    {
      badge: 'Flagship Mobile Innovation',
      title: 'Apex Ultra Pro 5G & Nova Fold Z',
      subtitle: 'Snapdragon 8 Gen 3, 2K 120Hz LTPO AMOLED & 200MP Leica optics. Built for power users.',
      category: 'electronics',
      cta: 'Shop Smartphones',
      discount: 'UP TO $200 OFF',
      gradient: 'from-slate-950 via-slate-900 to-indigo-950',
      accentColor: 'text-sky-400',
      image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=1000&q=80',
    },
    {
      badge: 'Luxury Haute Couture',
      title: 'Summer Evening Silk & Velvet Dresses',
      subtitle: 'Artisanal Italian wool and French floral chiffon. Sizing from XS to XL with rich bespoke colorways.',
      category: 'fashion',
      cta: 'Explore Designer Dresses',
      discount: '40% OFF CODE SUMMER40',
      gradient: 'from-slate-950 via-purple-950 to-slate-900',
      accentColor: 'text-rose-400',
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80',
    },
    {
      badge: 'Audiophile Grade Sound',
      title: 'SonicWave Pro 48dB ANC Audio',
      subtitle: 'Coaxial dual drivers, LDAC 990kbps Hi-Res streaming and 60-hour marathon battery reserve.',
      category: 'audio',
      cta: 'Discover Hi-Fi Audio',
      discount: 'SPECIAL INTRO PRICE',
      gradient: 'from-slate-950 via-indigo-950 to-slate-900',
      accentColor: 'text-amber-400',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
    },
  ];

  // Auto rotate slides
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(s => (s + 1) % slides.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, [slides.length]);

  const activeSlide = slides[currentSlide];

  return (
    <div className="space-y-4">
      {/* 1. Main Hero Carousel */}
      <div className={`relative rounded-3xl bg-gradient-to-r ${activeSlide.gradient} text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl border border-slate-800 transition-all duration-700`}>
        {/* Ambient Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {activeSlide.badge}
              </span>
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-extrabold tracking-wider">
                {activeSlide.discount}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white font-sans">
              {activeSlide.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              {activeSlide.subtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onSelectCategory(activeSlide.category)}
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-white/10 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <span>{activeSlide.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onSelectCategory('all')}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
              >
                View Full Catalog
              </button>
            </div>
          </div>

          {/* Right Image Showcase */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-4/3 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
              <img
                src={activeSlide.image}
                alt={activeSlide.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Carousel Slide Indicators & Controls */}
        <div className="relative z-10 mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentSlide(s => (s - 1 + slides.length) % slides.length)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentSlide(s => (s + 1) % slides.length)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Trust Value Propositions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Free Express Delivery</h4>
            <p className="text-[11px] text-slate-500">On all orders over $50</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">30-Day Easy Returns</h4>
            <p className="text-[11px] text-slate-500">Hassle-free money back</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">2-Year Brand Warranty</h4>
            <p className="text-[11px] text-slate-500">100% authentic products</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">256-Bit SSL Checkout</h4>
            <p className="text-[11px] text-slate-500">Bank-grade security</p>
          </div>
        </div>
      </div>

      {/* 3. Flash Sale Countdown Banner Strip */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-3.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-200 animate-bounce" />
          <div>
            <span className="font-extrabold text-sm uppercase tracking-wider">Today's Flash Deals:</span>
            <span className="ml-2 text-xs font-medium text-amber-100 hidden sm:inline">
              Exclusive seasonal discounts on dresses, flagship phones &amp; accessories
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <Clock className="w-4 h-4 text-amber-200" />
          <span>Ends in:</span>
          <div className="flex items-center gap-1 font-mono font-extrabold text-slate-950">
            <span className="bg-white px-2 py-0.5 rounded-md shadow-2xs">
              {String(timeLeft.hours).padStart(2, '0')}h
            </span>
            <span>:</span>
            <span className="bg-white px-2 py-0.5 rounded-md shadow-2xs">
              {String(timeLeft.minutes).padStart(2, '0')}m
            </span>
            <span>:</span>
            <span className="bg-white px-2 py-0.5 rounded-md shadow-2xs">
              {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

