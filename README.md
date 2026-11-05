# Payment Tracker PWA

A high-performance Progressive Web App (PWA) built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**, designed with an iOS-inspired lavender summary card, dark/light bottom sheet, rounded corners, large hero typography, and integrated Web Speech voice commands with offline IndexedDB storage.

---

## 🎨 Visual Design & Style Tokens

| Element | Light Mode | Dark Mode | Description |
| :--- | :--- | :--- | :--- |
| **App Background** | `#F3F3F5` | `#0B0B0C` | Neutral backdrop |
| **Summary Card** | `#D9D4F2` (Lavender) | `#2A2740` (Deep Purple) | Rounded bottom corners (`rounded-b-4xl`) |
| **Bottom Sheet** | `#FFFFFF` | `#1C1C1E` | Drag handle, rounded top corners (`rounded-t-4xl`) |
| **Accent Badge** | `#5A9E2F` | `#5A9E2F` | Pill badge overlapping card edge |
| **Hero Number** | 44–56px Bold | 44–56px Bold | Decimals formatted at 40% size, muted |
| **Keypad Screen** | Custom Numeric | Custom Numeric | iOS Sent-To style with "Swipe to save › › ›" |

---

## 📱 Responsive Layout Ratios

- **Mobile View (<600px, base 390×844 & 430×932)**:
  - Single column layout
  - Top summary card occupies ~40%
  - Action row in the thumb zone
  - Bottom sheet occupies ~55% with smooth vertical scroll
- **Tablet Portrait (600–1024px, 820×1180)**:
  - Centered column (max 640px)
  - 3-column stats breakdown: Paid / Balance / Target
- **Tablet Landscape (≥1024px, 1180×820)**:
  - Two panes:
    - **Left Pane (40%)**: Summary Card + 3-Button Action Row + Offline status info
    - **Right Pane (60%)**: Recently Added transaction ledger & interactive filters

---

## 🚀 Key Features

1. **Top Summary Card**:
   - Greeting & current month display
   - Quick Theme switcher (Light / Dark) & Settings modal
   - Hero number with superscript decimals (e.g., `₹12,329.20`)
   - Remaining Balance & Monthly Target progress bar
   - Overlapping green pill badge showing `% Paid`
2. **Action Row**:
   - `[ Add Payment ]`: Opens the iOS "Sent To" numeric keypad
   - `[ 🎤 Mic ]`: Voice collection command with live audio visualizer
   - `[ Offline Paid ]`: Quick-records hand-to-hand cash collections tagged "Offline"
3. **Recently Added Bottom Sheet**:
   - Filter pills: `Day`, `Month`, `Year`
   - Pastel contact avatar circles with initials
   - Transaction list with date, note, and online/offline pill tags
   - Swipe left gesture to reveal Delete action
4. **Voice Commands (Web Speech API)**:
   - Example phrases:
     - *"Add 500 rupees from Ravi offline"*
     - *"Ravi paid 1200 cash"*
     - *"Add 300 for Priya"*
   - Live transcription stream & deterministic number parsing
   - Verification card: displays **Name — Amount — Type** before saving
   - Fallback: Gracefully opens manual entry form if speech recognition is unavailable or offline
5. **Full Offline Capabilities (IndexedDB via Dexie)**:
   - Transactions & app settings persisted locally in browser IndexedDB
   - Instant optimistic updates
   - Precached static assets with Service Worker (`vite-plugin-pwa`)
   - Installable PWA with install banner & update toast

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build & PWA Testing
```bash
npm run build
npm run preview
```
Visit `http://localhost:4173` to test the installed service worker, manifest, and offline caching.

---

## 🧪 Testing Viewports in Chrome / Edge DevTools

1. Open DevTools (`F12` or `Ctrl + Shift + I`).
2. Toggle Device Toolbar (`Ctrl + Shift + M`).
3. Select or enter the custom viewports:
   - **Phone Base**: `390 × 844` (iPhone 12/13/14)
   - **Large Phone**: `430 × 932` (iPhone 14/15 Pro Max)
   - **Tablet Portrait**: `820 × 1180` (iPad Air)
   - **Tablet Landscape**: `1180 × 820` (iPad Air Landscape)

