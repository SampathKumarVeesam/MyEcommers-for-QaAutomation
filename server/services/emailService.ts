import dotenv from 'dotenv';
import nodemailer, { type Transporter } from 'nodemailer';
import { Order } from '../../src/types.js';

dotenv.config();

// Zoho Mail SMTP Configuration (with safe fallbacks to ensure cloud deployments without local .env work immediately)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.in';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_SECURE = process.env.SMTP_SECURE ? (process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1') : true;
const SMTP_USER = (process.env.SMTP_USER || 'sampathkumarveesam@zohomail.in').trim();
const SMTP_PASS = (process.env.SMTP_PASS || 'ivGziZPzZT0D').trim();
const EMAIL_FROM = (process.env.EMAIL_FROM || SMTP_USER).trim();
const APP_URL = process.env.APP_URL || 'https://samecommers.netlify.app';

let transporter: Transporter | null = null;

function createTransporter(port: number, secure: boolean): Transporter {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Initializes or reuses the nodemailer Zoho SMTP transporter
 */
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransporter(SMTP_PORT, SMTP_SECURE);
  }
  return transporter;
}

/**
 * Standard email wrapper template
 */
function wrapEmailHtml(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 6px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .content {
      padding: 32px 28px;
    }
    .footer {
      background: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      margin-top: 20px;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
    }
    .card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      padding: 8px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-processed {
      background-color: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }
    .badge-out_for_delivery {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-delivered {
      background-color: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-cancelled {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .badge-pending {
      background-color: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">🛍️ ShopSphere</h1>
      <div class="subtitle">E-Commerce & QA Automation Platform</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">This is an automated notification from <strong>ShopSphere</strong>.</p>
      <p style="margin: 0;">Sent via Zoho Mail SMTP • <a href="${APP_URL}" style="color: #4f46e5; text-decoration: none;">Visit ShopSphere Live</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. User Registration Welcome Email
 * Automatically triggered when a new customer registers on the site
 */
export async function sendWelcomeEmail(user: { name: string; email: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = user.email?.trim();
  if (!recipient) {
    return { success: false, error: 'Recipient email is missing' };
  }

  const subject = `Welcome to ShopSphere, ${user.name || 'Valued Customer'}! 🛍️`;
  const html = wrapEmailHtml(
    subject,
    `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 40px;">🎉</span>
        <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Welcome to ShopSphere!</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Thank you for registering an account with us.</p>
      </div>

      <p style="font-size: 14px; color: #334155;">
        Hi <strong>${user.name || 'there'}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155;">
        Your ShopSphere customer account has been created successfully. You can now explore thousands of premium products, track your orders in real-time, maintain your wishlist, and experience seamless checkout.
      </p>

      <div class="card">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5;">Your Account Highlights</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          <li style="margin-bottom: 6px;"><strong>Registered Email:</strong> ${user.email}</li>
          <li style="margin-bottom: 6px;"><strong>Fast & Secure Checkout:</strong> Saved addresses and live order updates.</li>
          <li style="margin-bottom: 6px;"><strong>Curated Catalog:</strong> Top deals in Electronics, Fashion, Home, and more.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${APP_URL}" class="btn">Start Shopping Now</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
        If you did not create this account, please ignore this email or contact support.
      </p>
    `
  );

  return sendEmail(recipient, subject, html);
}

/**
 * 2. Order Confirmation Email
 * Automatically triggered when a customer places an order
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = order.userEmail?.trim();
  if (!recipient) {
    return { success: false, error: 'Order user email is missing' };
  }

  const subject = `Order Confirmed: #${order.orderNumber} - Thank You for Your Purchase! 📦`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td>
        <strong style="color: #0f172a;">${item.product?.title || item.productId}</strong>
        ${item.selectedVariant ? `<div style="font-size: 11px; color: #64748b;">Variant: ${item.selectedVariant}</div>` : ''}
        ${item.selectedColor ? `<div style="font-size: 11px; color: #64748b;">Color: ${item.selectedColor}</div>` : ''}
        ${item.selectedSize ? `<div style="font-size: 11px; color: #64748b;">Size: ${item.selectedSize}</div>` : ''}
      </td>
      <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
      <td style="text-align: right; color: #64748b;">$${item.unitPrice.toFixed(2)}</td>
      <td style="text-align: right; font-weight: 700; color: #0f172a;">$${item.totalPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  const statusLabel = (order.orderStatus || 'processing').toUpperCase();

  const html = wrapEmailHtml(
    subject,
    `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 40px;">✅</span>
        <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Order Placed Successfully!</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Order Number: <strong style="color: #4f46e5; font-family: monospace;">#${order.orderNumber}</strong>
        </p>
      </div>

      <p style="font-size: 14px; color: #334155;">
        Dear <strong>${order.userName || 'Customer'}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155;">
        Thank you for your order! We have received your purchase and our team is preparing it for shipment. Below is a complete summary of your order:
      </p>

      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Current Order Status</span>
          <span class="badge badge-processed" style="margin-left: auto;">${statusLabel}</span>
        </div>
        <div style="font-size: 13px; color: #64748b;">
          Placed on: <strong>${new Date(order.createdAt).toLocaleString()}</strong>
        </div>
      </div>

      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 8px 0;">Order Items Summary</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals Table -->
      <div style="margin-left: auto; width: 100%; max-width: 280px; margin-top: 16px;">
        <table style="margin: 0;">
          <tr>
            <td style="color: #64748b; padding: 6px 12px;">Subtotal:</td>
            <td style="text-align: right; padding: 6px 12px; font-weight: 600;">$${order.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 12px;">Tax (8.25%):</td>
            <td style="text-align: right; padding: 6px 12px; font-weight: 600;">$${order.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 12px;">Shipping (${order.shippingMethod}):</td>
            <td style="text-align: right; padding: 6px 12px; font-weight: 600;">${order.shippingFee === 0 ? 'FREE' : `$${order.shippingFee.toFixed(2)}`}</td>
          </tr>
          <tr style="border-top: 2px solid #e2e8f0;">
            <td style="color: #0f172a; font-size: 15px; font-weight: 800; padding: 10px 12px;">Grand Total:</td>
            <td style="text-align: right; font-size: 16px; font-weight: 800; color: #4f46e5; padding: 10px 12px;">$${order.grandTotal.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping & Payment Address -->
      <div class="card" style="margin-top: 24px;">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Delivery Information</h4>
        <p style="margin: 0; font-size: 13px; color: #334155;">
          <strong>Recipient:</strong> ${order.shippingAddress.fullName}<br>
          <strong>Address:</strong> ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}<br>
          <strong>Country:</strong> ${order.shippingAddress.country}<br>
          <strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${APP_URL}" class="btn">View & Track Order</a>
      </div>
    `
  );

  return sendEmail(recipient, subject, html);
}

/**
 * 3. Order Status Update Email
 * Automatically triggered when an order status changes to Processed, Out for Delivery, or Delivered
 */
export async function sendOrderStatusUpdateEmail(
  order: Order,
  newStatus: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = order.userEmail?.trim();
  if (!recipient) {
    return { success: false, error: 'Order user email is missing' };
  }

  // Normalize status string
  const normStatus = newStatus.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isCod = order.paymentMethod === 'cod';
  
  let statusTitle = 'Order Status Updated';
  let statusBadgeClass = 'badge-processed';
  let statusIcon = '📦';
  let statusDescription = 'Your order status has been updated.';

  if (normStatus === 'processed' || normStatus === 'processing') {
    statusTitle = 'Your Order Has Been Processed! ⚙️';
    statusBadgeClass = 'badge-processed';
    statusIcon = '🏭';
    statusDescription = 'Great news! Your order has been processed by our warehouse and is being carefully packaged for shipment.';
  } else if (normStatus === 'out_for_delivery' || normStatus === 'shipped') {
    statusTitle = isCod
      ? 'Your COD Order is Out for Delivery! 🚚'
      : 'Your Order is Out for Delivery! 🚚';
    statusBadgeClass = 'badge-out_for_delivery';
    statusIcon = '🚚';
    statusDescription = isCod
      ? `Exciting news! Your Cash on Delivery order is out for delivery. Please keep cash (${order.grandTotal.toFixed(2)}) or UPI ready to pay the delivery executive upon arrival.`
      : 'Exciting news! Your package is currently out for delivery and will arrive at your shipping address soon.';
  } else if (normStatus === 'delivered' || normStatus === 'completed') {
    statusTitle = isCod
      ? 'Your COD Order Has Been Delivered & Paid! 🎉'
      : 'Your Order Has Been Delivered! 🎉';
    statusBadgeClass = 'badge-delivered';
    statusIcon = '🏡';
    statusDescription = isCod
      ? `Your package has been safely delivered and your Cash/UPI payment of ${order.grandTotal.toFixed(2)} has been verified and confirmed. Thank you for shopping with ShopSphere!`
      : 'Your package has been safely delivered to your address. Thank you for shopping with ShopSphere!';
  } else if (normStatus === 'cancelled') {
    statusTitle = 'Your Order Has Been Cancelled ❌';
    statusBadgeClass = 'badge-cancelled';
    statusIcon = '❌';
    statusDescription = `Your order #${order.orderNumber} has been cancelled. If any payment was captured, a refund will be processed to the original payment source.`;
  } else {
    statusTitle = `Order #${order.orderNumber} Status Update: ${newStatus}`;
  }

  const subject = `Update on Order #${order.orderNumber}: ${newStatus.toUpperCase()} ${statusIcon}`;

  const itemsList = order.items.map(item => `
    <li style="margin-bottom: 6px;">
      <strong>${item.product?.title || item.productId}</strong> (Qty: ${item.quantity}) - ${item.totalPrice.toFixed(2)}
    </li>
  `).join('');

  const html = wrapEmailHtml(
    subject,
    `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 44px;">${statusIcon}</span>
        <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">${statusTitle}</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Order: <strong style="color: #4f46e5; font-family: monospace;">#${order.orderNumber}</strong>
        </p>
      </div>

      <p style="font-size: 14px; color: #334155;">
        Hi <strong>${order.userName || 'Customer'}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155;">
        ${statusDescription}
      </p>

      <!-- Status Highlight Card -->
      <div class="card" style="border-left: 4px solid #4f46e5;">
        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Updated Status</div>
        <div style="margin-top: 6px;">
          <span class="badge ${statusBadgeClass}" style="font-size: 13px; padding: 6px 16px;">
            ${newStatus.toUpperCase()}
          </span>
        </div>
        ${order.trackingNumber ? `
          <div style="margin-top: 12px; font-size: 13px; color: #475569;">
            <strong>Tracking Number:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${order.trackingNumber}</code>
          </div>
        ` : ''}
      </div>

      ${(normStatus === 'out_for_delivery' || normStatus === 'shipped') && isCod ? `
        <!-- COD Out for delivery Payment Notice -->
        <div class="card" style="background: #fffbeb; border: 2px dashed #f59e0b; padding: 20px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; text-transform: uppercase;">
            💵 Cash on Delivery - Pay Delivery Executive
          </h4>
          <p style="font-size: 13px; color: #78350f; margin: 0 0 8px 0;">
            Total Due: <strong style="font-size: 16px; color: #b45309;">${order.grandTotal.toFixed(2)}</strong>
          </p>
          <p style="font-size: 13px; color: #78350f; margin: 0 0 12px 0;">
            Please pay the delivery executive via <strong>Cash</strong> or <strong>UPI</strong>. Once paid, click the button below or visit your orders page to select <strong>"Paid to Delivery Boy"</strong>.
          </p>
          <div style="text-align: center;">
            <a href="${APP_URL}" class="btn" style="background: #d97706;">Select Paid to Delivery Boy</a>
          </div>
        </div>
      ` : ''}

      <!-- Quick Order Summary -->
      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">Order Details</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          ${itemsList}
        </ul>
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">
          Total Amount: ${order.grandTotal.toFixed(2)}
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="font-size: 13px; color: #64748b; margin-top: 16px;">
        <strong>Delivering to:</strong> ${order.shippingAddress.fullName}, ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}
      </div>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${APP_URL}" class="btn">View Live Order Tracking</a>
      </div>
    `
  );

  return sendEmail(recipient, subject, html);
}


/**
 * 4. COD Payment Marked by Customer - Admin Alert Email
 * Triggered when customer clicks "Paid to Delivery Boy".
 * Alerts admin to verify payment and approve the order to "delivered".
 */
export async function sendCodPaymentMarkedAdminAlert(
  order: Order
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recipient = EMAIL_FROM || SMTP_USER;
  const subject = `⚠️ COD Payment Received: Customer Marked Order #${order.orderNumber} as Paid to Delivery Boy`;

  const html = wrapEmailHtml(
    subject,
    `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 44px;">💵</span>
        <h2 style="font-size: 22px; color: #0f172a; margin: 12px 0 6px 0;">Customer Marked COD as Paid</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Action required: Verify cash/UPI receipt with delivery executive and approve order as Delivered.
        </p>
      </div>

      <div class="card" style="background: #fffbeb; border: 1px solid #fef3c7;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase;">
            COD Verification Alert
          </span>
          <span class="badge badge-out_for_delivery">
            PAID TO DELIVERY BOY
          </span>
        </div>
        <p style="font-size: 14px; color: #78350f; margin: 0 0 10px 0;">
          Customer <strong>${order.shippingAddress.fullName}</strong> (${order.userEmail}) has marked Order <strong>#${order.orderNumber}</strong> as paid to the delivery executive.
        </p>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 8px;">
          Amount Collected: <span style="color: #059669;">${order.grandTotal.toFixed(2)}</span> (via Cash or UPI)
        </div>
      </div>

      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #475569;">Delivery Information</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          <li><strong>Recipient:</strong> ${order.shippingAddress.fullName}</li>
          <li><strong>Phone:</strong> ${order.shippingAddress.phone || 'N/A'}</li>
          <li><strong>Address:</strong> ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}</li>
          <li><strong>Tracking Number:</strong> ${order.trackingNumber || 'N/A'}</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #475569; text-align: center;">
        Please log into the Admin Console, verify that the delivery executive received the funds, and approve the status as <strong>Delivered</strong>. Once approved, the customer will automatically receive their official Order Delivered confirmation.
      </p>

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${APP_URL}" class="btn">Open Admin Console</a>
      </div>
    `
  );

  return sendEmail(recipient, subject, html);
}

/**
 * Test SMTP Connection and send test verification email
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `Zoho Mail SMTP Test Verification - ShopSphere`;
  const html = wrapEmailHtml(
    subject,
    `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 40px;">🧪</span>
        <h2 style="font-size: 20px; color: #0f172a; margin: 8px 0;">Zoho Mail SMTP Connected!</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Automated transactional email service is active.</p>
      </div>

      <div class="card">
        <h4 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #4f46e5;">Active SMTP Settings</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
          <li><strong>Host:</strong> ${SMTP_HOST}</li>
          <li><strong>Port:</strong> ${SMTP_PORT} (SSL: ${SMTP_SECURE})</li>
          <li><strong>Authenticated User:</strong> ${SMTP_USER}</li>
          <li><strong>Sender From:</strong> ${EMAIL_FROM}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
      </div>

      <p style="font-size: 13px; color: #475569; text-align: center;">
        Your ShopSphere transactional email pipeline is configured and ready to send registration welcomes, order confirmations, and status updates.
      </p>
    `
  );

  return sendEmail(recipientEmail, subject, html);
}

/**
 * Core sendEmail executor with error handling (non-blocking, never throws)
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // If no credentials configured, log and gracefully skip
    if (!SMTP_PASS || !SMTP_USER) {
      console.warn(`[EmailService Warning]: SMTP credentials not fully set. Email '${subject}' to <${to}> skipped.`);
      return { success: false, error: 'SMTP credentials not configured in environment' };
    }

    const mailOptions = {
      from: EMAIL_FROM.includes('<') ? EMAIL_FROM : `"ShopSphere" <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    };

    // Primary attempt on configured port
    try {
      const mailer = getTransporter();
      const info = await mailer.sendMail(mailOptions);
      console.log(`✉️ [EmailService]: Sent '${subject}' to <${to}> via port ${SMTP_PORT} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (primaryError: any) {
      console.warn(`⚠️ [EmailService]: Port ${SMTP_PORT} failed (${primaryError.message}). Retrying on alternative port 587 (TLS)...`);
      const fallbackMailer = createTransporter(587, false);
      const fallbackInfo = await fallbackMailer.sendMail(mailOptions);
      console.log(`✉️ [EmailService]: Sent '${subject}' to <${to}> via fallback port 587 (MessageId: ${fallbackInfo.messageId})`);
      return { success: true, messageId: fallbackInfo.messageId };
    }
  } catch (error: any) {
    console.error(`❌ [EmailService Error]: Failed to send email to <${to}>:`, error?.message || error);
    // Explicitly do not rethrow so caller business logic is never interrupted
    return { success: false, error: error?.message || 'Unknown email transmission error' };
  }
}
