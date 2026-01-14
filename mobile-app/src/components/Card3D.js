import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const Card3D = ({
  colors = ['#FFFFFF'],
  style,
  children,
  onPress,
  disabled = false,
  glowEffect = false,
  maxRotation = 8,
  testID,
  ...rest
}) => {
  const backgroundColor = Array.isArray(colors) && colors.length > 0 ? colors[0] : '#FFFFFF';

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor },
        glowEffect && styles.glow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (typeof onPress === 'function') {
    return (
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [pressed && !disabled ? styles.pressed : null]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={style}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
  glow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default Card3D;
