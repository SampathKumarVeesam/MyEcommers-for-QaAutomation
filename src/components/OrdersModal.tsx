import {
  AlertTriangle,
  ArrowRightLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  MapPin,
  Package,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserCheck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Order } from '../types.js';
import { apiUrl } from '../config/api.js';
import { LiveOrderMap } from './LiveOrderMap.js';
import { DeliveryEtaCountdown } from './DeliveryEtaCountdown.js';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizeOrderStatus = (raw?: string): string => {
  if (!raw) return 'processing';
  return String(raw).toLowerCase().trim().replace(/[\s-]+/g, '_');
};

const getTimelineStepIndex = (status?: string): number => {
  const norm = normalizeOrderStatus(status);
  switch (norm) {
    case 'cancelled':
    case 'canceled':
      return -1;
    case 'pending':
    case 'processing':
    case 'placed':
      return 1;
    case 'processed':
    case 'shipped':
    case 'dispatched':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
    case 'completed':
      return 4;
    default:
      return 1;
  }
};

const getStatusBadgeStyle = (status?: string) => {
  const norm = normalizeOrderStatus(status);
  switch (norm) {
    case 'delivered':
    case 'completed':
      return { label: 'DELIVERED', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'out_for_delivery':
      return { label: 'OUT_FOR_DELIVERY', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'processed':
    case 'shipped':
    case 'dispatched':
      return { label: 'PROCESSED', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'cancelled':
    case 'canceled':
      return { label: 'CANCELLED', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
    default:
      return { label: 'PROCESSING', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
  }
};

const TIMELINE_STAGES = [
  { step: 1, label: 'Processing', desc: 'Order Placed & Confirmed' },
  { step: 2, label: 'Processed', desc: 'Packed & Dispatched' },
  { step: 3, label: 'Out for Delivery', desc: 'With Courier Agent' },
  { step: 4, label: 'Delivered', desc: 'Package Handed Over' },
];

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidSuccessMsg, setPaidSuccessMsg] = useState<string | null>(null);

  const handleMarkPaidToDeliveryBoy = async (orderId: string) => {
    if (!token) return;
    setMarkingPaid(true);
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/paid-to-delivery-boy`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPaidSuccessMsg('Payment marked as paid to delivery boy! Admin has been notified for verification.');
        setTimeout(() => setPaidSuccessMsg(null), 6000);
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            paymentStatus: 'paid_to_delivery_agent',
          });
        }
        await fetchOrders();
      } else {
        alert(json.message || 'Failed to update payment status');
      }
    } catch (err: any) {
      console.error('Error marking paid to delivery boy:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  const fetchOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/orders'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(json.data);
          if (json.data.length > 0 && !selectedOrder) {
            setSelectedOrder(json.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div
      data-test="orders-modal"
      data-testid="orders-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Order History &amp; Invoices</h2>
              <p className="text-xs text-slate-500">Track and review past e-commerce purchases</p>
            </div>
          </div>

          <button
            data-test="orders-close-button"
            data-testid="orders-close-button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div data-test="orders-loading" data-testid="orders-loading" className="py-20 text-center">
              <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-slate-500 mt-2 font-medium">Fetching order records...</p>
            </div>
          ) : orders.length === 0 ? (
            <div data-test="orders-empty-message" data-testid="orders-empty-message" className="py-20 text-center text-slate-400">
              <Package className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No orders placed yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add products from the catalog to your basket and complete the checkout to view orders and invoices here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Order List Column */}
              <div data-test="orders-list" data-testid="orders-list" className="md:col-span-1 space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {orders.map(o => (
                  <div
                    key={o.id}
                    data-test={`order-card-${o.orderNumber}`}
                    data-testid={`order-card-${o.orderNumber}`}
                    onClick={() => setSelectedOrder(o)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedOrder?.id === o.id
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-indigo-700">{o.orderNumber}</span>
                      <span
                        data-test={`order-card-status-${o.orderNumber}`}
                        data-testid={`order-card-status-${o.orderNumber}`}
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getStatusBadgeStyle(o.orderStatus).bg}`}
                      >
                        {o.orderStatus}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-slate-600">{o.items.length} items</span>
                      <span className="font-bold text-slate-900">₹{o.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Detail & Invoice Card */}
              {selectedOrder && (
                <div data-test="selected-order-details" data-testid="selected-order-details" className="md:col-span-2 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Invoice &amp; Receipt for:</span>
                        <span
                          data-test="order-detail-status-badge"
                          data-testid="order-detail-status-badge"
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(selectedOrder.orderStatus).bg}`}
                        >
                          {selectedOrder.orderStatus}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 font-mono">
                        {selectedOrder.orderNumber}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Tracking Number</span>
                      <p data-test="order-detail-tracking-number" data-testid="order-detail-tracking-number" className="font-mono text-xs font-bold text-indigo-700">
                        {selectedOrder.trackingNumber}
                      </p>
                    </div>
                  </div>

                  {/* Shipment Tracking Timeline */}
                  {(() => {
                    const normStatus = normalizeOrderStatus(selectedOrder.orderStatus);
                    const currentStep = getTimelineStepIndex(selectedOrder.orderStatus);

                    if (currentStep === -1 || normStatus === 'cancelled') {
                      return (
                        <div
                          data-test="order-cancelled-banner"
                          data-testid="order-cancelled-banner"
                          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800"
                        >
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-xs">Order Cancelled</p>
                            <p className="text-[11px] text-rose-600 mt-0.5">
                              This shipment was cancelled and will not be dispatched or delivered.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        data-test="shipment-timeline"
                        data-testid="shipment-timeline"
                        className="p-3.5 bg-white rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Shipment Status &amp; Timeline:</span>
                          </p>
                          <span
                            data-test="timeline-active-stage-label"
                            data-testid="timeline-active-stage-label"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(selectedOrder.orderStatus).bg}`}
                          >
                            {selectedOrder.orderStatus}
                          </span>
                        </div>

                        {/* 4-Step Stepper */}
                        <div className="grid grid-cols-4 text-center text-[11px] relative gap-1 sm:gap-2">
                          {TIMELINE_STAGES.map((stage, idx) => {
                            const isCompleted = currentStep > stage.step || currentStep === 4;
                            const isActive = currentStep === stage.step && currentStep !== 4;
                            const isUpcoming = currentStep < stage.step;

                            return (
                              <div
                                key={stage.step}
                                data-test={`timeline-step-${stage.step}`}
                                data-testid={`timeline-step-${stage.step}`}
                                className="flex flex-col items-center relative group"
                              >
                                {/* Connecting horizontal bar to next stage */}
                                {idx < TIMELINE_STAGES.length - 1 && (
                                  <div
                                    className={`absolute top-3 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                                      currentStep > stage.step ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                  />
                                )}

                                {/* Step Circle Indicator */}
                                <div
                                  data-test={`timeline-step-${stage.step}-${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}
                                  data-testid={`timeline-step-${stage.step}-${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}
                                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] mb-1.5 transition-all ${
                                    isCompleted
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : isActive
                                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm'
                                      : 'bg-slate-100 border border-slate-200 text-slate-400'
                                  }`}
                                >
                                  {isCompleted ? (
                                    '✓'
                                  ) : isActive ? (
                                    <Truck className="w-3.5 h-3.5" />
                                  ) : (
                                    stage.step
                                  )}
                                </div>

                                {/* Stage Label */}
                                <span
                                  className={`leading-tight transition-colors ${
                                    isCompleted
                                      ? 'font-bold text-slate-900'
                                      : isActive
                                      ? 'font-extrabold text-indigo-700'
                                      : 'text-slate-400 font-medium'
                                  }`}
                                >
                                  {stage.label}
                                </span>

                                {/* Stage Subtext / Active Tag */}
                                {isActive && (
                                  <span className="mt-0.5 px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-200">
                                    Active Stage
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="text-[10px] text-emerald-600 font-medium hidden sm:block">
                                    Completed
                                  </span>
                                )}
                                {isUpcoming && (
                                  <span className="text-[10px] text-slate-300 hidden sm:block">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Reassigned Delivery Notice (if transferred) */}
                  {selectedOrder.transferReason && (
                    <div
                      data-test="order-reassigned-notice"
                      data-testid="order-reassigned-notice"
                      className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold">Order Reassigned:</span> Delivery partner updated to{' '}
                        <strong>{selectedOrder.assignedAgentName || selectedOrder.assignedAgent?.name || 'New Delivery Executive'}</strong>{' '}
                        due to delivery route obstruction (Reason: {selectedOrder.transferReason}).
                      </div>
                    </div>
                  )}

                  {/* Synchronized Server Countdown & Delay Alert */}
                  <DeliveryEtaCountdown
                    orderId={selectedOrder.orderNumber}
                    orderStatus={selectedOrder.orderStatus}
                    initialProceededAt={selectedOrder.orderProceededAt}
                    initialEstimatedDeliveryAt={selectedOrder.estimatedDeliveryAt}
                    initialIsDelayed={selectedOrder.isDelayed}
                    initialExtraDelaySeconds={selectedOrder.extraDelaySeconds}
                  />

                  {/* Live Interactive Route Map */}
                  <div className="mt-3">
                    <LiveOrderMap
                      orderId={selectedOrder.orderNumber}
                      destinationLat={selectedOrder.customerLat || selectedOrder.deliveryLat || 17.4375}
                      destinationLng={selectedOrder.customerLng || selectedOrder.deliveryLng || 78.4482}
                      customerAddress={`${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.city}`}
                      orderStatus={selectedOrder.orderStatus}
                      agentCoords={
                        selectedOrder.agentLat && selectedOrder.agentLng
                          ? { lat: selectedOrder.agentLat, lng: selectedOrder.agentLng }
                          : undefined
                      }
                      assignedAgentName={selectedOrder.assignedAgentName || selectedOrder.assignedAgent?.name}
                      assignedAgentPhone={selectedOrder.assignedAgentPhone || selectedOrder.assignedAgent?.phone}
                    />
                  </div>

                  {/* Payment & Settlement Status */}
                  {selectedOrder.paymentSettlementStatus && selectedOrder.paymentSettlementStatus !== 'PENDING_DELIVERY' && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Settlement Status</span>
                        <p className="font-bold text-indigo-900">
                          {selectedOrder.paymentSettlementStatus === 'QR_PAID_AWAITING_ADMIN' && '⏳ UPI Paid — Awaiting Store Admin Verification'}
                          {selectedOrder.paymentSettlementStatus === 'QR_AMOUNT_RECEIVED' && '✅ UPI Payment Verified by Admin'}
                          {selectedOrder.paymentSettlementStatus === 'CASH_COLLECTED_BY_AGENT' && '💵 Cash Collected by Agent — Pending Deposit at Store'}
                          {selectedOrder.paymentSettlementStatus === 'CASH_DEPOSIT_REQUESTED' && '🏦 Agent Requested Store Cash Deposit'}
                          {selectedOrder.paymentSettlementStatus === 'CASH_DEPOSITED_AT_STORE' && '✅ Cash Deposited at Hyderabad Flagship Store'}
                          {selectedOrder.paymentSettlementStatus === 'SETTLED' && '✅ Payment Settled & Cleared'}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-200 font-bold text-indigo-700">
                        {selectedOrder.paymentSettlementStatus}
                      </span>
                    </div>
                  )}

                  {/* Delivery OTP Card for Out for Delivery orders */}
                  {normalizeOrderStatus(selectedOrder.orderStatus) === 'out_for_delivery' && selectedOrder.deliveryOtp && (
                    <div
                      data-test="delivery-otp-banner"
                      data-testid="delivery-otp-banner"
                      className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl border border-indigo-500/40 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                          <ShieldCheck className="w-4 h-4 text-sky-400" />
                          <span>Secure Delivery Verification OTP</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Share this 6-digit verification code with your delivery agent upon arrival to verify and complete delivery.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          data-test="delivery-otp-code"
                          data-testid="delivery-otp-code"
                          className="font-mono text-xl sm:text-2xl font-black tracking-widest text-sky-300 bg-white/10 px-3 py-1 rounded-lg border border-white/20"
                        >
                          {selectedOrder.deliveryOtp}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COD Payment Notification & Action */}
                  {selectedOrder.paymentMethod === 'cod' && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-amber-900">Cash on Delivery (COD)</p>
                          <p className="text-[11px] text-amber-700">
                            {selectedOrder.paymentStatus === 'paid_to_delivery_agent'
                              ? '✓ You marked this as paid to delivery boy. Waiting for admin payment approval.'
                              : normalizeOrderStatus(selectedOrder.orderStatus) === 'delivered'
                              ? '✓ Order delivered and payment verified.'
                              : normalizeOrderStatus(selectedOrder.orderStatus) === 'out_for_delivery'
                              ? 'Out for delivery! Pay with Cash or UPI to the delivery executive upon arrival.'
                              : 'Payment is collected only once the order is Out for Delivery. Pay via Cash or UPI to the delivery executive upon arrival.'}
                          </p>
                        </div>
                      </div>

                      {selectedOrder.paymentStatus !== 'paid_to_delivery_agent' &&
                        normalizeOrderStatus(selectedOrder.orderStatus) === 'out_for_delivery' && (
                          <button
                            type="button"
                            data-test="btn-paid-to-delivery-boy"
                            data-testid="btn-paid-to-delivery-boy"
                            disabled={markingPaid}
                            onClick={() => handleMarkPaidToDeliveryBoy(selectedOrder.orderNumber)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            {markingPaid ? 'Updating...' : 'Paid to Delivery Boy (Cash/UPI)'}
                          </button>
                        )}
                    </div>
                  )}

                  {paidSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{paidSuccessMsg}</span>
                    </div>
                  )}

                  {/* Items Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Purchased Items ({selectedOrder.items.length}):
                    </h4>
                    <div className="divide-y divide-slate-200 rounded-xl bg-white border border-slate-200 overflow-hidden text-xs">
                      {selectedOrder.items.map(it => (
                        <div key={it.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={it.product.images[0]}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">{it.product.title}</p>
                              <div className="flex gap-2 text-[11px] text-slate-500">
                                <span>Qty: {it.quantity}</span>
                                {it.selectedVariant && <span>• {it.selectedVariant}</span>}
                              </div>
                            </div>
                          </div>
                          <span className="font-bold text-slate-900">₹{it.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financials & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <p className="font-bold text-slate-800 mb-1">Shipping Address:</p>
                      <p className="text-slate-700">{selectedOrder.shippingAddress.fullName}</p>
                      <p className="text-slate-500">{selectedOrder.shippingAddress.street}</p>
                      <p className="text-slate-500">
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
                      </p>
                      <p className="text-slate-500">{selectedOrder.shippingAddress.country}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tax:</span>
                        <span>₹{selectedOrder.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping ({selectedOrder.shippingMethod}):</span>
                        <span>{selectedOrder.shippingFee === 0 ? 'FREE' : `₹${selectedOrder.shippingFee.toFixed(2)}`}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-sm">
                        <span>Grand Total:</span>
                        <span data-test="order-detail-grand-total" data-testid="order-detail-grand-total" className="text-indigo-700">₹{selectedOrder.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
