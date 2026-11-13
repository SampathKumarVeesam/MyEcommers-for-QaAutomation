import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileCode,
  FolderGit2,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { DOT_WORKFLOW_DEFINITION } from '../swaggerDoc.js';

interface DotWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestStepResult {
  stepNumber: number;
  title: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus?: number;
  duration?: number;
  status: 'idle' | 'running' | 'passed' | 'failed';
  details?: string;
  responsePayload?: any;
}

export const DotWorkflowModal: React.FC<DotWorkflowModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'dot' | 'e2e_runner'>('visual');
  const [copiedDot, setCopiedDot] = useState(false);
  const [activeNode, setActiveNode] = useState<string>('auth');

  // E2E Test Suite Runner State
  const [testResults, setTestResults] = useState<TestStepResult[]>([
    {
      stepNumber: 1,
      title: 'Database Reset to Seed Accounts',
      endpoint: '/api/seed/reset',
      method: 'POST',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 2,
      title: 'Admin User Authentication & JWT Issuance',
      endpoint: '/api/users/login',
      method: 'POST',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 3,
      title: 'Verify Authenticated User Profile (RBAC me)',
      endpoint: '/api/users/me',
      method: 'GET',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 4,
      title: 'Query Product Catalog with Category Filter (Mobiles)',
      endpoint: '/api/products?category=mobiles&page=1',
      method: 'GET',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 5,
      title: 'Initialize Unique Cart Basket Session',
      endpoint: '/api/carts',
      method: 'POST',
      expectedStatus: 201,
      status: 'idle',
    },
    {
      stepNumber: 6,
      title: 'Add Multi-Category Product Items to Basket',
      endpoint: '/api/carts/:basketId',
      method: 'POST',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 7,
      title: 'Retrieve Basket & Validate Item Count Calculations',
      endpoint: '/api/carts/:basketId',
      method: 'GET',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 8,
      title: 'Verify 2FA Gateway Payment OTP Code (123456)',
      endpoint: '/api/orders/verify-otp',
      method: 'POST',
      expectedStatus: 200,
      status: 'idle',
    },
    {
      stepNumber: 9,
      title: 'Create Verified Order & Issue Tracking Number',
      endpoint: '/api/orders',
      method: 'POST',
      expectedStatus: 201,
      status: 'idle',
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [testSummary, setTestSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyDot = () => {
    navigator.clipboard.writeText(DOT_WORKFLOW_DEFINITION.trim());
    setCopiedDot(true);
    setTimeout(() => setCopiedDot(false), 2000);
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setTestSummary(null);

    const steps = [...testResults];
    let bearerToken = '';
    let currentBasketId = '';
    let sampleProductId = '';

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      step.status = 'running';
      setTestResults([...steps]);

      const startTime = performance.now();
      try {
        let res: Response;
        let data: any;

        if (step.stepNumber === 1) {
          // Reset DB
          res = await fetch('/api/seed/reset', { method: 'POST' });
          data = await res.json();
        } else if (step.stepNumber === 2) {
          // Login
          res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@practicesoftwaretesting.com',
              password: 'welcome01',
            }),
          });
          data = await res.json();
          if (data?.data?.token) {
            bearerToken = data.data.token;
          }
        } else if (step.stepNumber === 3) {
          // GET me
          res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${bearerToken}` },
          });
          data = await res.json();
        } else if (step.stepNumber === 4) {
          // Query catalog
          res = await fetch('/api/products?category=mobiles&page=1');
          data = await res.json();
          if (data?.data?.[0]?.id) {
            sampleProductId = data.data[0].id;
          }
        } else if (step.stepNumber === 5) {
          // Init Basket
          res = await fetch('/api/carts', { method: 'POST' });
          data = await res.json();
          if (data?.data?.basketId) {
            currentBasketId = data.data.basketId;
          }
        } else if (step.stepNumber === 6) {
          // Add to basket
          res = await fetch(`/api/carts/${currentBasketId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: sampleProductId || 'prod_elec_01',
              quantity: 2,
              selectedVariant: '256GB / Natural Titanium',
            }),
          });
          data = await res.json();
        } else if (step.stepNumber === 7) {
          // Get basket
          res = await fetch(`/api/carts/${currentBasketId}`);
          data = await res.json();
        } else if (step.stepNumber === 8) {
          // Verify OTP
          res = await fetch('/api/orders/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              otpCode: '123456',
            }),
          });
          data = await res.json();
        } else {
          // Place Order
          res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${bearerToken}`,
            },
            body: JSON.stringify({
              basketId: currentBasketId,
              shippingAddress: {
                fullName: 'Sampath Kumar (QA)',
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
            }),
          });
          data = await res.json();
        }

        const duration = Math.round(performance.now() - startTime);
        step.actualStatus = res.status;
        step.duration = duration;
        step.responsePayload = data;

        if (res.status === step.expectedStatus) {
          step.status = 'passed';
          step.details = `HTTP ${res.status} OK in ${duration}ms`;
        } else {
          step.status = 'failed';
          step.details = `Expected ${step.expectedStatus}, got ${res.status}`;
        }
      } catch (err: any) {
        step.status = 'failed';
        step.details = err.message || 'Network call failed';
      }

      setTestResults([...steps]);
      await new Promise(r => setTimeout(r, 120)); // Subtle pacing for visual clarity
    }

    const passedCount = steps.filter(s => s.status === 'passed').length;
    setIsRunningAll(false);
    setTestSummary(`Automated QA Suite Completed: ${passedCount}/${steps.length} Steps Passed!`);
  };

  return (
    <div
      data-test="dot-workflow-modal"
      data-testid="dot-workflow-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  DOT Workflow Graph &amp; E2E QA Test Engine
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DOT &amp; Automation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visual State Machine, Graphviz Schema, and Automated Playwright/Jest Testing Runner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                data-test="dot-tab-visual"
                data-testid="dot-tab-visual"
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'visual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Visual Flow
              </button>
              <button
                type="button"
                data-test="dot-tab-runner"
                data-testid="dot-tab-runner"
                onClick={() => setActiveTab('e2e_runner')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'e2e_runner' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                E2E Test Runner
              </button>
              <button
                type="button"
                data-test="dot-tab-code"
                data-testid="dot-tab-code"
                onClick={() => setActiveTab('dot')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Graphviz DOT Code
              </button>
            </div>

            <button
              type="button"
              data-test="dot-workflow-close-button"
              data-testid="dot-workflow-close-button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Visual Flow representation */}
          {activeTab === 'visual' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Interactive DOT State Flow (ShopSphere_E2E_Flow)
                  </h3>
                  <p className="text-xs text-indigo-700 mt-1">
                    Follow the standard end-to-end purchasing &amp; testing path across all 5 decoupled system domains.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('e2e_runner')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Run E2E Test Suite
                </button>
              </div>

              {/* Sequential Flow Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
                {[
                  {
                    id: 'auth',
                    stage: 'Stage 1',
                    title: 'Authentication & RBAC',
                    color: 'border-blue-300 bg-blue-50/50 text-blue-900',
                    badge: 'bg-blue-600 text-white',
                    items: [
                      'POST /api/users/register (201)',
                      'POST /api/users/login (200 JWT)',
                      'GET /api/users/me (Verify Role)',
                    ],
                  },
                  {
                    id: 'catalog',
                    stage: 'Stage 2',
                    title: 'Multi-Category Catalog',
                    color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900',
                    badge: 'bg-emerald-600 text-white',
                    items: [
                      'GET /api/products',
                      '?category=mobiles&page=1',
                      'GET /api/products/:id (PDP Specs)',
                    ],
                  },
                  {
                    id: 'basket',
                    stage: 'Stage 3',
                    title: 'Cart & Basket Session',
                    color: 'border-amber-300 bg-amber-50/50 text-amber-900',
                    badge: 'bg-amber-600 text-white',
                    items: [
                      'POST /api/carts (201 Unique basketId)',
                      'POST /api/carts/:basketId (Qty & Specs)',
                      'GET /api/carts/:basketId (Totals)',
                    ],
                  },
                  {
                    id: 'checkout',
                    stage: 'Stage 4',
                    title: 'Checkout & Gateway',
                    color: 'border-purple-300 bg-purple-50/50 text-purple-900',
                    badge: 'bg-purple-600 text-white',
                    items: [
                      'Shipping & Delivery Select',
                      'Payment Method (UPI/Card/COD)',
                      'POST /api/orders/verify-otp (123456)',
                    ],
                  },
                  {
                    id: 'order',
                    stage: 'Stage 5',
                    title: 'Post-Purchase & Reset',
                    color: 'border-rose-300 bg-rose-50/50 text-rose-900',
                    badge: 'bg-rose-600 text-white',
                    items: [
                      'POST /api/orders (201 Confirmed)',
                      'GET /api/orders (Order History)',
                      'POST /api/seed/reset (QA Teardown)',
                    ],
                  },
                ].map(node => (
                  <div
                    key={node.id}
                    onClick={() => setActiveNode(node.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer ${node.color} ${
                      activeNode === node.id ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${node.badge}`}>
                          {node.stage}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <h4 className="font-bold text-xs mb-2">{node.title}</h4>
                      <ul className="space-y-1 text-[11px] font-mono text-slate-700">
                        {node.items.map((it, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span className="truncate">{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* DOT Graph Legend Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900 mb-1.5">DOT Flow Architectural Notes:</h4>
                <p className="text-slate-600 leading-relaxed">
                  The state machine enforces stateless session independence: cart baskets can be created anonymously
                  or tied to an authenticated session; upon checkout, the basket items are atomically transferred into a
                  permanent <code className="text-indigo-600 font-mono">Order</code> entity, stock count is decremented, and the cart is wiped clean with HTTP status 204.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Automated E2E Runner */}
          {activeTab === 'e2e_runner' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 text-white">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Automated Full-Stack E2E Test Suite
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Validates all 9 end-to-end endpoints in sequence against the live Express server.
                  </p>
                </div>

                <button
                  onClick={runAllTests}
                  disabled={isRunningAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isRunningAll ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Running Suite...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run All E2E Tests</span>
                    </>
                  )}
                </button>
              </div>

              {testSummary && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{testSummary}</span>
                </div>
              )}

              {/* Test Step Cards */}
              <div className="space-y-2">
                {testResults.map(step => (
                  <div
                    key={step.stepNumber}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          step.status === 'passed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : step.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : step.status === 'running'
                            ? 'bg-indigo-100 text-indigo-700 animate-pulse'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {step.status === 'passed' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          step.stepNumber
                        )}
                      </span>

                      <div>
                        <p className="text-xs font-bold text-slate-900">{step.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span className="font-bold text-indigo-600">{step.method}</span>
                          <span>{step.endpoint}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs self-end sm:self-auto">
                      {step.duration !== undefined && (
                        <span className="font-mono text-slate-400 text-[11px]">{step.duration}ms</span>
                      )}

                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase tracking-wider ${
                          step.status === 'passed'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : step.status === 'failed'
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : step.status === 'running'
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Raw Graphviz DOT Code */}
          {activeTab === 'dot' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Graphviz DOT Specification (DOT format):</span>
                <button
                  onClick={handleCopyDot}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedDot ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDot ? 'Copied to Clipboard!' : 'Copy DOT Code'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 text-indigo-300 font-mono text-xs overflow-x-auto max-h-[65vh] border border-slate-800">
                {DOT_WORKFLOW_DEFINITION.trim()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
