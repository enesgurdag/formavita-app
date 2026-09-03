import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BrandIcon, BrandWordmark } from '@/src/components/brand/BrandMark';
import { AppCanvas } from '@/src/components/ui/AppCanvas';
import { Button } from '@/src/components/ui/Button';
import { useApp } from '@/src/context/AppContext';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'welcome',
    title: 'Danışan Ve Üye Takibi, Tek Yerde',
    body: 'Diyet danışanlarınızı ve pilates üyelerinizi paket, ödeme ve randevuyla birlikte yönetin.',
  },
  {
    key: 'calendar',
    title: 'Takvim Ve Notlar Elinizin Altında',
    body: 'Görüşmeleri planlayın, dersleri tamamlayın, kalan hakları otomatik hesaplayın.',
  },
  {
    key: 'privacy',
    title: 'Verileriniz Yalnızca Bu iPhone’da',
    body: 'FormaVita internete bağlanmaz. Hesap yok, bulut yok — her şey cihazınızda kalır.',
  },
] as const;

export default function OnboardingScreen({
  onComplete,
}: {
  onComplete?: () => void | Promise<void>;
}) {
  const { completeOnboarding } = useApp();
  const finish = onComplete ?? completeOnboarding;
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    void Haptics.selectionAsync();
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
      setIndex(index + 1);
      return;
    }
    void finish();
  };

  const skip = () => {
    void finish();
  };

  return (
    <AppCanvas>
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BrandWordmark width={132} />
          {index < SLIDES.length - 1 ? (
            <Pressable onPress={skip} hitSlop={12} accessibilityRole="button">
              <Text style={styles.skip}>Atla</Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        <View style={styles.hero}>
          <BrandIcon size="hero" />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.pager}
        >
          {SLIDES.map((slide) => (
            <View key={slide.key} style={styles.slide}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((slide, i) => (
              <View
                key={slide.key}
                style={[styles.dot, i === index && styles.dotOn]}
                accessibilityLabel={i === index ? `Sayfa ${i + 1}, seçili` : `Sayfa ${i + 1}`}
              />
            ))}
          </View>
          <Button
            title={index === SLIDES.length - 1 ? 'Başla' : 'Devam'}
            onPress={goNext}
            style={styles.cta}
          />
          <Text style={styles.footnote}>Çevrimdışı · Türkçe · Yalnızca iPhone’unuzda</Text>
        </View>
      </SafeAreaView>
    </View>
    </AppCanvas>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  skip: {
    ...typography.captionMedium,
    color: colors.brand.violet,
  },
  skipPlaceholder: {
    width: 40,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  pager: {
    flexGrow: 0,
  },
  slide: {
    width,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotOn: {
    width: 22,
    backgroundColor: colors.brand.violet,
  },
  cta: {
    borderRadius: radius.md,
  },
  footnote: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
    letterSpacing: 0,
    fontWeight: '500',
  },
});
