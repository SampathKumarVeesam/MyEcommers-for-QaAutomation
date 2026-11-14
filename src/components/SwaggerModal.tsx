import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  FileCode2,
  Lock,
  Play,
  RotateCcw,
  Send,
  Terminal,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { SWAGGER_SPEC } from '../swaggerDoc.js';
import { apiUrl } from '../config/api.js';

interface SwaggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string | null;
}

interface EndpointDef {
  id: string;
  tag: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  requiresAuth?: boolean;
  defaultParams?: Record<string, string>;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  // Auth
  {
    id: 'auth_register',
    tag: 'Authentication',
    method: 'POST',
    path: '/api/users/register',
    summary: 'Register new customer account (Status: 201)',
    description: 'Creates a new customer user profile and returns JWT Bearer token.',
    defaultBody: {
      name: 'QA Test Automator',
      email: `test_user_${Math.floor(1000 + Math.random() * 9000)}@practicesoftwaretesting.com`,
      password: 'User01',
      phone: '+1 (555) 789-0123',
    },
  },
  {
    id: 'auth_login',
    tag: 'Authentication',
    method: 'POST',
    path: '/api/users/login',
    summary: 'Authenticate user with credentials (Status: 200)',
    description: 'Authenticates with email and password, returning a JWT token.',
    defaultBody: {
      email: 'admin@practicesoftwaretesting.com',
      password: 'welcome01',
    },
  },
  {
    id: 'auth_me',
    tag: 'Authentication',
    method: 'GET',
    path: '/api/users/me',
    summary: 'Get authenticated user profile (Status: 200)',
    description: 'Returns profile details for the active JWT Bearer token.',
    requiresAuth: true,
  },

  // Products
  {
    id: 'prod_list',
    tag: 'Catalog & Products',
    method: 'GET',
    path: '/api/products',
    summary: 'Filter and paginate catalog (e.g. ?category=mobiles&page=1)',
    description: 'Retrieves multi-category products filtered by category, subcategory, search, or price.',
    defaultParams: {
      category: 'mobiles',
      page: '1',
      limit: '6',
    },
  },
  {
    id: 'prod_get_one',
    tag: 'Catalog & Products',
    method: 'GET',
    path: '/api/products/:id',
    summary: 'Get single product detailed view (PDP)',
    description: 'Returns detailed product with specs, variants, and scent notes.',
    defaultParams: {
      id: 'prod_fash_01',
    },
  },

  // Basket & Cart
  {
    id: 'cart_init',
    tag: 'Cart & Basket',
    method: 'POST',
    path: '/api/carts',
    summary: 'Initialize unique basket object (Status: 201)',
    description: 'Initializes a unique basket object with a unique basket ID.',
    defaultBody: {},
  },
  {
    id: 'cart_add_item',
    tag: 'Cart & Basket',
    method: 'POST',
    path: '/api/carts/:basketId',
    summary: 'Add or update items in basket (Status: 200: "item added or updated")',
    description: 'Adds item to basket or increments quantity, returning updated financial totals.',
    defaultParams: {
      basketId: 'basket_sample',
    },
    defaultBody: {
      productId: 'prod_fash_01',
      quantity: 1,
      selectedVariant: 'Size: M / Color: Emerald Green',
      selectedSize: 'M',
      selectedColor: 'Emerald Green',
    },
  },
  {
    id: 'cart_get',
    tag: 'Cart & Basket',
    method: 'GET',
    path: '/api/carts/:basketId',
    summary: 'Get products in basket and total item count',
    description: 'Returns products currently in basket, item count, taxes, and shipping.',
    defaultParams: {
      basketId: 'basket_sample',
    },
  },
  {
    id: 'cart_delete',
    tag: 'Cart & Basket',
    method: 'DELETE',
    path: '/api/carts/:basketId',
    summary: 'Clear basket or remove item (Status: 204)',
    description: 'Clears basket or removes specific product when ?productId=... is provided.',
    defaultParams: {
      basketId: 'basket_sample',
      productId: 'prod_fash_01',
    },
  },

  // Orders
  {
    id: 'order_otp',
    tag: 'Orders & Checkout',
    method: 'POST',
    path: '/api/orders/verify-otp',
    summary: 'Verify simulated payment OTP gate (Code: 123456)',
    description: 'Simulates 2FA authentication for payment gateways.',
    defaultBody: {
      otpCode: '123456',
      phone: '+1 (555) 482-9102',
    },
  },
  {
    id: 'order_create',
    tag: 'Orders & Checkout',
    method: 'POST',
    path: '/api/orders',
    summary: 'Create and place order from basket (Status: 201)',
    description: 'Creates verified order, decrements catalog stock, and issues tracking ID.',
    requiresAuth: true,
    defaultBody: {
      basketId: 'basket_sample',
      shippingAddress: {
        fullName: 'Sampath Kumar',
        street: '450 Tech Innovation Way',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'United States',
        phone: '+1 (555) 019-2834',
      },
      shippingMethod: 'express',
      paymentMethod: 'credit_card',
      otpCode: '123456',
    },
  },
  {
    id: 'order_history',
    tag: 'Orders & Checkout',
    method: 'GET',
    path: '/api/orders',
    summary: 'Get order history for authenticated user',
    description: 'Fetches list of orders placed by customer or all orders if admin.',
    requiresAuth: true,
  },

