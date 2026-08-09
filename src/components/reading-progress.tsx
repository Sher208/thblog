"use client";

import { useEffect, useRef } from "react";

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  useEffect(() => {
    const update = () => {
      rafId.current = 0;
      const article = document.getElementById("post-article");
      const bar = barRef.current;
      if (!article || !bar) return;

      const total = article.offsetHeight - window.innerHeight;
      const scrolled = Math.min(
        Math.max(-article.getBoundingClientRect().top, 0),
        Math.max(total, 1),
      );
      const progress = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = `${progress}%`;
    };

    const onScroll = () => {
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      aria-hidden
    >
      <div ref={barRef} className="h-full w-0 bg-primary" />
    </div>
  );
}
