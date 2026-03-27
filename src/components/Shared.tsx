import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../theme/theme';

export const Button = ({ title, onPress, variant = 'primary', style, disabled }: { title: string, onPress: () => void, variant?: 'primary' | 'secondary' | 'outline' | 'danger', style?: StyleProp<ViewStyle>, disabled?: boolean }) => {
  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'outline' && styles.buttonOutline,
    variant === 'danger' && styles.buttonDanger,
    style
  ];
  
  const textStyle = [
    styles.buttonText,
    variant === 'outline' && { color: Colors.primary }
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.8} disabled={disabled}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

export const Input = ({ value, onChangeText, placeholder, secureTextEntry, label, keyboardType }: { value: string, onChangeText: (text: string) => void, placeholder?: string, secureTextEntry?: boolean, label?: string, keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' }) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      placeholderTextColor={Colors.textSecondary}
      keyboardType={keyboardType}
    />
  </View>
);

export const Card = ({ children, style }: { children: React.ReactNode, style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

export const Typography = {
  Header: ({ children, style }: { children: React.ReactNode, style?: StyleProp<TextStyle> }) => <Text style={[styles.header, style]}>{children}</Text>,
  SubHeader: ({ children, style }: { children: React.ReactNode, style?: StyleProp<TextStyle> }) => <Text style={[styles.subHeader, style]}>{children}</Text>,
  Body: ({ children, style }: { children: React.ReactNode, style?: StyleProp<TextStyle> }) => <Text style={[styles.body, style]}>{children}</Text>,
  Caption: ({ children, style }: { children: React.ReactNode, style?: StyleProp<TextStyle> }) => <Text style={[styles.caption, style]}>{children}</Text>,
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.round, // fully rounded capsule
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: Colors.primary },
  buttonSecondary: { backgroundColor: Colors.secondary },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  buttonDanger: { backgroundColor: Colors.danger },
  buttonText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  
  inputContainer: { marginBottom: Spacing.md, width: '100%'},
  label: { marginBottom: Spacing.xs, color: Colors.text, fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: '#F9FAFB', // Very light gray/white contrast
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl, 
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.itemBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  
  header: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  subHeader: { fontSize: 20, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.md },
  body: { fontSize: 16, color: Colors.text },
  caption: { fontSize: 14, color: Colors.textSecondary },
});
