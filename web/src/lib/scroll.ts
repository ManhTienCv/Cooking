/** Cuộn cửa sổ về đầu trang (tương thích nhiều trình duyệt). Gọi sau khi đổi route hoặc khi bấm nav. */
export function scrollWindowToTop(): void {
  const run = (): void => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  run();
  requestAnimationFrame(run);
}
