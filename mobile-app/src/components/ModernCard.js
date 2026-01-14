import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import theme from '../styles/theme';
import { StandardCard, StatsCard, ProjectCard, ActionCard } from './StandardCard';
import { createShadow } from '../utils/webStyles';

const ModernCard = ({
  children,
  style,
  onPress,
  variant = 'default',
  disabled = false,
  ...props
}) => {
  // Use StandardCard for consistent styling
  return (
    <StandardCard
      variant={variant}
      onPress={onPress}
      style={style}
      disabled={disabled}
      {...props}
    >
      {children}
    </StandardCard>
  );
};

// Export the ModernCard as default
export default ModernCard;

// Re-export standardized cards for backward compatibility
// Re-export standardized cards for backward compatibility
export { StatsCard, ProjectCard, ActionCard, InfoCard } from './StandardCard';


