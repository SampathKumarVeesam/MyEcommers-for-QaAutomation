import {
  AlertCircle,
  Check,
  ChevronDown,
  Gift,
  HelpCircle,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import React, { useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';

export const NewsletterSection: React.FC = () => {
  const { token, user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    alreadySubscribed: boolean;
    message: string;
    couponCode: string;
  } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // If user is Admin or Delivery Agent, this customer VIP section should not be displayed
  if (user && (user.role === 'admin' || (user as any).role === 'delivery_agent')) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl('/api/newsletter/subscribe'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: trimmed, source: 'storefront_footer' }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({
          success: true,
          alreadySubscribed: Boolean(data.alreadySubscribed),
          message: data.message || 'Subscribed successfully!',
          couponCode: data.couponCode || 'SPHERE20',
        });
      } else {
        setErrorMsg(data.message || 'Subscription failed. Please check your email and try again.');
      }
    } catch (err: any) {
      console.error('[Newsletter Subscribe UI Error]:', err);
      setErrorMsg('Unable to connect to newsletter service. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-5 sm:p-8 md:p-12 overflow-hidden shadow-xl border border-indigo-800">
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

          {result ? (
            <div
              data-test="newsletter-success-message"
              data-testid="newsletter-success-message"
              className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs max-w-md mx-auto text-center animate-in fade-in duration-300 space-y-1"
            >
              <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                {result.alreadySubscribed ? "You're Already a VIP Member!" : "You're on the VIP list!"}
              </p>
              <p className="text-[11px] text-emerald-300">
                {result.message}
              </p>
              <div className="pt-1.5">
                <span className="inline-block px-3 py-1 bg-white text-slate-900 font-mono font-bold text-xs rounded-lg shadow-xs">
                  Coupon: {result.couponCode || 'SPHERE20'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  data-test="newsletter-email-input"
                  data-testid="newsletter-email-input"
                  placeholder="Enter your email address..."
                  value={email}
                  disabled={loading}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 text-white placeholder-slate-400 text-xs rounded-xl border border-white/20 focus:border-white focus:bg-white/20 outline-none backdrop-blur-xs transition-all disabled:opacity-60"
                  required
                />
              </div>
              <button
                type="submit"
                data-test="newsletter-submit-button"
                data-testid="newsletter-submit-button"
                disabled={loading}
                className="px-6 py-3 bg-white hover:bg-slate-100 disabled:bg-slate-200 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {errorMsg && (
            <div
              data-test="newsletter-error-message"
              data-testid="newsletter-error-message"
              className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs max-w-md mx-auto flex items-center justify-center gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
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
              <div
                key={index}
                data-test={`faq-item-${index}`}
                data-testid={`faq-item-${index}`}
                className="py-3.5"
              >
                <button
                  type="button"
                  data-test={`faq-button-${index}`}
                  data-testid={`faq-button-${index}`}
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
                  <p
                    data-test={`faq-answer-${index}`}
                    data-testid={`faq-answer-${index}`}
                    className="mt-2 text-xs text-slate-600 leading-relaxed pr-6 animate-in fade-in duration-150"
                  >
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

