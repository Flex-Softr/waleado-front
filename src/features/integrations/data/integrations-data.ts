import type { IntegrationItem } from "@/types/integrations";

export const INTEGRATIONS_LIST: IntegrationItem[] = [
  {
    id: "whmcs",
    slug: "whmcs-module",
    name: "Waleado Suite for WHMCS",
    tagline: "Enterprise WhatsApp billing alerts, client lifecycle & 2FA OTP for WHMCS v8.x+",
    shortDescription:
      "Automate WHMCS invoice reminders, hosting provision alerts, ticket notifications, admin security warnings, and WhatsApp Two-Factor Authentication (2FA) OTP via Waleado Open API.",
    fullDescription:
      "Waleado Suite for WHMCS is a high-performance, enterprise-ready WhatsApp integration package designed specifically for web hosting providers and billing agencies. It seamlessly connects WHMCS v8.x+ directly to your Waleado workspace using secure Open API credentials (X-Client-Id & X-Client-Secret). Automatically keep clients informed on invoice generation, multi-stage payment reminders, payment receipts, service provisioning, suspensions, domain renewals, and support tickets, while providing instant WhatsApp OTP two-factor verification codes for both customer and administrator logins.",
    category: "Billing & Hosting",
    version: "v1.2.0",
    status: "available",
    badges: ["Official Addon", "Verified", "2FA Security Included", "WHMCS 8.x Ready"],
    rating: 4.9,
    reviewsCount: 38,
    lastUpdated: "September 2026",
    author: {
      name: "Waleado Core Team",
      url: "https://waleado.com",
      verified: true,
    },
    iconType: "whmcs",
    downloadUrl: "/downloads/waleado-whmcs.zip",
    downloadFilename: "waleado-whmcs.zip",
    downloadSize: "58 KB",
    compatibility: {
      platformVersion: "WHMCS 8.0 – 8.11+ (Latest)",
      phpVersion: "PHP 8.1 / 8.2+",
      requiresApiCredentials: true,
      requiresActiveDevice: true,
      testedWith: ["WHMCS 8.10", "WHMCS 8.11", "PHP 8.2", "Six Theme", "Twenty-One", "Lagom"],
    },
    tags: [
      "WHMCS",
      "Billing",
      "Invoices",
      "2FA OTP",
      "Hosting",
      "Support Tickets",
      "Domain Renewal",
      "Security Alerts",
    ],
    keyFeatures: [
      {
        title: "Automated Invoicing & Multi-tier Payment Reminders",
        description:
          "Trigger WhatsApp messages for new invoices, 1st/2nd/3rd reminders, overdue warnings, payment receipts with transaction IDs, and refund notifications.",
        badge: "Automated",
      },
      {
        title: "WhatsApp 2FA Security Module (`leadwhatsapp2fa`)",
        description:
          "Includes a standalone WHMCS Two-Factor Authentication module that delivers 6-digit WhatsApp OTP verification codes for client and admin panel logins.",
        badge: "Security",
      },
      {
        title: "Hosting & Cloud Service Provisioning Notices",
        description:
          "Notify customers on order acceptance, automated cPanel/Plesk account creation, suspension notices, and instant reactivation on payment.",
        badge: "Lifecycle",
      },
      {
        title: "Support Ticket Synchronization",
        description:
          "Keep customers updated instantly when tickets are opened, staff post replies, or tickets are resolved, preventing duplicate enquiries.",
        badge: "Real-time",
      },
      {
        title: "Real-time Administrator WhatsApp Alerts",
        description:
          "Sends instant WhatsApp notifications directly to the admin's personal number for new signups, critical tickets, and admin logins.",
        badge: "Admin Alert",
      },
      {
        title: "Built-in WHMCS Admin Dashboard & Template Editor",
        description:
          "Manage templates, insert dynamic merge tags, test API latency, monitor message audit logs, and trigger quick resends directly from WHMCS.",
        badge: "Management",
      },
    ],
    guide: {
      summary:
        "Follow these 5 simple steps to install, configure, and activate the Waleado Suite inside your WHMCS environment.",
      prerequisites: [
        "A running WHMCS v8.0+ installation (with PHP 8.1 or PHP 8.2 recommended)",
        "An active Waleado account with at least one connected WhatsApp device",
        "Waleado Open API Client ID (`fw_cid_...`) and Client Secret (`fw_csec_...`)",
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Download & Extract Module Package",
          description:
            "Download the official `waleado-whmcs.zip` archive and extract the addon and security modules into your WHMCS root directory.",
          codeSnippet: `# 1. Download or extract the archive
unzip waleado-whmcs.zip

# 2. Copy addon and 2FA modules to your WHMCS directory
cp -r modules/addons/leadwhatsapp /path/to/whmcs/modules/addons/
cp -r modules/security/leadwhatsapp2fa /path/to/whmcs/modules/security/`,
          codeLanguage: "bash",
          note: "Ensure proper file permissions (chmod 755 for directories, 644 for files).",
        },
        {
          stepNumber: 2,
          title: "Activate Addon Module in WHMCS",
          description:
            "Log into your WHMCS Admin Area. Navigate to System Settings (wrench icon) > Addon Modules. Find 'LeadWhatsApp Suite' and click Activate.",
          note: "Click 'Configure' after activation to grant 'Full Administrator' access control.",
        },
        {
          stepNumber: 3,
          title: "Configure Open API Credentials",
          description:
            "Enter your Waleado API URL and API keys generated from your Waleado workspace (`/api-credentials`).",
          codeSnippet: `# WHMCS Configuration Fields:
LeadWhatsApp API URL:     https://api.waleado.com (or your instance URL)
API Client ID:            fw_cid_your_client_id_here
API Client Secret:        fw_csec_your_client_secret_here
Admin WhatsApp Number:    +88017XXXXXXXX (International format with +)
Default Country Code:     880 (Calling code without + sign)
Access Control:           [X] Full Administrator`,
          codeLanguage: "text",
          note: "Click 'Save Changes' at the bottom of the page.",
        },
        {
          stepNumber: 4,
          title: "Verify API Connection & Customize Templates",
          description:
            "In WHMCS Admin, open Addons > LeadWhatsApp Suite. Click 'Test API Connection' to verify connectivity to your connected WhatsApp device. Then switch to the 'Notification Templates' tab to customize message templates and merge tags.",
          note: "You can use the 'Quick / Test Sender' tab in WHMCS to send a test WhatsApp message to your own number.",
        },
        {
          stepNumber: 5,
          title: "Optional: Enable WhatsApp 2FA for Logins",
          description:
            "In WHMCS Admin, navigate to System Settings > Two-Factor Authentication. Locate 'WhatsApp Verification (LeadWhatsApp)' and click Activate. Clients and Administrators can now enable WhatsApp OTP 2FA in their account security settings.",
          note: "Clients will receive a 6-digit OTP code directly on WhatsApp when logging in.",
        },
      ],
    },
    mergeTags: [
      {
        tag: "{client_name}",
        description: "Full name of the WHMCS client (First + Last)",
        example: "John Doe",
        category: "Client",
      },
      {
        tag: "{client_email}",
        description: "Client's registered email address",
        example: "john@example.com",
        category: "Client",
      },
      {
        tag: "{client_id}",
        description: "Unique WHMCS Client ID number",
        example: "1042",
        category: "Client",
      },
      {
        tag: "{company_name}",
        description: "Your company or brand name configured in WHMCS",
        example: "Acme Cloud Hosting",
        category: "System",
      },
      {
        tag: "{invoice_id}",
        description: "Invoice number / ID",
        example: "45892",
        category: "Invoice",
      },
      {
        tag: "{invoice_total}",
        description: "Formatted total amount of the invoice",
        example: "$29.99 USD",
        category: "Invoice",
      },
      {
        tag: "{due_date}",
        description: "Due date of the invoice (formatted)",
        example: "2026-10-15",
        category: "Invoice",
      },
      {
        tag: "{invoice_url}",
        description: "Direct link for the client to view and pay the invoice",
        example: "https://billing.example.com/viewinvoice.php?id=45892",
        category: "Invoice",
      },
      {
        tag: "{amount_paid}",
        description: "Amount paid in the payment transaction",
        example: "$29.99 USD",
        category: "Invoice",
      },
      {
        tag: "{trans_id}",
        description: "Payment gateway transaction ID",
        example: "TXN_88392193",
        category: "Invoice",
      },
      {
        tag: "{service_name}",
        description: "Product or service package name",
        example: "cPanel Premium SSD Cloud",
        category: "Service",
      },
      {
        tag: "{service_domain}",
        description: "Domain name associated with the service",
        example: "mywebsite.com",
        category: "Service",
      },
      {
        tag: "{domain_name}",
        description: "Registered domain name",
        example: "mybrand.org",
        category: "Domain",
      },
      {
        tag: "{expiry_date}",
        description: "Domain registration expiration date",
        example: "2027-04-10",
        category: "Domain",
      },
      {
        tag: "{ticket_id}",
        description: "Support ticket mask / ID",
        example: "#829104",
        category: "Ticket",
      },
      {
        tag: "{ticket_subject}",
        description: "Support ticket subject title",
        example: "Assistance with DNS migration",
        category: "Ticket",
      },
      {
        tag: "{ticket_url}",
        description: "Direct URL to the support ticket in client area",
        example: "https://billing.example.com/viewticket.php?tid=829104",
        category: "Ticket",
      },
      {
        tag: "{otp_code}",
        description: "6-digit One-Time Password for WhatsApp 2FA",
        example: "629104",
        category: "Security",
      },
    ],
    architecture: {
      protocol: "RESTful HTTPS (JSON Payload)",
      authMethod: "Header Authentication: X-Client-Id & X-Client-Secret",
      endpoints: [
        "POST /v1/open/messages/single (Direct message dispatch)",
        "GET /v1/open/devices/default (Health check & default device validation)",
        "POST /v1/open/contacts (Automatic client contact book sync)",
      ],
      supportedHooks: [
        "InvoiceCreated",
        "InvoicePaymentReminder",
        "InvoicePaid",
        "InvoiceRefunded",
        "ClientAdd",
        "ClientLogin",
        "AdminLogin",
        "AcceptOrder",
        "AfterModuleCreate",
        "AfterModuleSuspend",
        "AfterModuleUnsuspend",
        "AfterModuleTerminate",
        "DomainRenewal",
        "TicketOpen",
        "TicketAdminReply",
        "TicketClose",
        "DailyCronJob",
      ],
    },
    faqs: [
      {
        question: "How are international phone numbers handled?",
        answer:
          "The module includes a built-in E.164 phone normalizer (`PhoneHelper.php`). If a client enters a local number like 017XXXXXXXX, the module automatically strips leading zeroes and prepends your configured default country dial code (e.g. +880 or +1).",
      },
      {
        question: "Does the module require an active WhatsApp device in Waleado?",
        answer:
          "Yes. The module calls Waleado's Open API, which routes single messages through your default connected WhatsApp session. Make sure your WhatsApp session is linked and healthy in the Devices page.",
      },
      {
        question: "Can I customize individual notification message texts?",
        answer:
          "Absolutely! Inside WHMCS Admin > Addons > LeadWhatsApp Suite > Notification Templates, you can customize the text for every event and insert dynamic merge tags.",
      },
      {
        question: "Can I disable specific notification alerts?",
        answer:
          "Yes, each notification template has an active/disabled toggle switch in the WHMCS addon admin panel.",
      },
      {
        question: "How does the WhatsApp 2FA module work?",
        answer:
          "When a user or admin enables WhatsApp 2FA, WHMCS prompts for a 6-digit code during login. The module generates a cryptographically secure OTP and sends it in real-time via WhatsApp.",
      },
    ],
  },
  {
    id: "wordpress",
    slug: "wordpress-plugin",
    name: "Waleado WhatsApp for WordPress & WooCommerce",
    tagline: "WooCommerce order triggers, abandoned cart recovery & WhatsApp OTP login",
    shortDescription:
      "Connect your WordPress and WooCommerce stores with Waleado. Send real-time order updates, recover abandoned checkouts, offer passwordless WhatsApp OTP login, and display a multi-agent chat widget.",
    fullDescription:
      "Waleado for WordPress is the ultimate eCommerce communication plugin for WooCommerce and WordPress. It brings high-converting WhatsApp automation directly into your WordPress dashboard. Easily trigger real-time WhatsApp updates whenever customers place orders, payments are confirmed, or shipments are dispatched. Recover lost revenue with automated abandoned cart sequences, protect client accounts with fast WhatsApp OTP login and registration, and provide seamless live customer support via a customizable floating chat button.",
    category: "eCommerce & CMS",
    version: "v1.0.0-dev",
    status: "coming_soon",
    badges: ["Official Plugin", "In Active Development", "WooCommerce", "Early Access"],
    rating: 4.8,
    reviewsCount: 19,
    lastUpdated: "Roadmap: Q4 2026",
    author: {
      name: "Waleado Core Team",
      url: "https://waleado.com",
      verified: true,
    },
    iconType: "wordpress",
    compatibility: {
      platformVersion: "WordPress 6.0 – 6.7+ / WooCommerce 7.0 – 9.x+",
      phpVersion: "PHP 7.4 – 8.3+",
      requiresApiCredentials: true,
      requiresActiveDevice: true,
      testedWith: [
        "WordPress 6.6+",
        "WooCommerce 9.2",
        "Elementor",
        "Contact Form 7",
        "WPForms",
        "Fluent Forms",
      ],
    },
    tags: [
      "WordPress",
      "WooCommerce",
      "Abandoned Cart",
      "Order Tracking",
      "OTP Login",
      "Floating Chat",
      "Form Alerts",
    ],
    keyFeatures: [
      {
        title: "WooCommerce Order Status Automation",
        description:
          "Send instant WhatsApp messages when orders are Created, Processing, Completed, Cancelled, or Shipped with carrier tracking links.",
        badge: "eCommerce",
      },
      {
        title: "Smart Abandoned Cart Recovery Sequences",
        description:
          "Automatically re-engage shoppers who abandon items at checkout with friendly WhatsApp reminders and one-click cart restoration links.",
        badge: "Revenue Growth",
      },
      {
        title: "Passwordless WhatsApp OTP Login & Registration",
        description:
          "Allow customers and subscribers to log into WordPress and WooCommerce instantly using a 6-digit WhatsApp OTP code, eliminating password fatigue.",
        badge: "User Experience",
      },
      {
        title: "Multi-Agent Floating WhatsApp Chat Widget",
        description:
          "Display a lightweight floating WhatsApp button on your storefront with customizable agent avatars, department selection, and pre-filled greeting texts.",
        badge: "Live Chat",
      },
      {
        title: "Form Submission WhatsApp Alerts",
        description:
          "Receive instant alerts and notify customers when leads submit Contact Form 7, WPForms, Gravity Forms, Fluent Forms, or Elementor Pro forms.",
        badge: "Lead Capture",
      },
      {
        title: "Native Visual Template & Merge Tag Builder",
        description:
          "Effortlessly craft WhatsApp templates with dynamic WooCommerce tags like `{customer_name}`, `{order_id}`, `{order_total}`, and `{tracking_url}`.",
        badge: "Customization",
      },
    ],
    guide: {
      summary:
        "Preview of the upcoming 1-click installation & configuration process for the Waleado WordPress plugin.",
      prerequisites: [
        "WordPress 6.0 or higher with WooCommerce (optional for eCommerce triggers)",
        "Waleado workspace with connected WhatsApp device",
        "Waleado Open API Client ID and Secret key",
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Install via WordPress Plugin Directory or ZIP",
          description:
            "From your WordPress Admin dashboard, go to Plugins > Add New. Upload the plugin zip archive or search for 'Waleado WhatsApp' once published.",
          codeSnippet: `# Optional CLI installation via WP-CLI:
wp plugin install waleado-whatsapp --activate`,
          codeLanguage: "bash",
          note: "Compatible with standard single-site and WordPress Multisite installations.",
        },
        {
          stepNumber: 2,
          title: "Connect Your Waleado Account",
          description:
            "Go to Waleado Settings in wp-admin. Paste your API Base URL, Client ID, and Client Secret. Click 'Validate & Connect' for instant handshake.",
          note: "A green badge will confirm connectivity with your active Waleado device.",
        },
        {
          stepNumber: 3,
          title: "Enable WooCommerce & Form Triggers",
          description:
            "Toggle on automatic order notifications, select which order statuses send WhatsApp messages, configure abandoned cart timers (e.g. 1 hour, 24 hours), and customize message templates.",
          note: "Includes pre-built high-converting templates for all standard eCommerce events.",
        },
        {
          stepNumber: 4,
          title: "Configure Floating Chat & WhatsApp OTP",
          description:
            "Customize the floating chat widget design, position, colors, agent names, and enable WhatsApp OTP for the WooCommerce checkout and my-account login pages.",
          note: "Test in preview mode before making the chat widget live on your storefront.",
        },
      ],
    },
    mergeTags: [
      {
        tag: "{billing_first_name}",
        description: "Customer's billing first name",
        example: "Sarah",
        category: "Customer",
      },
      {
        tag: "{order_id}",
        description: "WooCommerce order number",
        example: "#10928",
        category: "Order",
      },
      {
        tag: "{order_total}",
        description: "Total order amount including currency symbol",
        example: "$89.50",
        category: "Order",
      },
      {
        tag: "{order_status}",
        description: "Current order status (e.g. Processing, Completed)",
        example: "Processing",
        category: "Order",
      },
      {
        tag: "{items_summary}",
        description: "List of purchased items and quantities",
        example: "2x Wireless Earbuds, 1x Case",
        category: "Order",
      },
      {
        tag: "{tracking_link}",
        description: "Direct courier shipment tracking URL",
        example: "https://track.courier.com/TRK90281",
        category: "Shipping",
      },
      {
        tag: "{cart_recovery_url}",
        description: "One-click link to restore abandoned cart items",
        example: "https://yourshop.com/checkout?recover_cart=abc123xyz",
        category: "Abandoned Cart",
      },
      {
        tag: "{otp_code}",
        description: "6-digit WhatsApp OTP verification code",
        example: "938201",
        category: "Security",
      },
      {
        tag: "{site_name}",
        description: "WordPress website name / store title",
        example: "TrendStore Online",
        category: "System",
      },
    ],
    architecture: {
      protocol: "RESTful HTTPS & WP Action Scheduler",
      authMethod: "Open API Client Credentials & HMAC Signature Verification",
      endpoints: [
        "POST /v1/open/messages/single (Instant order notifications & OTP)",
        "POST /v1/open/contacts (Sync WooCommerce buyers into Waleado CRM)",
        "GET /v1/open/devices/default (Health check)",
      ],
      supportedHooks: [
        "woocommerce_new_order",
        "woocommerce_order_status_changed",
        "woocommerce_cart_abandoned",
        "wp_login_otp_challenge",
        "wpforms_process_complete",
        "elementor_pro/forms/new_record",
      ],
    },
    faqs: [
      {
        question: "When will the WordPress plugin be released?",
        answer:
          "The plugin is currently under active development and internal testing. You can join the early beta waitlist right from this page to get notified as soon as it's ready!",
      },
      {
        question: "Will it work with popular form builders?",
        answer:
          "Yes! We are building first-class integrations for Contact Form 7, WPForms, Gravity Forms, Fluent Forms, and Elementor Forms.",
      },
      {
        question: "Is abandoned cart recovery fully automated?",
        answer:
          "Yes, the plugin uses WordPress Action Scheduler to automatically check for abandoned checkout sessions and send timely recovery messages without slowing down your site.",
      },
      {
        question: "Does it support custom order statuses?",
        answer:
          "Yes, any custom WooCommerce order statuses (e.g. from Order Status Manager plugins) will be automatically detected and mapped.",
      },
    ],
  },
];

export const INTEGRATION_CATEGORIES = [
  "All",
  "Billing & Hosting",
  "eCommerce & CMS",
  "CRM & Support",
  "Marketing & Automation",
] as const;

export const INTEGRATION_STATS = [
  {
    label: "Official Integrations",
    value: "2 Platforms",
    description: "WHMCS & WordPress / WooCommerce",
  },
  {
    label: "API Architecture",
    value: "REST Open API",
    description: "Header auth (X-Client-Id & Secret)",
  },
  {
    label: "WHMCS Module Status",
    value: "v1.2.0 Stable",
    description: "Tested on WHMCS 8.x + PHP 8.2",
  },
  {
    label: "Delivery Speed",
    value: "< 1.5s Latency",
    description: "Direct WhatsApp socket dispatch",
  },
];
