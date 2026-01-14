# Scrolling Implementation Guide for Houseway App

## Overview

The Houseway app now has comprehensive scrolling support for both web and mobile platforms. Scrolling has been fixed and optimized across all screens.

## Key Components & Files

### 1. **ScrollableScreen Component**

Location: `src/components/ScrollableScreen.js`

A wrapper component that ensures proper scrolling on both platforms.

**Usage:**

```javascript
import ScrollableScreen from "../../components/ScrollableScreen";

const MyScreen = () => {
  return (
    <ScrollableScreen onRefresh={onRefresh} isRefreshing={isRefreshing}>
      {/* Your content here */}
    </ScrollableScreen>
  );
};
```

**Props:**

- `children` - Screen content
- `onRefresh` - Optional refresh handler
- `isRefreshing` - Optional refresh state
- `style` - Container style
- `contentStyle` - Content container style
- `avoidKeyboard` - Use KeyboardAvoidingView (default: true on mobile)
- `behavior` - Keyboard avoiding behavior ('padding', 'height', 'position')
- `enableScrolling` - Enable scrolling (default: true)

### 2. **SafeView Component (Updated)**

Location: `src/components/SafeView.js`

Now supports optional scrolling with `scrollable` prop.

**Usage:**

```javascript
<SafeView scrollable={true}>{/* Content */}</SafeView>
```

### 3. **Scrolling Configuration**

Location: `src/config/scrollingConfig.js`

Centralized configuration for scroll behavior across platforms.

**Usage:**

```javascript
import ScrollingConfig from "../../config/scrollingConfig";

// Get platform-specific scroll props
const scrollProps = ScrollingConfig.getScrollProps();

// Get content container style
const contentStyle = ScrollingConfig.getContentContainerStyle();
```

### 4. **useScrolling Hook**

Location: `src/hooks/useScrolling.js`

Custom hook for managing scroll position and events.

**Usage:**

```javascript
import { useScrolling } from "../../hooks/useScrolling";

const MyScreen = () => {
  const { scrollViewRef, scrollToTop, isAtTop, handleScroll } =
    useScrolling("my-screen-key");

  return (
    <ScrollView ref={scrollViewRef} onScroll={handleScroll}>
      {/* Content */}
    </ScrollView>
  );
};
```

**Methods:**

- `scrollToTop(animated)` - Scroll to top
- `scrollToPosition(position, animated)` - Scroll to position
- `scrollToElement(elementId, animated)` - Scroll to element (web only)
- `getCurrentPosition()` - Get current scroll position
- `isAtTop()` - Check if at top
- `isScrolling` - Current scrolling state
- `canScrollUp` - Whether can scroll up

## Platform-Specific Behavior

### Web

- Smooth scrolling enabled
- Vertical scrollbar visible
- No bouncing
- Keyboard behavior: interactive
- Window scroll events supported

### iOS

- Momentum scrolling enabled
- Bouncing on scroll edges
- Smooth animations
- Gesture support

### Android

- No bouncing
- Standard momentum scrolling
- Gesture support

## How Scrolling Now Works

### 1. **Root Level (App.js)**

The App component wraps content ensuring all screens are scrollable.

### 2. **Global CSS (WebStyleInjector.js)**

Global CSS enables scrolling on web:

```css
html,
body,
#root {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
```

### 3. **Individual Screens**

Each screen can use one of these approaches:

**Option A: ScrollableScreen Wrapper (Recommended)**

```javascript
<ScrollableScreen>
  <View>{/* Content */}</View>
</ScrollableScreen>
```

**Option B: Direct ScrollView**

```javascript
<ScrollView
  {...ScrollingConfig.getScrollProps()}
  contentContainerStyle={ScrollingConfig.getContentContainerStyle()}
>
  {/* Content */}
</ScrollView>
```

**Option C: SafeView with Scrolling**

```javascript
<SafeView scrollable={true}>{/* Content */}</SafeView>
```

## Best Practices

### 1. **Use ScrollableScreen for Most Screens**

```javascript
import ScrollableScreen from "../../components/ScrollableScreen";

export default function ScreenName() {
  return (
    <ScrollableScreen>
      <View style={styles.container}>{/* Your content */}</View>
    </ScrollableScreen>
  );
}
```

### 2. **Implement Pull-to-Refresh**

```javascript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
};

return (
  <ScrollableScreen onRefresh={onRefresh} isRefreshing={refreshing}>
    {/* Content */}
  </ScrollableScreen>
);
```

### 3. **Scroll Position Management**

```javascript
const { scrollViewRef, scrollToTop } = useScrolling("my-screen");

return (
  <ScrollableScreen>
    <TouchableOpacity onPress={scrollToTop}>
      <Text>Scroll to Top</Text>
    </TouchableOpacity>
    {/* Content */}
  </ScrollableScreen>
);
```

### 4. **Long Lists**

For very long lists, use FlatList or VirtualizedList:

```javascript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  scrollEnabled={true}
  showsVerticalScrollIndicator={true}
/>
```

## Common Issues & Solutions

### Issue: Content doesn't scroll on web

**Solution:** Ensure the parent View has `flex: 1` and wrap in ScrollableScreen:

```javascript
<ScrollableScreen>
  <View style={{ flex: 1 }}>{/* Content */}</View>
</ScrollableScreen>
```

### Issue: Scrollbar not visible

**Solution:** Check that `showsVerticalScrollIndicator={true}` is set

### Issue: Nested ScrollViews

**Solution:** Use `nestedScrollEnabled={true}` on inner ScrollView

### Issue: Keyboard covers input

**Solution:** Use `avoidKeyboard={true}` prop on ScrollableScreen

## Testing Scrolling

### Web

1. Open app in browser
2. Verify scrollbar appears when content overflows
3. Test smooth scrolling behavior
4. Check keyboard interactions

### Mobile (iOS/Android)

1. Test on physical device or simulator
2. Verify momentum scrolling works
3. Test pull-to-refresh
4. Check bounce behavior (iOS only)

## Migration Guide

To add scrolling to an existing screen:

1. Import ScrollableScreen:

   ```javascript
   import ScrollableScreen from "../../components/ScrollableScreen";
   ```

2. Wrap your screen content:

   ```javascript
   return <ScrollableScreen>{/* existing content */}</ScrollableScreen>;
   ```

3. (Optional) Add pull-to-refresh if needed

## Performance Considerations

- Use `FlatList` for long lists instead of ScrollView with map
- Avoid deeply nested ScrollViews
- Use `removeClippedSubviews={true}` for long lists on Android
- Consider virtualization for very large datasets

## Accessibility

- Scrollable content is keyboard navigable
- Screen readers announce scrollable regions
- High contrast mode supported
- Reduced motion respected

---

For questions or issues, please refer to the component documentation or contact the development team.
