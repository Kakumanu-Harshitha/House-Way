import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const FoldedPanel = ({
  title,
  children,
  defaultExpanded = false,
  icon,
  headerStyle,
  contentStyle,
  showBorder = true,
  animationDuration = 300,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animatedHeight] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggleExpanded = () => {
    LayoutAnimation.configureNext({
      duration: animationDuration,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: animationDuration,
      useNativeDriver: false,
    }).start();

    setExpanded(!expanded);
  };

  const rotateIcon = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, showBorder && styles.withBorder]}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.header, headerStyle]}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <Animated.View style={[styles.chevronContainer, { transform: [{ rotate: rotateIcon }] }]}>
          <Feather name="chevron-down" size={20} color="#7487C1" />
        </Animated.View>
      </TouchableOpacity>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          contentStyle,
          {
            height: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000], // Use a large number for auto-height
            }),
            opacity: animatedHeight,
          },
        ]}
      >
        <View style={styles.contentInner}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  withBorder: {
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FBF7EE',
    minHeight: 72,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2540',
    letterSpacing: -0.2,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  contentInner: {
    padding: 20,
    paddingTop: 0,
  },
});

export default FoldedPanel;