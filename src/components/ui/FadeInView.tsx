import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { motion } from '@/src/theme/motion';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

export function FadeInView({ children, style, delay = 0 }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.fadeInMs)
        .delay(delay)
        .springify()
        .damping(24)
        .stiffness(220)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
