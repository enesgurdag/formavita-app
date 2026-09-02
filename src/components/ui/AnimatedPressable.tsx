import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@/src/theme/motion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type PressIntensity = 'button' | 'card';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  intensity?: PressIntensity;
}

export function AnimatedPressable({
  style,
  disabled,
  onPressIn,
  onPressOut,
  intensity = 'button',
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const target =
    intensity === 'card' ? motion.cardPress : motion.press;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableBase
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withSpring(target.scale, motion.springPress);
          opacity.value = withSpring(target.opacity, motion.springPress);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.springRelease);
        opacity.value = withSpring(1, motion.springRelease);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    />
  );
}
