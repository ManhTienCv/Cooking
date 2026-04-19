import type { ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { SCROLL_EASE, scrollViewport } from './scrollMotionConstants';

type RevealProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
  children?: ReactNode;
  /** Trễ sau khi vào viewport (stagger) */
  delay?: number;
  /** Biên độ dọc khi reduced motion = false */
  y?: number;
};

export function Reveal({ children, className, delay = 0, y = 20, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={scrollViewport}
      transition={{
        duration: 0.42,
        ease: SCROLL_EASE,
        delay,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  /** Thứ tự trong lưới — delay tăng dần; cap để danh sách dài không chờ quá lâu */
  index: number;
  baseDelay?: number;
  stagger?: number;
  maxStaggerIndex?: number;
  y?: number;
};

export function RevealStaggerItem({
  children,
  className,
  index,
  baseDelay = 0,
  stagger = 0.06,
  maxStaggerIndex = 10,
  y = 18,
}: StaggerProps) {
  const i = Math.min(Math.max(0, index), maxStaggerIndex);
  const delay = baseDelay + i * stagger;

  return (
    <Reveal className={className} delay={delay} y={y}>
      {children}
    </Reveal>
  );
}

/** Hero / above-the-fold: không dùng whileInView, tránh nháy opacity 0 */
type HeroEnterProps = {
  children: React.ReactNode;
  className?: string;
};

export function HeroEnter({ children, className }: HeroEnterProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.55,
        ease: SCROLL_EASE,
        delay: 0.08,
      }}
    >
      {children}
    </motion.div>
  );
}
