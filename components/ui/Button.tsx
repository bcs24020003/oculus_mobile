import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
  labelStyle?: TextStyle | TextStyle[];
}

const Button = ({ 
  label, 
  onPress, 
  variant = 'primary', 
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  labelStyle
}: ButtonProps) => {
  const getButtonStyle = () => {
    if (disabled) return [styles.button, styles.disabled];
    
    switch (variant) {
      case 'primary':
        return [styles.button, styles.primaryButton];
      case 'secondary':
        return [styles.button, styles.secondaryButton];
      case 'outline':
        return [styles.button, styles.outlineButton];
      default:
        return [styles.button, styles.primaryButton];
    }
  };

  const getTextStyle = () => {
    if (disabled) return [styles.buttonText, styles.disabledText];
    
    switch (variant) {
      case 'primary':
      case 'secondary':
        return [styles.buttonText, styles.primaryText];
      case 'outline':
        return [styles.buttonText, styles.outlineText];
      default:
        return [styles.buttonText, styles.primaryText];
    }
  };

  return (
    <TouchableOpacity 
      style={[
        ...getButtonStyle(), 
        fullWidth && styles.fullWidth,
        style
      ]} 
      onPress={onPress} 
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[...getTextStyle(), labelStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#1E40AF', // UTS Blue
  },
  secondaryButton: {
    backgroundColor: '#475569', // Gray
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  disabled: {
    backgroundColor: '#CBD5E1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#1E40AF',
  },
  disabledText: {
    color: '#94A3B8',
  },
  fullWidth: {
    width: '100%',
  }
});

export default Button; 