import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Package,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Truck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Order } from '../types.js';
import { apiUrl } from '../config/api.js';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
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
                      <span className="font-bold text-slate-900">${o.grandTotal.toFixed(2)}</span>
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
                      <span className="text-xs text-slate-500">Invoice &amp; Receipt for:</span>
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
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                      Shipment Status &amp; Timeline:
                    </p>
                    <div className="grid grid-cols-3 text-center text-[11px] relative gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] mb-1">
                          ✓
                        </div>
                        <span className="font-semibold text-slate-900">Order Confirmed</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] mb-1">
                          ✓
                        </div>
                        <span className="font-semibold text-slate-900">Dispatched</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] mb-1">
                          3
                        </div>
                        <span className="text-slate-500">Out for Delivery</span>
                      </div>
                    </div>
                  </div>

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
                          <span className="font-bold text-slate-900">${it.totalPrice.toFixed(2)}</span>
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
                        <span>${selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tax:</span>
                        <span>${selectedOrder.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping ({selectedOrder.shippingMethod}):</span>
                        <span>{selectedOrder.shippingFee === 0 ? 'FREE' : `$${selectedOrder.shippingFee.toFixed(2)}`}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900 text-sm">
                        <span>Grand Total:</span>
                        <span data-test="order-detail-grand-total" data-testid="order-detail-grand-total" className="text-indigo-700">${selectedOrder.grandTotal.toFixed(2)}</span>
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
