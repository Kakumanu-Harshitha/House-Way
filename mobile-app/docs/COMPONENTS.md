# Component Documentation

This document provides detailed information about the custom components used in the Houseway mobile application.

## Card3D Component

A 3D interactive card component with gradient backgrounds and touch animations.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | `['#4CAF50', '#45A049']` | Array of colors for gradient background |
| `children` | `ReactNode` | - | Content to render inside the card |
| `style` | `ViewStyle` | `{}` | Additional styles for the card container |
| `onPress` | `function` | - | Callback function when card is pressed |
| `glowEffect` | `boolean` | `false` | Whether to show glow effect on press |
| `maxRotation` | `number` | `3` | Maximum rotation angle in degrees |
| `disabled` | `boolean` | `false` | Whether the card is disabled |

### Usage

```jsx
import Card3D from '../components/Card3D';

// Basic usage
<Card3D colors={['#FF6B6B', '#4ECDC4']}>
  <Text>Card Content</Text>
</Card3D>

// With press handler and glow effect
<Card3D
  colors={['#9C27B0', '#7B1FA2']}
  onPress={() => navigation.navigate('Details')}
  glowEffect={true}
  maxRotation={5}
>
  <View style={styles.cardContent}>
    <Text style={styles.title}>Project Title</Text>
    <Text style={styles.description}>Project description...</Text>
  </View>
</Card3D>
```

### Features

- **3D Transform**: Subtle rotation on press for depth effect
- **Gradient Background**: Smooth color transitions
- **Glow Effect**: Optional glow animation on interaction
- **Touch Feedback**: Visual feedback on press
- **Customizable**: Flexible styling and content

## AnimatedProgressCircle Component

A circular progress indicator with smooth animations and customizable appearance.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `100` | Diameter of the circle in pixels |
| `progress` | `number` | `0` | Progress value between 0 and 1 |
| `colors` | `string[]` | `['#4CAF50', '#45A049']` | Colors for the progress arc |
| `strokeWidth` | `number` | `8` | Width of the progress stroke |
| `backgroundColor` | `string` | `'#E0E0E0'` | Background circle color |
| `showPercentage` | `boolean` | `true` | Whether to show percentage text |
| `textSize` | `number` | `16` | Font size of the percentage text |
| `textColor` | `string` | `'#333'` | Color of the percentage text |
| `duration` | `number` | `1000` | Animation duration in milliseconds |

### Usage

```jsx
import AnimatedProgressCircle from '../components/AnimatedProgressCircle';

// Basic usage
<AnimatedProgressCircle
  progress={0.75}
  size={120}
/>

// Customized appearance
<AnimatedProgressCircle
  size={80}
  progress={0.45}
  colors={['#FF9800', '#F57C00']}
  strokeWidth={6}
  showPercentage={true}
  textSize={14}
  duration={1500}
/>

// Without percentage text
<AnimatedProgressCircle
  progress={0.60}
  showPercentage={false}
  colors={['#2196F3', '#1976D2']}
/>
```

### Features

- **Smooth Animation**: Animated progress changes
- **Gradient Colors**: Support for gradient progress arcs
- **Customizable Size**: Flexible sizing options
- **Text Display**: Optional percentage text overlay
- **Performance Optimized**: Uses native animations

## GradientBackground Component

A flexible gradient background component with multiple gradient types.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colors` | `string[]` | `['#4CAF50', '#45A049']` | Array of gradient colors |
| `type` | `'linear' \| 'radial'` | `'linear'` | Type of gradient |
| `direction` | `string` | `'to bottom'` | Gradient direction (CSS-style) |
| `children` | `ReactNode` | - | Content to render over the gradient |
| `style` | `ViewStyle` | `{}` | Additional styles |

### Usage

```jsx
import GradientBackground from '../components/GradientBackground';

// Linear gradient
<GradientBackground
  colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
  type="linear"
  direction="to bottom right"
>
  <Text>Content over gradient</Text>
</GradientBackground>

// Radial gradient
<GradientBackground
  colors={['#9C27B0', '#7B1FA2']}
  type="radial"
>
  <View style={styles.content}>
    {/* Your content */}
  </View>
