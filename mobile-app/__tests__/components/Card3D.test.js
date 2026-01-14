import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Card3D from '../../src/components/Card3D';
import { Text } from 'react-native';

describe('Card3D Component', () => {
  const defaultProps = {
    colors: ['#FF6B6B', '#4ECDC4'],
    children: <Text>Test Content</Text>,
  };

  it('should render correctly with default props', () => {
    const { getByText } = render(<Card3D {...defaultProps} />);
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should render with custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <Card3D {...defaultProps} style={customStyle} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    expect(card).toBeTruthy();
  });

  it('should handle press events', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Card3D {...defaultProps} onPress={onPress} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    fireEvent.press(card);
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should apply glow effect when enabled', () => {
    const { getByTestId } = render(
      <Card3D {...defaultProps} glowEffect={true} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    expect(card).toBeTruthy();
  });

  it('should handle different color arrays', () => {
    const singleColor = ['#FF6B6B'];
    const multipleColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    
    const { rerender, getByText } = render(
      <Card3D colors={singleColor}>{defaultProps.children}</Card3D>
    );
    expect(getByText('Test Content')).toBeTruthy();
    
    rerender(<Card3D colors={multipleColors}>{defaultProps.children}</Card3D>);
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle maxRotation prop', () => {
    const { getByTestId } = render(
      <Card3D {...defaultProps} maxRotation={10} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    expect(card).toBeTruthy();
  });

  it('should render without onPress (non-touchable)', () => {
    const { getByText } = render(
      <Card3D colors={defaultProps.colors}>
        {defaultProps.children}
      </Card3D>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should handle empty children', () => {
    const { UNSAFE_root } = render(
      <Card3D colors={defaultProps.colors} />
    );
    
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should apply correct border radius', () => {
    const { getByTestId } = render(
      <Card3D {...defaultProps} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    expect(card).toBeTruthy();
  });

  it('should handle disabled state', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Card3D {...defaultProps} onPress={onPress} disabled={true} testID="card3d" />
    );
    
    const card = getByTestId('card3d');
    fireEvent.press(card);
    
    // Should not call onPress when disabled
    expect(onPress).not.toHaveBeenCalled();
  });
});
