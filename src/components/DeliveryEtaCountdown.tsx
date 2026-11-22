import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { OrderStatus, OrderTrackingInfo } from '../types.js';
import { apiUrl } from '../config/api.js';

interface DeliveryEtaCountdownProps {
  orderId: string | number;
  orderStatus: OrderStatus | string;
  initialProceededAt?: string | null;
  initialEstimatedDeliveryAt?: string | null;
  initialIsDelayed?: boolean;
  initialExtraDelaySeconds?: number;
  onTrackingUpdate?: (tracking: OrderTrackingInfo) => void;
  className?: string;
}

export const DeliveryEtaCountdown: React.FC<DeliveryEtaCountdownProps> = ({
  orderId,
  orderStatus,
  initialProceededAt,
  initialEstimatedDeliveryAt,
  initialIsDelayed = false,
  initialExtraDelaySeconds = 0,
  onTrackingUpdate,
  className = '',
}) => {
  const [tracking, setTracking] = useState<OrderTrackingInfo | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [elapsedDelaySeconds, setElapsedDelaySeconds] = useState<number>(0);

  const normStatus = String(orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
  const isOutForDelivery = normStatus === 'out_for_delivery' || normStatus === 'shipped';
  const isDelivered = normStatus === 'delivered' || normStatus === 'completed';

  const fetchTracking = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/tracking`));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const data: OrderTrackingInfo = json.data;
          setTracking(data);
          if (data.server_now) {
            const serverMs = new Date(data.server_now).getTime();
            const localMs = Date.now();
            setClockOffset(localMs - serverMs);
          }
          if (onTrackingUpdate) {
            onTrackingUpdate(data);
          }
        }
      }
    } catch {}
  };

  // Initial & periodic tracking sync every 6 seconds
  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 6000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Synchronized countdown ticker every 1000ms
  useEffect(() => {
    if (!isOutForDelivery) {
      setSecondsRemaining(null);
      return;
    }

    const estimatedDeliveryTime = tracking?.estimated_delivery_at || initialEstimatedDeliveryAt;
    if (!estimatedDeliveryTime) return;

    const timer = setInterval(() => {
      const synchronizedNow = Date.now() - clockOffset;
      const targetMs = new Date(estimatedDeliveryTime).getTime();
      const diffSec = Math.round((targetMs - synchronizedNow) / 1000);

      if (diffSec > 0 && !tracking?.is_delayed) {
        setSecondsRemaining(diffSec);
        setElapsedDelaySeconds(0);
      } else {
        setSecondsRemaining(0);
        const delaySec = Math.max(0, Math.round((synchronizedNow - targetMs) / 1000));
        setElapsedDelaySeconds(delaySec);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOutForDelivery, tracking?.estimated_delivery_at, tracking?.is_delayed, initialEstimatedDeliveryAt, clockOffset]);

  if (!isOutForDelivery && !isDelivered) {
    return null;
  }

  if (isDelivered) {
    return (
      <div className={`p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs ${className}`}>
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Package Delivered Successfully</span>
        </div>
        <span className="font-mono text-emerald-700 font-semibold text-[11px]">Hyderabad Hub Completed</span>
      </div>
    );
  }

  const effectiveDeliveryTime = tracking?.estimated_delivery_at || initialEstimatedDeliveryAt;
  const isDelayed = Boolean(tracking?.is_delayed || (secondsRemaining !== null && secondsRemaining <= 0));

  // Format HH:MM AM/PM
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  // Format MM:SS or HH:MM:SS
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Calculate revised ETA (original ETA + extra delay + 5 min traffic buffer)
  const calculateRevisedEta = () => {
    if (!effectiveDeliveryTime) return '--:--';
    try {
      const originalMs = new Date(effectiveDeliveryTime).getTime();
      const revisedMs = originalMs + (elapsedDelaySeconds + 300) * 1000;
      return new Date(revisedMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* On-Time Active Countdown State */}
      {!isDelayed && secondsRemaining !== null && secondsRemaining > 0 && (
        <div
          data-test="delivery-eta-card"
          data-testid="delivery-eta-card"
          className="p-3.5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl border border-indigo-500/40 shadow-xs flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Clock className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Synchronized Delivery ETA</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                Estimated Arrival:{' '}
                <strong className="text-white font-mono">{formatTime(effectiveDeliveryTime)}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-indigo-300 block">Live Countdown</span>
            <div
              data-test="eta-countdown-timer"
              data-testid="eta-countdown-timer"
              className="font-mono text-base sm:text-lg font-black tracking-wider text-emerald-400"
            >
              Arriving in {formatCountdown(secondsRemaining)}
            </div>
          </div>
        </div>
      )}

      {/* Automatic Delay Escalation Alert Banner with Dual Synchronized Timers */}
      {isDelayed && (
        <div
          data-test="order-delayed-banner"
          data-testid="order-delayed-banner"
          className="p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl text-amber-950 dark:text-amber-200 shadow-xs space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
              <div>
                <h4 className="text-xs font-extrabold text-amber-900 dark:text-amber-100 uppercase tracking-wider">
                  ⚠️ Delivery Delay Notice
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Rider encountered Hyderabad city traffic / route congestion. Revised ETA updated automatically.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500 text-white rounded-md shadow-xs shrink-0">
              Delayed
            </span>
          </div>

          {/* Dual Synchronized Timers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            {/* Timer 1: Updated Estimated Delivery Time */}
            <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-amber-300 dark:border-amber-600/40">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold block">
                Updated Estimated Delivery Time
              </span>
              <p
                data-test="revised-delivery-eta"
                data-testid="revised-delivery-eta"
                className="font-mono text-sm font-extrabold text-amber-950 dark:text-amber-200 mt-0.5"
              >
                {calculateRevisedEta()} <span className="text-[10px] font-normal text-slate-500">(+5m traffic buffer)</span>
              </p>
            </div>

            {/* Timer 2: Extra Delay Timer (Count-up) */}
            <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-amber-300 dark:border-amber-600/40">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold block">
                Extra Delay Elapsed
              </span>
              <p
                data-test="extra-delay-timer"
                data-testid="extra-delay-timer"
                className="font-mono text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-0.5"
              >
                Delayed by +{formatCountdown(elapsedDelaySeconds || tracking?.extra_delay_seconds || 1)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
