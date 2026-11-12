import {
  Check,
  ChevronDown,
  Gift,
  HelpCircle,
  Mail,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import React, { useState } from 'react';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;
    setSubscribed(true);
  };

  const faqs = [
    {
      q: 'How long does express shipping take?',
      a: 'Express delivery arrives within 1-2 business days with full real-time carrier tracking. Standard delivery takes 3-5 business days and is 100% free on all orders over $50.',
    },
    {
      q: 'What is the return and exchange policy?',
      a: 'We offer a 30-day no-questions-asked return policy. All returned products must be in their original packaging. Prepaid return shipping labels are provided automatically.',
    },
    {
      q: 'Are all smartphones and audio devices authentic and under warranty?',
      a: 'Yes, every product in our catalog is guaranteed 100% brand authentic with official manufacturer warranties (minimum 2 years warranty coverage on electronics and audio).',
    },
    {
      q: 'How do I apply promotional discount codes?',
      a: 'You can apply any valid coupon (e.g. SPHERE20 for 20% off or SUMMER50 for 50% off) directly inside your Cart slide-over drawer or on the Checkout confirmation screen.',
    },
  ];

  return (
    <div className="space-y-8 pt-6">
      {/* 1. VIP Club & Newsletter Box */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-12 overflow-hidden shadow-xl border border-indigo-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-bold border border-white/10">
            <Gift className="w-3.5 h-3.5 text-amber-300" />
            <span>Join 50,000+ VIP Members</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Unlock $15 Off Your Next Order
          </h3>

          <p className="text-xs sm:text-sm text-indigo-200/80 max-w-md mx-auto">
            Subscribe to receive insider drops, private flash sales, and early access to designer releases.
          </p>

          {subscribed ? (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs max-w-md mx-auto text-center animate-in fade-in duration-300">
              <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> You're on the VIP list!
              </p>
              <p className="mt-1 text-[11px] text-emerald-300">
                Use your exclusive coupon code <strong className="text-white underline font-mono">SPHERE20</strong> in your cart for 20% off.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 text-white placeholder-slate-400 text-xs rounded-xl border border-white/20 focus:border-white focus:bg-white/20 outline-none backdrop-blur-xs transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Subscribe</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-4 text-[11px] text-indigo-300/70 pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> No Spam, ever
            </span>
            <span>•</span>
            <span>Unsubscribe anytime</span>
          </div>
        </div>
      </div>

      {/* 2. Customer Frequently Asked Questions (FAQ) Accordion */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Customer Assistance</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500 mt-1">
            Everything you need to know about deliveries, returns, warranties, and orders.
          </p>
        </div>

        <div className="max-w-3xl mx-auto divide-y divide-slate-100">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed pr-6 animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

