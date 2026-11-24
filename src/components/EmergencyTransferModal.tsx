import React, { useEffect, useState } from 'react';
import { X, ArrowRightLeft, AlertTriangle, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NearestAgentInfo, Order } from '../types.js';
import { apiUrl } from '../config/api.js';

interface EmergencyTransferModalProps {
  isOpen: boolean;
  order: Order | null;
  token: string | null;
  onClose: () => void;
  onTransferSuccess: (newOrder: Order) => void;
}

const OBSTRUCTION_PRESETS = [
  'Vehicle breakdown / flat tire on delivery route',
  'Severe traffic gridlock / road closure in Hitech City',
  'Medical / personal emergency requiring handoff',
  'Severe weather / flash rain obstruction in zone',
];

export const EmergencyTransferModal: React.FC<EmergencyTransferModalProps> = ({
  isOpen,
  order,
  token,
  onClose,
  onTransferSuccess,
}) => {
  const [nearestAgent, setNearestAgent] = useState<NearestAgentInfo | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [agentFetchError, setAgentFetchError] = useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !order) {
      setReason('');
      setValidationError(null);
      setNearestAgent(null);
      setAgentFetchError(null);
      return;
    }

    const fetchNearest = async () => {
      setLoadingAgent(true);
      setAgentFetchError(null);
      try {
        const res = await fetch(apiUrl(`/api/orders/${order.orderNumber}/nearest-agent`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setNearestAgent(json.data);
        } else {
          setAgentFetchError(json.message || 'No nearby online delivery agents are currently available for transfer.');
        }
      } catch (err: any) {
        setAgentFetchError('Failed to query nearby agents. Please check network connectivity.');
      } finally {
        setLoadingAgent(false);
      }
    };

    fetchNearest();
  }, [isOpen, order, token]);

  if (!isOpen || !order) return null;

  const handleSelectPreset = (presetText: string) => {
    setReason(presetText);
    setValidationError(null);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 15) {
      setValidationError('Please enter a valid transfer reason of at least 15 characters describing the emergency or route obstruction.');
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const res = await fetch(apiUrl(`/api/orders/${order.orderNumber}/transfer`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          transferReason: trimmed,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onTransferSuccess(json.order);
        onClose();
      } else {
        setValidationError(json.message || 'Order transfer failed. Please try again.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Network error occurred during order transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2 text-amber-900">
            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Emergency Order Transfer</h3>
              <p className="text-[11px] text-amber-800">
                Handoff Order #{order.orderNumber} to nearest active agent
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmitTransfer} className="p-6 space-y-4">
          {/* Nearest Available Agent Preview Card */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Nearest Available Agent (Live Radar)
            </label>

            {loadingAgent ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 animate-pulse">
                Locating closest active delivery executive...
              </div>
            ) : nearestAgent ? (
              <div
                data-test="nearest-agent-card"
                data-testid="nearest-agent-card"
                className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {nearestAgent.avatarUrl ? (
                      <img
                        src={nearestAgent.avatarUrl}
                        alt={nearestAgent.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      nearestAgent.name[0]
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{nearestAgent.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        Online
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        nearestAgent.assignmentTier === 'IDLE_NEAREST'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {nearestAgent.assignmentTier === 'IDLE_NEAREST' ? 'Tier 1: Idle Nearest' : `Tier 2: Busy (${nearestAgent.activeOrderCount || 1} Active)`}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Vehicle: {nearestAgent.vehicleType || 'Motorcycle'} &bull; {nearestAgent.phone || '+91 98490 88776'}
                    </p>
                    {nearestAgent.statusText && (
                      <p className="text-[10px] text-indigo-700 font-medium">
                        Status: {nearestAgent.statusText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-indigo-700 block">
                    {nearestAgent.distanceFormatted}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Handoff ETA ~{nearestAgent.handoffEtaMinutes} min
                  </span>
                </div>
              </div>
            ) : (
              <div
                data-test="no-nearby-agent-alert"
                data-testid="no-nearby-agent-alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{agentFetchError || 'No nearby online delivery agents are currently available for transfer.'}</span>
              </div>
            )}
          </div>

          {/* Quick-Select Obstruction Preset Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Quick-Select Obstruction / Emergency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {OBSTRUCTION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-test={`transfer-preset-${idx}`}
                  data-testid={`transfer-preset-${idx}`}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl text-[11px] font-semibold text-left border transition-colors cursor-pointer ${
                    reason === preset
                      ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Reason Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Detailed Handoff Reason <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10px] font-mono ${
                  reason.trim().length >= 15 ? 'text-emerald-600 font-bold' : 'text-slate-400'
                }`}
              >
                {reason.trim().length} / 15 min chars
              </span>
            </div>
            <textarea
              required
              rows={3}
              data-test="input-transfer-reason"
              data-testid="input-transfer-reason"
              placeholder="Describe why you cannot complete this delivery (e.g., flat tire at Madhapur junction, severe traffic roadblock)..."
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-amber-500 focus:text-slate-900 transition-all font-medium text-slate-900 placeholder:text-slate-400"
            />
            {validationError && (
              <p
                data-test="transfer-validation-error"
                data-testid="transfer-validation-error"
                className="text-xs text-rose-600 font-semibold mt-1"
              >
                {validationError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !nearestAgent}
              data-test="btn-confirm-transfer"
              data-testid="btn-confirm-transfer"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{submitting ? 'Transferring Order...' : 'Confirm & Transfer Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
