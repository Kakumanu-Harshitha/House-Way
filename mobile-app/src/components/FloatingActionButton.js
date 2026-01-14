import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import theme from '../styles/theme';

const FloatingActionButton = ({
  onPress,
  icon = '➕',
  label,
  style,
  size = 56,
  colors,
  disabled = false,
  ...props
}) => {
  // Removed all animation logic to prevent CSS errors

  const fabStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        {...props}
      >
        <View
          style={{
            ...styles.fab,
            ...fabStyle,
            backgroundColor: colors || theme.colors.primary[500]
          }}
        >
          <Text style={{...styles.icon, fontSize: size * 0.4}}>{icon}</Text>
        </View>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Extended FAB with label
export const ExtendedFAB = ({ onPress, icon, label, style, colors, disabled = false }) => (
  <FloatingActionButton
    onPress={onPress}
    icon={icon}
    label={label}
    style={{...styles.extended, ...style}}
    colors={colors}
    disabled={disabled}
    size={48}
  />
);

// Mini FAB
export const MiniFAB = ({ onPress, icon, style, colors, disabled = false }) => (
  <FloatingActionButton
    onPress={onPress}
    icon={icon}
    style={style}
    colors={colors}
    disabled={disabled}
    size={40}
  />
);

// Speed Dial FAB (for multiple actions)
export const SpeedDialFAB = ({ 
  actions = [], 
  onPress, 
  icon = '➕', 
  isOpen = false, 
  colors,
  style 
}) => {
  return (
    <View style={{...styles.speedDialContainer, ...style}}>
      {isOpen && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <View
              key={index}
              style={{
                ...styles.actionItem,
                marginBottom: 10,
              }}
            >
              <View style={styles.actionLabelContainer}>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </View>
              <MiniFAB
                onPress={action.onPress}
                icon={action.icon}
                colors={action.colors || colors}
              />
            </View>
          ))}
        </View>
      )}
      <FloatingActionButton
        onPress={onPress}
        icon={isOpen ? '✕' : icon}
        colors={colors}
        style={styles.speedDialMain}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  labelContainer: {
    marginTop: 8,
    backgroundColor: theme.colors.neutral[800],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Extended FAB
  extended: {
    width: 'auto',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Speed Dial
  speedDialContainer: {
    alignItems: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 70,
    alignItems: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionLabelContainer: {
    backgroundColor: theme.colors.neutral[800],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 16,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  speedDialMain: {
    elevation: 12,
  },
});

export default FloatingActionButton;
