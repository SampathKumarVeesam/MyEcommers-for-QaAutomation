import {
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  PackageCheck,
  Star,
  ThumbsUp,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Order } from '../types.js';

export const FeedbackReminderModal: React.FC = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Poll for delivered orders needing feedback (checks every 60 seconds)
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setPendingOrders([]);
      setCurrentOrder(null);
      setIsOpen(false);
      return;
    }

    const checkPendingFeedback = async () => {
      try {
        const res = await fetch(apiUrl('/api/orders/pending-feedback'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setPendingOrders(json.data);
            setCurrentOrder(json.data[0]);
            setIsOpen(true);
          } else {
            setPendingOrders([]);
            setCurrentOrder(null);
            setIsOpen(false);
          }
        }
      } catch (err) {
        // Silent failure if network glitch
      }
    };

    // Initial check after 3 seconds
    const timer = setTimeout(checkPendingFeedback, 3000);
    // Recurring interval
    const interval = setInterval(checkPendingFeedback, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isAuthenticated, token]);

  if (!isOpen || !currentOrder) return null;

  const firstItem = currentOrder.items[0];

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl(`/api/orders/${currentOrder.orderNumber}/feedback`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || 'Great delivery and high-quality product!',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Thank you! Your verified customer review was published.');
        setTimeout(() => {
          setIsOpen(false);
          setCurrentOrder(null);
          setSuccessMsg(null);
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Failed to submit review');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSnooze = async () => {
    try {
      await fetch(apiUrl(`/api/orders/${currentOrder.orderNumber}/feedback/snooze`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    setIsOpen(false);
    setCurrentOrder(null);
  };

  const handleOptOut = async () => {
    try {
      await fetch(apiUrl(`/api/orders/${currentOrder.orderNumber}/feedback/opt-out`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    setIsOpen(false);
    setCurrentOrder(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-test="feedback-reminder-modal"
        data-testid="feedback-reminder-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                How Was Your Order?
              </h3>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-bold text-indigo-600">#{currentOrder.orderNumber}</span> Delivered
              </p>
            </div>
          </div>
          <button
            onClick={handleSnooze}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Remind me later"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitFeedback} className="p-4 sm:p-6 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Delivered Item Highlight */}
          {firstItem && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <img
                src={firstItem.product.images[0]}
                alt={firstItem.product.title}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-xs truncate">{firstItem.product.title}</p>
                <p className="text-[11px] text-slate-500">
                  {currentOrder.items.length > 1
                    ? `and ${currentOrder.items.length - 1} more item(s)`
                    : `$${firstItem.unitPrice.toFixed(2)}`}
                </p>
              </div>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="text-center py-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Your Overall Experience
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    data-test={`star-rating-${star}`}
                    data-testid={`star-rating-${star}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-300 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-extrabold text-amber-600 mt-1">
              {rating === 5
                ? 'Excellent - 5 Stars'
                : rating === 4
                ? 'Very Good - 4 Stars'
                : rating === 3
                ? 'Average - 3 Stars'
                : rating === 2
                ? 'Poor - 2 Stars'
                : 'Very Poor - 1 Star'}
            </p>
          </div>

          {/* Review Comment Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Share Your Feedback (Optional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell others what you loved about this product or delivery experience..."
              data-test="textarea-feedback-comment"
              data-testid="textarea-feedback-comment"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white focus:text-slate-900 resize-none"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            data-test="btn-submit-feedback"
            data-testid="btn-submit-feedback"
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{submitting ? 'Submitting Review...' : 'Submit Verified Review'}</span>
          </button>

          {/* Snooze & Opt-Out Controls */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={handleSnooze}
              data-test="btn-snooze-feedback"
              data-testid="btn-snooze-feedback"
              className="hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Remind Me Later (1h)</span>
            </button>
            <button
              type="button"
              onClick={handleOptOut}
              data-test="btn-opt-out-feedback"
              data-testid="btn-opt-out-feedback"
              className="hover:text-rose-600 font-semibold cursor-pointer transition-colors"
            >
              Don't ask again for this order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