</GradientBackground>
```

## LoadingSpinner Component

A customizable loading spinner with various animation types.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'small' \| 'large' \| number` | `'large'` | Size of the spinner |
| `color` | `string` | `'#4CAF50'` | Color of the spinner |
| `type` | `'default' \| 'pulse' \| 'bounce'` | `'default'` | Animation type |
| `text` | `string` | - | Optional loading text |

### Usage

```jsx
import LoadingSpinner from '../components/LoadingSpinner';

// Basic spinner
<LoadingSpinner />

// With custom color and text
<LoadingSpinner
  color="#FF9800"
  text="Loading projects..."
  size="large"
/>

// Pulse animation
<LoadingSpinner
  type="pulse"
  color="#2196F3"
/>
```

## StatusBadge Component

A badge component for displaying status information with color coding.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `string` | - | Status text to display |
| `type` | `'success' \| 'warning' \| 'error' \| 'info'` | `'info'` | Badge type for color |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Badge size |
| `customColor` | `string` | - | Custom background color |

### Usage

```jsx
import StatusBadge from '../components/StatusBadge';

// Status badges
<StatusBadge status="Completed" type="success" />
<StatusBadge status="In Progress" type="info" />
<StatusBadge status="Pending" type="warning" />
<StatusBadge status="Cancelled" type="error" />

// Custom color
<StatusBadge
  status="Custom Status"
  customColor="#9C27B0"
  size="large"
/>
```

## SearchBar Component

A search input component with built-in filtering capabilities.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `value` | `string` | - | Current search value |
| `onChangeText` | `function` | - | Callback when text changes |
| `onSearch` | `function` | - | Callback when search is submitted |
| `showClearButton` | `boolean` | `true` | Whether to show clear button |
| `autoFocus` | `boolean` | `false` | Whether to auto-focus on mount |

### Usage

```jsx
import SearchBar from '../components/SearchBar';

const [searchQuery, setSearchQuery] = useState('');

<SearchBar
  placeholder="Search projects..."
  value={searchQuery}
  onChangeText={setSearchQuery}
  onSearch={(query) => performSearch(query)}
  showClearButton={true}
/>
```

## FilterButton Component

A button component for filter selection with active state styling.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Button text |
| `active` | `boolean` | `false` | Whether button is active |
| `onPress` | `function` | - | Callback when pressed |
| `count` | `number` | - | Optional count badge |

### Usage

```jsx
import FilterButton from '../components/FilterButton';

<FilterButton
  title="All Projects"
  active={selectedFilter === 'all'}
  onPress={() => setSelectedFilter('all')}
  count={totalProjects}
/>
```

## EmptyState Component

A component for displaying empty state messages with optional actions.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `string` | `'📋'` | Emoji or icon to display |
| `title` | `string` | - | Main title text |
| `description` | `string` | - | Description text |
| `actionText` | `string` | - | Action button text |
| `onAction` | `function` | - | Action button callback |

### Usage

```jsx
import EmptyState from '../components/EmptyState';

<EmptyState
  icon="📁"
  title="No Files Found"
  description="Upload your first file to get started"
  actionText="Upload File"
  onAction={() => navigation.navigate('UploadFile')}
/>
```

## Component Best Practices

### Performance

1. **Use React.memo** for components that receive stable props
2. **Optimize re-renders** by using useCallback and useMemo
3. **Lazy load** heavy components when possible

### Styling

1. **Use StyleSheet.create** for better performance
2. **Follow consistent naming** conventions for styles
3. **Use theme colors** from the global theme

### Accessibility

1. **Add accessibilityLabel** for screen readers
2. **Use accessibilityRole** for proper semantics
3. **Ensure sufficient color contrast** for text

### Testing

1. **Write unit tests** for component logic
2. **Test user interactions** with fireEvent
3. **Use testID** for reliable element selection

### Example Component Structure

```jsx
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

const MyComponent = memo(({ title, onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${title} button`}
      accessibilityRole="button"
      testID="my-component"
    >
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
});

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  disabled: {
    backgroundColor: '#CCCCCC',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyComponent;
```
