/** Yumuşak, tutarlı hareket değerleri — abartısız */
export const motion = {
  press: {
    scale: 0.98,
    opacity: 0.92,
  },
  cardPress: {
    scale: 0.992,
    opacity: 0.94,
  },
  springPress: {
    damping: 22,
    stiffness: 380,
    mass: 0.45,
  },
  springRelease: {
    damping: 20,
    stiffness: 260,
    mass: 0.5,
  },
  fadeInMs: 280,
  fadeSlidePx: 6,
  /** Onboarding → ana ekran geçişi */
  appEnterMs: 380,
  appEnterDelayMs: 90,
  appEnterSlidePx: 14,
} as const;