  // QA Utilities
  {
    id: 'qa_reset',
    tag: 'QA & Test Utilities',
    method: 'POST',
    path: '/api/seed/reset',
    summary: 'Reset database to pristine seed accounts (Status: 200)',
    description: 'Restores initial seed accounts (Admin, Customer 1, Customer 2) and catalog for test runs.',
    defaultBody: {},
  },
];

export const SwaggerModal: React.FC<SwaggerModalProps> = ({ isOpen, onClose, initialToken }) => {
  const [activeTab, setActiveTab] = useState<'ui' | 'json'>('ui');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string>('auth_login');
  const [tokenInput, setTokenInput] = useState<string>(initialToken || '');
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  // Per endpoint state: params, body, responses
  const [paramsState, setParamsState] = useState<Record<string, Record<string, string>>>({});
  const [bodyState, setBodyState] = useState<Record<string, string>>({});
  const [responseState, setResponseState] = useState<Record<string, { status: number; duration: number; headers: any; data: any } | null>>({});
  const [executing, setExecuting] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const getParam = (epId: string, paramKey: string, defaultVal: string = '') => {
    return paramsState[epId]?.[paramKey] ?? defaultVal;
  };

  const setParam = (epId: string, paramKey: string, val: string) => {
    setParamsState(prev => ({
      ...prev,
      [epId]: {
        ...(prev[epId] || {}),
        [paramKey]: val,
      },
    }));
  };

  const getBody = (ep: EndpointDef) => {
    if (bodyState[ep.id] !== undefined) return bodyState[ep.id];
    return ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '';
  };

  const handleExecute = async (ep: EndpointDef) => {
    setExecuting(prev => ({ ...prev, [ep.id]: true }));
    const startTime = performance.now();

    try {
      // Build URL
      let url = ep.path;
      const currentParams = paramsState[ep.id] || ep.defaultParams || {};

      // Replace path parameters like :id or :basketId
      for (const [key, val] of Object.entries(currentParams)) {
        if (url.includes(`:${key}`)) {
          url = url.replace(`:${key}`, encodeURIComponent(val));
        }
      }

      // Append query parameters
      const queryParams = new URLSearchParams();
      for (const [key, val] of Object.entries(currentParams)) {
        if (!ep.path.includes(`:${key}`) && val) {
          queryParams.append(key, val);
        }
      }
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenInput.trim()) {
        headers['Authorization'] = `Bearer ${tokenInput.trim()}`;
      }

      const options: RequestInit = {
        method: ep.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
        const rawBody = getBody(ep);
        if (rawBody.trim()) {
          options.body = rawBody;
        }
      }

      const res = await fetch(apiUrl(url), options);
      const duration = Math.round(performance.now() - startTime);

      let data: any = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      // If this was a login or register, automatically update the bearer token for subsequent calls!
      if ((ep.id === 'auth_login' || ep.id === 'auth_register') && data?.data?.token) {
        setTokenInput(data.data.token);
      }

      // If this was cart init, prefill sample basketId in subsequent calls!
      if (ep.id === 'cart_init' && data?.data?.basketId) {
        setParam('cart_add_item', 'basketId', data.data.basketId);
        setParam('cart_get', 'basketId', data.data.basketId);
        setParam('cart_delete', 'basketId', data.data.basketId);
        setParam('order_create', 'basketId', data.data.basketId);
      }

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        respHeaders[k] = v;
      });

      setResponseState(prev => ({
        ...prev,
        [ep.id]: {
          status: res.status,
          duration,
          headers: respHeaders,
          data,
        },
      }));
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setResponseState(prev => ({
        ...prev,
        [ep.id]: {
          status: 0,
          duration,
          headers: {},
          data: { error: err.message || 'Network failure' },
        },
      }));
    } finally {
      setExecuting(prev => ({ ...prev, [ep.id]: false }));
    }
  };

  const copyCurl = (ep: EndpointDef) => {
    let url = ep.path;
    const currentParams = paramsState[ep.id] || ep.defaultParams || {};
    for (const [key, val] of Object.entries(currentParams)) {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, val);
    }
    const tokenHeader = tokenInput ? ` -H "Authorization: Bearer ${tokenInput}"` : '';
    const bodyStr = ['POST', 'PUT'].includes(ep.method) && getBody(ep)
      ? ` -d '${getBody(ep).replace(/\n/g, '')}'`
      : '';
    const curl = `curl -X ${ep.method} "http://localhost:3000${url}" -H "Content-Type: application/json"${tokenHeader}${bodyStr}`;

    navigator.clipboard.writeText(curl);
    setCopiedCurl(ep.id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const methodColors: Record<string, { bg: string; text: string; border: string }> = {
    GET: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    POST: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
    PUT: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    DELETE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  };

  return (
    <div
      data-test="swagger-modal"
      data-testid="swagger-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Swagger Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-mono font-bold text-sm">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  ShopSphere Swagger / OpenAPI 3.0
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OAS 3.0.3
                </span>
              </div>
              <p className="text-xs text-slate-400">Interactive REST API Explorer &amp; QA Automation Playground</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                data-test="swagger-tab-ui"
                data-testid="swagger-tab-ui"
                onClick={() => setActiveTab('ui')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ui' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Interactive Explorer
              </button>
              <button
                type="button"
                data-test="swagger-tab-json"
                data-testid="swagger-tab-json"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw OpenAPI JSON
              </button>
            </div>

            <button
              type="button"
              data-test="swagger-close-button"
              data-testid="swagger-close-button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Bearer Auth Strip */}
        <div className="px-6 py-2.5 bg-slate-800/80 border-b border-slate-700/80 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300 font-semibold shrink-0">Bearer Token:</span>
            <input
              type="text"
              data-test="swagger-token-input"
              data-testid="swagger-token-input"
              placeholder="Paste JWT token here or login via POST /api/users/login..."
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[11px] outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Base URL:</span>
            <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">/api</code>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'json' ? (
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[70vh]">
                {JSON.stringify(SWAGGER_SPEC, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              {ENDPOINTS.map(ep => {
                const isExpanded = expandedEndpoint === ep.id;
                const colors = methodColors[ep.method];
                const resp = responseState[ep.id];
                const isRunning = executing[ep.id];

                return (
                  <div
                    key={ep.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded ? 'border-indigo-400 shadow-md ring-1 ring-indigo-400/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Endpoint Accordion Bar */}
                    <div
                      onClick={() => setExpandedEndpoint(isExpanded ? '' : ep.id)}
                      className="px-4 py-3 bg-white hover:bg-slate-50/80 cursor-pointer flex items-center justify-between gap-3 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-16 text-center py-1 rounded-md text-xs font-mono font-extrabold border ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {ep.method}
                        </span>
                        <code className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                          {ep.path}
                        </code>
                        {ep.requiresAuth && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
                            title="Requires Authorization: Bearer JWT"
                          >
                            <Lock className="w-3 h-3" /> Auth
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden md:inline text-xs text-slate-500 font-medium">
                          {ep.summary}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Drawer */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-200 text-xs space-y-4">
                        <p className="text-slate-600">{ep.description}</p>

                        {/* Parameters inputs if applicable */}
                        {ep.defaultParams && (
                          <div>
                            <h4 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                              Parameters / Query Options:
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(ep.defaultParams).map(([paramKey, defVal]) => (
                                <div key={paramKey} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                                  <label className="font-mono text-indigo-700 font-bold shrink-0 w-24 truncate">
                                    {paramKey}:
                                  </label>
                                  <input
                                    type="text"
                                    value={getParam(ep.id, paramKey, defVal)}
                                    onChange={e => setParam(ep.id, paramKey, e.target.value)}
                                    className="flex-1 font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 outline-none focus:border-indigo-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body editor if POST / PUT */}
                        {['POST', 'PUT'].includes(ep.method) && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                                JSON Request Body:
                              </h4>
                              <button
                                type="button"
                                onClick={() =>
                                  setBodyState(prev => ({
                                    ...prev,
                                    [ep.id]: ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '',
                                  }))
                                }
                                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Reset sample body
                              </button>
                            </div>
                            <textarea
                              rows={5}
                              value={getBody(ep)}
                              onChange={e => setBodyState({ ...bodyState, [ep.id]: e.target.value })}
                              className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}

                        {/* Action Buttons: Execute & cURL */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleExecute(ep)}
                            disabled={isRunning}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            {isRunning ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Executing...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Execute / Send Request</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyCurl(ep)}
                            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-medium border border-slate-200 flex items-center gap-1.5 transition-colors"
                          >
                            {copiedCurl === ep.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">cURL Copied!</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy cURL</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Live Server Response Inspector */}
                        {resp && (
                          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                    resp.status >= 200 && resp.status < 300
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  Status: {resp.status}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 font-mono text-[11px]">
                                  Time: {resp.duration}ms
                                </span>
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-3 overflow-x-auto text-slate-100 font-mono text-xs max-h-64">
                              <pre>{JSON.stringify(resp.data, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
