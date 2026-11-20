import confetti from 'canvas-confetti';
import {
  Banknote,
  Building,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  KeyRound,
  MapPin,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { Address, Order, PaymentMethod } from '../types.js';
import { apiUrl } from '../config/api.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOrders: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onViewOrders }) => {
  const { user, token } = useAuth();
  const { basketId, basket, items, subtotal, estimatedTax, shippingFee, grandTotal, clearCart, refreshBasket } = useCart();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Step 1: Address
  const [address, setAddress] = useState<Address>({
    fullName: user?.name || 'Sampath Kumar',
    street: user?.address?.street || 'Road No. 36, Jubilee Hills',
    city: user?.address?.city || 'Hyderabad',
    state: user?.address?.state || 'Telangana',
    postalCode: user?.address?.postalCode || '500033',
    country: user?.address?.country || 'India',
    phone: user?.phone || '+91 98765 43210',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Step 2: Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express' | 'priority'>('standard');

  // Step 3: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [cardDetails, setCardDetails] = useState({
    number: '4242 •••• •••• 4242',
    name: user?.name || 'Sampath Kumar',
    expiry: '12/28',
    cvv: '888',
  });
  const [upiId, setUpiId] = useState('customer@okhdfcbank');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Step 4: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // Reset checkout state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOtpCode('');
      setOtpError('');
      setIsSubmitting(false);
      setCreatedOrder(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validate Address Step
  const validateAddress = () => {
    const errs: Record<string, string> = {};
    if (!address.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!address.street.trim()) errs.street = 'Street address is required';
    if (!address.city.trim()) errs.city = 'City is required';
    if (!address.postalCode.trim()) errs.postalCode = 'Postal Code is required';
    if (!address.country?.trim()) errs.country = 'Country is required';
    if (!address.phone.trim()) errs.phone = 'Phone number is required';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFromAddress = () => {
    if (validateAddress()) {
      setStep(2);
    }
  };

  const handleVerifyOtpAndPlaceOrder = async () => {
    if (!otpCode.trim()) {
      setOtpError('Please enter the 6-digit OTP code received on your phone.');
      return;
    }
    if (otpCode.trim() !== '123456') {
      setOtpError('Invalid OTP code. Please check your code and try again.');
      return;
    }
    setOtpError('');
    setIsSubmitting(true);

    try {
      if (!basketId) throw new Error('No basket session found');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          basketId,
          shippingAddress: address,
          shippingMethod,
          paymentMethod,
          userEmail: user?.email || 'customer@practicesoftwaretesting.com',
          userName: user?.name || address.fullName,
          userId: user?.id,
          otpCode: otpCode.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCreatedOrder(json.data);
        await refreshBasket();
        setStep(5); // Confirmation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setOtpError(json.message || 'Error processing order');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateMethodShipping = () => {
    if (shippingMethod === 'express') return 14.99;
    if (shippingMethod === 'priority') return 24.99;
    return subtotal > 75 ? 0 : 9.99;
  };

  const currentGrandTotal = parseFloat((subtotal + estimatedTax + calculateMethodShipping()).toFixed(2));

  return (
    <div
      data-test="checkout-modal"
      data-testid="checkout-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Secure Checkout</h2>
              <p className="text-xs text-slate-500">Multi-step QA test verification flow</p>
            </div>
          </div>

          <button
            data-test="checkout-close-button"
            data-testid="checkout-close-button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Step Indicator */}
        {step < 5 && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between text-xs">
              {[
                { s: 1, label: 'Address', icon: MapPin },
                { s: 2, label: 'Shipping', icon: Truck },
                { s: 3, label: 'Payment', icon: CreditCard },
                { s: 4, label: 'OTP Gate', icon: KeyRound },
              ].map(st => {
                const Icon = st.icon;
                const isActive = step === st.s;
                const isPassed = step > st.s;
                return (
                  <div
                    key={st.s}
                    data-test={`checkout-step-indicator-${st.s}`}
                    data-testid={`checkout-step-indicator-${st.s}`}
                    className="flex items-center gap-1.5 font-medium"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isActive
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : st.s}
                    </span>
                    <span className={`hidden sm:inline ${isActive ? 'text-indigo-900 font-bold' : 'text-slate-500'}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Steps Content */}
        <div className="p-6">
          {/* STEP 1: Shipping Address */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Step 1: Shipping Destination Address
                </h3>
                <span className="text-xs text-indigo-600 font-medium">Auto-prefilled for test user</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    data-test="checkout-fullname"
                    data-testid="checkout-fullname"
                    value={address.fullName}
                    onChange={e => setAddress({ ...address, fullName: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.fullName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.fullName && <p className="text-rose-500 mt-1 font-medium">{addressErrors.fullName}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    data-test="checkout-street"
                    data-testid="checkout-street"
                    value={address.street}
                    onChange={e => setAddress({ ...address, street: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.street ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.street && <p className="text-rose-500 mt-1 font-medium">{addressErrors.street}</p>}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    data-test="checkout-city"
                    data-testid="checkout-city"
                    value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.city ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.city && <p className="text-rose-500 mt-1 font-medium">{addressErrors.city}</p>}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State / Province</label>
                  <input
                    type="text"
                    data-test="checkout-state"
                    data-testid="checkout-state"
                    value={address.state}
                    onChange={e => setAddress({ ...address, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Postal / ZIP Code</label>
                  <input
                    type="text"
                    data-test="checkout-postalcode"
                    data-testid="checkout-postalcode"
                    value={address.postalCode}
                    onChange={e => setAddress({ ...address, postalCode: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.postalCode ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.postalCode && <p className="text-rose-500 mt-1 font-medium">{addressErrors.postalCode}</p>}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    data-test="checkout-country"
                    data-testid="checkout-country"
                    value={address.country}
                    onChange={e => setAddress({ ...address, country: e.target.value })}
                    placeholder="e.g. United States, India"
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.country ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.country && <p className="text-rose-500 mt-1 font-medium">{addressErrors.country}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    data-test="checkout-phone"
                    data-testid="checkout-phone"
                    value={address.phone}
                    onChange={e => setAddress({ ...address, phone: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border bg-slate-50/50 outline-none focus:bg-white ${
                      addressErrors.phone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200 focus:border-indigo-500'
                    }`}
                  />
                  {addressErrors.phone && <p className="text-rose-500 mt-1 font-medium">{addressErrors.phone}</p>}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  data-test="checkout-address-next-button"
                  data-testid="checkout-address-next-button"
                  onClick={handleNextFromAddress}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue to Shipping Method</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Shipping Method */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                Step 2: Choose Delivery Method
              </h3>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'standard',
                    title: 'Standard Surface Shipping',
                    duration: '2-4 Days in Telangana',
                    price: subtotal > 750 ? 'FREE' : '₹99.00',
                    desc: 'Tracked delivery from Hyderabad Flagship Store',
                  },
                  {
                    id: 'express',
                    title: 'Hyderabad Express Hub Courier',
                    duration: 'Same-Day / Next-Day Delivery',
                    price: '₹149.00',
                    desc: 'Expedited courier with live map tracking',
                  },
                  {
                    id: 'priority',
                    title: 'Priority 2-Hour Express',
                    duration: 'Guaranteed 2-Hour Delivery (Hyderabad)',
                    price: '₹249.00',
                    desc: 'Direct dispatch via dedicated delivery partner',
                  },
                ].map(m => (
                  <label
                    key={m.id}
                    data-test={`checkout-shipping-${m.id}`}
                    data-testid={`checkout-shipping-${m.id}`}
                    onClick={() => setShippingMethod(m.id as any)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      shippingMethod === m.id
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === m.id}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.title}</p>
                        <p className="text-[11px] text-slate-500">{m.desc}</p>
                        <span className="text-[10px] font-semibold text-indigo-600">{m.duration}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{m.price}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  data-test="checkout-shipping-back-button"
                  data-testid="checkout-shipping-back-button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  data-test="checkout-shipping-next-button"
                  data-testid="checkout-shipping-next-button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Gateway Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Step 3: Select Payment Gateway
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'credit_card', label: 'Cards', icon: CreditCard },
                  { id: 'net_banking', label: 'Net Banking', icon: Building },
                  { id: 'cod', label: 'Cash on Delivery', icon: Banknote },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-test={`checkout-payment-method-${opt.id}`}
                      data-testid={`checkout-payment-method-${opt.id}`}
                      onClick={() => setPaymentMethod(opt.id as any)}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === opt.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Specific Payment Input Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                {paymentMethod === 'credit_card' && (
                  <div className="space-y-2.5">
                    <p className="font-bold text-slate-800">Test Credit / Debit Card Gateway</p>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Card Number</label>
                      <input
                        type="text"
                        data-test="checkout-card-number"
                        data-testid="checkout-card-number"
                        value={cardDetails.number}
                        onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                        className="w-full p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Expires</label>
                        <input
                          type="text"
                          data-test="checkout-card-expiry"
                          data-testid="checkout-card-expiry"
                          value={cardDetails.expiry}
                          onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">CVV</label>
                        <input
                          type="text"
                          data-test="checkout-card-cvv"
                          data-testid="checkout-card-cvv"
                          value={cardDetails.cvv}
                          onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                          className="w-full p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-800">UPI Instant Payment</p>
                    <label className="block text-[11px] font-semibold text-slate-600">Enter UPI ID / VPA</label>
                    <input
                      type="text"
                      data-test="checkout-upi-id"
                      data-testid="checkout-upi-id"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-mono text-xs"
                    />
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <span>Or scan dynamic QR at OTP confirmation step</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'net_banking' && (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-800">Select Net Banking Financial Partner</p>
                    <select
                      data-test="checkout-bank-select"
                      data-testid="checkout-bank-select"
                      value={selectedBank}
                      onChange={e => setSelectedBank(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-medium"
                    >
                      <option>JPMorgan Chase Bank</option>
                      <option>Bank of America</option>
                      <option>Wells Fargo</option>
                      <option>Citigroup</option>
                      <option>HDFC Bank Online</option>
                      <option>ICICI Bank Corporate</option>
                    </select>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="text-slate-600">
                    <p className="font-bold text-slate-800">Cash on Delivery (COD)</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pay with cash or card upon package delivery. OTP verification is required to confirm the dispatch address.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  data-test="checkout-payment-back-button"
                  data-testid="checkout-payment-back-button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  data-test="checkout-payment-next-button"
                  data-testid="checkout-payment-next-button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Proceed to OTP Gate</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: OTP Verification Gate */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">2-Factor Gateway OTP Security Check</h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Please enter the 6-digit verification code sent to your registered phone number to authorize this payment.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <p className="text-xs text-slate-600">Enter the 6-digit OTP code received on your phone:</p>
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    data-test="checkout-otp-input"
                    data-testid="checkout-otp-input"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={e => {
                      setOtpCode(e.target.value);
                      if (otpError) setOtpError('');
                    }}
                    className="w-44 text-center tracking-[0.4em] font-mono text-xl font-bold py-2 px-3 rounded-xl border-2 border-indigo-500 bg-white shadow-inner outline-none text-indigo-900 placeholder:text-slate-300 placeholder:tracking-widest"
                    autoFocus
                  />
                </div>
                {otpError && <p data-test="checkout-otp-error" data-testid="checkout-otp-error" className="text-xs text-rose-600 font-semibold">{otpError}</p>}
                <p className="text-[11px] text-slate-400">Total charge: ₹{currentGrandTotal.toFixed(2)}</p>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  data-test="checkout-otp-back-button"
                  data-testid="checkout-otp-back-button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  data-test="checkout-place-order-button"
                  data-testid="checkout-place-order-button"
                  onClick={handleVerifyOtpAndPlaceOrder}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify OTP &amp; Authorize (₹{currentGrandTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Order Confirmation Receipt */}
          {step === 5 && createdOrder && (
            <div data-test="order-confirmed-container" data-testid="order-confirmed-container" className="space-y-5 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Order Placed Successfully!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Thank you, <strong className="text-slate-800">{createdOrder.userName}</strong>. Your test order has been validated and committed to database store.
                </p>
              </div>

              {/* Order Meta Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Order Reference #:</span>
                  <span data-test="order-reference-number" data-testid="order-reference-number" className="font-mono font-bold text-indigo-700">{createdOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Tracking Number:</span>
                  <span data-test="order-tracking-number" data-testid="order-tracking-number" className="font-mono font-bold text-slate-900">{createdOrder.trackingNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Payment Status:</span>
                  <span data-test="order-payment-status" data-testid="order-payment-status" className="font-bold uppercase text-emerald-600">{createdOrder.paymentStatus}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900 text-sm">
                  <span>Total Amount Paid:</span>
                  <span data-test="order-total-paid" data-testid="order-total-paid" className="text-indigo-700">₹{createdOrder.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Item breakdown preview */}
              <div className="text-left text-xs">
                <p className="font-bold text-slate-700 mb-2">Ordered Items ({createdOrder.items.length}):</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {createdOrder.items.map(it => (
                    <div key={it.id} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700 truncate max-w-xs">
                        {it.quantity}x {it.product.title}
                      </span>
                      <span className="font-semibold text-slate-900">₹{it.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  data-test="order-view-orders-button"
                  data-testid="order-view-orders-button"
                  onClick={() => {
                    onClose();
                    onViewOrders();
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View in My Orders</span>
                </button>
                <button
                  type="button"
                  data-test="order-continue-shopping-button"
                  data-testid="order-continue-shopping-button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
