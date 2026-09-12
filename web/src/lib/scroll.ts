/** Cuộn cửa sổ về đầu trang (tương thích nhiều trình duyệt). An toàn khi gắn trực tiếp vào onClick. */
export function scrollWindowToTop(behavior?: ScrollBehavior): void;
export function scrollWindowToTop(e: unknown): void;
export function scrollWindowToTop(behaviorOrEvent?: unknown): void {
  if (behaviorOrEvent === 'smooth') {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return;
  }
  const run = (): void => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  run();
  requestAnimationFrame(run);
}
