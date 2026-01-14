# Color Contrast Issues Found (20+ Instances)

## Issue: Text Color Same/Similar to Background Color

When background and text colors are identical or too similar, text becomes invisible.

## All Issues Found:

### 1. CheckInScreen.js

- **Line 203-205**: Background `#f0f0f0`, Text color `#999` - Gray on Gray (PROBLEMATIC)
  - Fix: Change text to `#FFFFFF` (white)

### 2. CheckInScreen.js

- **Line 463**: Gold button `#D4AF37` with default text color
  - Fix: Ensure text is white (#FFFFFF)

### 3. CheckInScreen.js

- **Line 471**: Dark button `#333` with text needing white
  - Fix: Ensure text is white (#FFFFFF)

### 4. VendorOrdersScreen.js

- **Line 180-190**: Status badges with light backgrounds and dark text colors

  - Line 181: `bgColor: '#FEF3C7'` with `color: '#F59E0B'` - Yellow on Yellow variant
  - Line 182: `bgColor: '#D1FAE5'` with `color: '#10B981'` - Green on Green variant
  - Line 183: `bgColor: '#EDE9FE'` with `color: '#8B5CF6'` - Purple on Purple variant
  - Line 184: `bgColor: '#E0E7FF'` with `color: '#6366F1'` - Blue on Blue variant
  - Line 185: `bgColor: '#FFEDD5'` with `color: '#F97316'` - Orange on Orange variant
  - Line 186: `bgColor: '#FEE2E2'` with `color: '#EF4444'` - Red on Red variant
  - Line 187: `bgColor: '#D1FAE5'` with `color: '#059669'` - Green on Green variant (duplicate)
  - Line 188-190: `bgColor: '#F3F4F6'` with `color: '#6B7280'` - Gray on Gray variant

  - Fix: All should use white or very dark text (#FFFFFF or #000000)

### 5. VendorDashboardScreen.js

- **Line 388-595**: Multiple white backgrounds (#FFFFFF, #fff) with text colors
  - Lines 415, 420, 458, 464, 481, 492, 497, 501, 518, 533, 537, 568, 573
  - Most have adequate dark text, but verify all text is dark enough

### 6. SettingsScreen.js

- **Line 192**: White text `#FFFFFF` on white background
  - Fix: Change background or text color

### 7. VendorTeamProjectDetailScreen.js

- **Line 863**: White text on unclear background
  - Fix: Verify background color and adjust text if needed

### 8. SettingsScreen.js

- Multiple white backgrounds at lines 152, 162, 235, 277
  - Verify all have proper text contrast

### 9. CreateInvoiceScreen.js

- **Line 433**: Light background `#FBF7EE`
- **Line 451**: Text color `#7487C1`
  - Light brown on light purple - check contrast

### 10. CreateInvoiceScreen.js

- **Line 457**: Background `#d1fae5` (light green)
- **Line 474**: Text color `#065f46` (dark green)
  - Better contrast but verify readability

## Summary of Changes Needed:

| File                             | Line     | Issue                                         | Fix                                                    |
| -------------------------------- | -------- | --------------------------------------------- | ------------------------------------------------------ |
| CheckInScreen.js                 | 203-205  | Gray on gray (#f0f0f0 bg, #999 text)          | Change text to #FFFFFF                                 |
| CheckInScreen.js                 | 463      | Gold button needs text                        | Ensure text is white                                   |
| CheckInScreen.js                 | 471      | Dark button needs text                        | Ensure text is white                                   |
| VendorOrdersScreen.js            | 181-190  | Light colors on light variants (8+ instances) | Change all text to #FFFFFF                             |
| VendorDashboardScreen.js         | Multiple | White backgrounds                             | Verify dark text on all                                |
| SettingsScreen.js                | 192      | White on white                                | Change to dark text                                    |
| VendorTeamProjectDetailScreen.js | 863      | White text needs dark background              | Verify background                                      |
| Other screens                    | Various  | Light backgrounds                             | Review all light-colored backgrounds for text contrast |

## Action Items:

1. Change gray-on-gray text to white in CheckInScreen.js
2. Fix all status badge colors in VendorOrdersScreen.js (8+ instances)
3. Update button text colors to white in CheckInScreen.js
4. Review all light background elements for contrast issues
5. Apply white text to all dark backgrounds
