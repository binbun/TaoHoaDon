import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpFromLine, ChevronLeft, ChevronRight, CookingPot, LucideIcon, RotateCw } from 'lucide-react';
import clsx from 'clsx';

interface Slide {
  kicker: string;
  title: string;
  text: string;
  cta: string;
  to: string;
  bg: string;
  icon: LucideIcon;
}

const SLIDES: Slide[] = [
  {
    kicker: 'Bộ sưu tập Inox SUS304',
    title: 'Gian bếp gọn gàng\ntừng ngăn tủ',
    text: 'Giá bát đĩa, xoong nồi ray giảm chấn — bền đẹp, dễ vệ sinh.',
    cta: 'Khám phá ngay',
    to: '/san-pham?category=' + encodeURIComponent('Giá bát đĩa xoong nồi'),
    bg: 'bg-cream',
    icon: CookingPot,
  },
  {
    kicker: 'Giải pháp góc tủ',
    title: 'Không còn\ngóc chết',
    text: 'Mâm xoay, kệ góc liên hoàn tận dụng tối đa không gian tủ bếp chữ L.',
    cta: 'Xem giải pháp',
    to: '/san-pham?category=' + encodeURIComponent('Mâm xoay góc tủ'),
    bg: 'bg-[#e9eef3]',
    icon: RotateCw,
  },
  {
    kicker: 'BLUM — Áo',
    title: 'Tay nâng & bản lề\nchuẩn châu Âu',
    text: 'Aventos, Clip Top Blumotion: đóng êm, bền bỉ, bảo hành trọn đời.',
    cta: 'Xem sản phẩm BLUM',
    to: '/san-pham?brand=BLUM',
    bg: 'bg-[#f3e7df]',
    icon: ArrowUpFromLine,
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, [index]);

  const go = (step: number) => setIndex((i) => (i + step + SLIDES.length) % SLIDES.length);

  return (
    <section className="group relative overflow-hidden">
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {SLIDES.map((slide) => {
          const Icon = slide.icon;
          return (
            <div key={slide.title} className={clsx('w-full shrink-0', slide.bg)}>
              <div className="container-site grid min-h-[340px] items-center gap-6 py-10 sm:min-h-[420px] md:grid-cols-2 lg:min-h-[480px]">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{slide.kicker}</p>
                  <h2 className="whitespace-pre-line text-3xl font-extrabold uppercase leading-tight sm:text-4xl lg:text-5xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-md text-sm text-ink-soft sm:text-base">{slide.text}</p>
                  <Link to={slide.to} className="btn-primary mt-2">
                    {slide.cta}
                  </Link>
                </div>
                <div className="relative hidden h-full items-center justify-center md:flex">
                  <div className="absolute h-72 w-72 rounded-full bg-white/50 lg:h-96 lg:w-96" />
                  <div className="absolute h-48 w-48 rounded-full bg-white/70 lg:h-64 lg:w-64" />
                  <Icon strokeWidth={0.75} className="relative h-40 w-40 text-ink lg:h-52 lg:w-52" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Trước"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-white/80 opacity-0 transition hover:bg-white group-hover:opacity-100 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Sau"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center bg-white/80 opacity-0 transition hover:bg-white group-hover:opacity-100 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={clsx('h-1.5 transition-all', i === index ? 'w-8 bg-primary' : 'w-4 bg-ink/25')}
          />
        ))}
      </div>
    </section>
  );
}
