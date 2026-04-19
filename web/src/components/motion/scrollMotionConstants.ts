export const SCROLL_EASE = [0.22, 1, 0.36, 1] as const;

/** Một lần vào viewport, kích hoạt sớm một chút để cảm giác mượt khi cuộn */
export const scrollViewport = {
  once: true,
  margin: '-10% 0px -6% 0px',
  amount: 0.12,
} as const;
