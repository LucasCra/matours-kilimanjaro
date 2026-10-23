// Scroll progress and the one allowed bit of time-based motion: `displayed` chases `progress`.

const EASE = 0.15;
const EPSILON = 0.0003;

export function readProgress(): number {
  const range = document.documentElement.scrollHeight - innerHeight;
  if (range <= 0) return 0;
  return Math.min(1, Math.max(0, scrollY / range));
}

export function startScrollLoop(onFrame: (p: number) => void): { redraw(): void } {
  let displayed = readProgress();
  let raf = 0;

  const tick = () => {
    const progress = readProgress();
    displayed += (progress - displayed) * EASE;
    if (Math.abs(progress - displayed) < EPSILON) {
      displayed = progress; // land exactly, so scrolling back leaves no residue
      raf = 0;
    } else {
      raf = requestAnimationFrame(tick);
    }
    onFrame(displayed);
  };

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  onFrame(displayed);

  return { redraw: () => onFrame(displayed) };
}
