# Honda Service Center Management System - Design Guidelines

## Design Approach
**System Selected**: Material Design principles adapted for automotive service industry
**Rationale**: Data-intensive productivity application requiring clarity, consistency, and efficient workflows for daily operations by 12 staff members managing 45 bikes/day.

## Brand Implementation
- Primary: Honda Red (#CC0000) - navigation active states, primary CTAs, critical alerts
- Secondary: Black (#000000) - headers, primary text, sidebar background
- Accent: Bright Red (#E60000) - hover states, status indicators
- Supporting palette: 
  - Neutral grays (#F3F4F6, #E5E7EB, #9CA3AF) for backgrounds and borders
  - Status colors: Green (#10B981), Yellow (#F59E0B), Blue (#3B82F6), Purple (#8B5CF6)

## Typography System
**Fonts**: Inter or Roboto via Google Fonts CDN
- Headers: 24px/600 weight (page titles), 18px/600 (section headers)
- Body: 14px/400 (primary content), 12px/400 (supporting text, labels)
- Data/Numbers: 16px/500 (statistics, costs) with tabular-nums
- Buttons: 14px/500 uppercase tracking-wide

## Layout System
**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section margins: mb-6 to mb-8
- Grid gaps: gap-4 to gap-6
- Card spacing: p-6 interior, mb-4 between cards

**Grid Structure**:
- Dashboard stats: 4-column grid (lg:grid-cols-4, md:grid-cols-2, grid-cols-1)
- Service bays: 3-column grid (lg:grid-cols-3, md:grid-cols-2, grid-cols-1)
- Forms: Single column max-w-2xl
- Tables: Full width with horizontal scroll on mobile

## Component Library

### Navigation
- **Collapsible Sidebar**: 240px expanded, 64px collapsed, black background
- Honda logo + wordmark when expanded, icon only when collapsed
- Navigation items: Lucide icons (16px) + label, hover bg-gray-800, active bg-red-600
- Logout button: Fixed bottom position

### Cards & Containers
- **Stat Cards**: White background, rounded-lg, shadow-sm, border border-gray-200
- **Job Cards**: White background, p-4, hover:shadow-md transition
- **Bay Status Cards**: Conditional header (green/red), white body, status badge prominent

### Forms & Inputs
- **Text Inputs**: border-gray-300, rounded-md, px-3 py-2, focus:ring-2 focus:ring-red-500
- **Dropdowns**: Same styling as text inputs with chevron-down icon
- **Textareas**: min-h-24, same border/focus treatment
- **Labels**: text-sm font-medium text-gray-700, mb-1

### Buttons
- **Primary**: bg-red-600 hover:bg-red-700, white text, px-4 py-2, rounded-md, font-medium
- **Secondary**: border border-gray-300, hover:bg-gray-50
- **Icon Buttons**: p-2, rounded hover:bg-gray-100 (table actions)

### Data Display
- **Tables**: Striped rows (even:bg-gray-50), border-b on rows, sticky header on scroll
- **Status Badges**: Rounded-full, px-3 py-1, text-xs font-medium
  - Pending: bg-yellow-100 text-yellow-800
  - In Progress: bg-blue-100 text-blue-800
  - Quality Check: bg-purple-100 text-purple-800
  - Completed: bg-green-100 text-green-800
- **Bay Indicators**: w-3 h-3 rounded-full with pulse animation when occupied

### Modals
- **Overlay**: bg-black/50 backdrop-blur-sm
- **Modal Panel**: bg-white rounded-lg max-w-2xl, p-6, shadow-2xl
- **Header**: pb-4 border-b mb-4, close button absolute top-4 right-4

### Progress Bars
- Container: bg-gray-200 rounded-full h-4
- Fill: bg-gradient-to-r from-red-500 to-red-600, rounded-full, transition-width duration-500

## Animations
- Sidebar collapse: transition-all duration-300
- Card hover: transition-shadow duration-200
- Status updates: transition-colors duration-200
- Modal entrance: fade + scale animation
- NO decorative animations - focus on functional feedback only

## Responsive Breakpoints
- Mobile: < 640px (collapsed sidebar default, stacked cards, horizontal table scroll)
- Tablet: 640px-1024px (2-column grids, expanded sidebar optional)
- Desktop: > 1024px (multi-column grids, expanded sidebar default)

## Data Visualization
- Revenue display: Large numerals with "LKR" prefix, comma-separated thousands
- Percentages: Bold with % symbol, color-coded by context
- Time estimates: Badge format with clock icon
- Bay utilization: Circular progress indicator (green fill on gray ring)

## Images
**No hero images** - This is an internal dashboard application, not a marketing site. Focus entirely on data presentation and functional UI components. Honda logo in sidebar is the only branding image needed.