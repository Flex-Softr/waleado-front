# Waleado Frontend Dashboard

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Radix UI](https://img.shields.io/badge/Radix_UI-Components-161618?style=for-the-badge&logo=radix-ui)

**Modern, responsive web dashboard for WhatsApp marketing, visual chatbot automation, multi-session management, AI campaign builders, and real-time live chat.**

</div>

---

## 📌 Overview

`waleado-front` is the client-side single-page dashboard application built with **Next.js 16 (Turbopack, App Router)**, **React 19**, and **Tailwind CSS v4**. It features an elegant design system crafted around the Waleado brand (Outfit typography, bold sidebars, emerald/slate palette, and theme-adaptive brand logos), complete with intuitive wizards, real-time analytics, and visual automation builders.

---

## ✨ Features & Modules

### 1. Multi-Device Management (`/devices`)
- **Live QR Streaming & Code Pairing**: Instant scan-to-connect via WhatsApp Web protocol.
- **Session Health Monitor**: Battery level, sync status, connection badges, and disconnect controls.

### 2. Bulk Message Campaigns (`/bulk-messages`)
- **6-Step Interactive Wizard**:
  1. *Setup*: Multi-device selection with Single, Failover, or Round-Robin modes.
  2. *Message*: Text templates, dynamic variables, spintax generator, and media attachments.
  3. *AI Rewrite*: Live text permutations using OpenAI, Gemini, Claude, DeepSeek, or Groq.
  4. *Audience*: Segmented contact groups, verified contacts filter, or raw manual list.
  5. *Schedule & Pacing*: Immediate or scheduled time with randomized delay intervals.
  6. *Protection*: Anti-block safety thresholds, quiet hours, and auto-batch pauses.
- **Detailed Campaign Analytics**: Delivery rates, seen receipts, replies, failed errors, and CSV/XLSX export.

### 3. Visual Chatbot Builder (`/chatbot`)
- **Node-Based Canvas**: Build automated conversation trees with message cards, menu choices, delay nodes, and AI agents.
- **Keyword Triggers**: Exact match, fuzzy match, contains, and wildcard routing.

### 4. Automated Call Responder (`/call-responder`)
- **Missed Call Auto-Replies**: Automatically sends pre-configured WhatsApp messages when incoming calls are missed, rejected, or timed out.
- **Dynamic Tags & Cooldowns**: Insert `{{phone}}`, `{{name}}`, `{{time}}`, and Spintax `{Hello|Hi|Hey}` with toggleable active status.

### 5. Omnichannel Live Chat (`/live-chat`)
- **Unified Conversation Inbox**: Real-time two-way messaging with customers.
- **Seamless Message Synchronization**: Real-time integration with bulk campaign replies and call responder responses.
- **Media & Voice Notes**: In-browser audio recording, image sharing, and document attachments.

### 6. Contact Management & Group Grabber (`/contacts`, `/group-grabber`)
- **Group Contact Scraper**: Extract participants from linked WhatsApp groups into segmented lists in seconds.
- **Bulk CSV/XLSX Importer**: Standardized international phone number formatting and verification.

### 7. Administration & Billing (`/admin`, `/billing`)
- **Subscription Checkout**: Integrated with SSLCommerz (Credit Cards, bKash, Nagad, Rocket, Net Banking) and Stripe.
- **Usage Quotas & Plan Limits**: Dynamic feature gating according to active subscription plan.

---

## 🎨 Design System & Theme

- **Typography**: Primary body text rendered in `Outfit`, headings in clean geometric sans.
- **Color Palette**: Brand Emerald (`#10b981`), Deep Slate (`#0f172a`), and Neutral borders.
- **Adaptive Logo**: Dynamic vector logo automatically switching between dark and light modes.
- **Organized Sidebar Navigation**: Divided into intuitive functional groups:
  - 💬 **Communication**: Live Chat, Single Message, Bulk Messages, Templates.
  - ⚡ **Automation**: Auto Reply, Chatbot, Call Responder.
  - 👥 **Audience**: Contacts, Group Grabber.
  - 🤖 **AI & Tools**: AI Skills, AI Credentials, API Docs, API Credentials.
  - ⚙️ **Administration**: Devices, Notifications, Billing, Profile, Admin Panel.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS v4, PostCSS, `@tailwindcss/postcss`
- **Component Primitives**: Radix UI / Shadcn UI / `@base-ui/react`
- **Icons**: `lucide-react` & `@remixicon/react`
- **Charts & Data**: `recharts`
- **Notifications**: `sonner`
- **File Handling**: `papaparse` & `xlsx`
- **QR Code**: `qrcode.react`

---

## 📁 Directory Structure

```
waleado-front/
├── public/
│   ├── logo-light.svg         # Adaptive brand logo (for dark theme)
│   ├── logo-dark.svg          # Adaptive brand logo (for light theme)
│   └── icons/
├── src/
│   ├── app/                   # Next.js App Router pages and layouts
│   │   ├── (auth)/            # Login, Register, Password Reset
│   │   ├── admin/             # System Administration
│   │   ├── bulk-messages/     # Campaign management & detail analytics
│   │   ├── call-responder/    # Missed call responder configuration
│   │   ├── chatbot/           # Interactive visual chatbot canvas
│   │   ├── contacts/          # Contact lists & group viewer
│   │   ├── devices/           # QR code & WhatsApp session linker
│   │   ├── group-grabber/     # Group contact scraper
│   │   ├── live-chat/         # Real-time chat inbox
│   │   └── layout.tsx         # Root layout with sidebar and theme providers
│   ├── components/            # Reusable UI primitives (Button, Modal, Table, etc.)
│   ├── features/              # Feature-specific components and business hooks
│   │   ├── bulk-messages/
│   │   ├── call-responder/
│   │   ├── chatbot/
│   │   ├── devices/
│   │   ├── live-chat/
│   │   └── shared/
│   ├── hooks/                 # Custom React hooks (pagination, auth, debounce)
│   ├── lib/                   # API clients, token storage, and formatting utilities
│   └── types/                 # TypeScript type definitions for API responses
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the `waleado-front` directory:

```env
# Public API Server URL (Backend)
NEXT_PUBLIC_API_URL=http://localhost:4000

# Base Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm run start
```

---

## 📄 License

Proprietary — Developed for Waleado platform.
