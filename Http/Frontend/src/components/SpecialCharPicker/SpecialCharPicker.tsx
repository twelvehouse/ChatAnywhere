import { useState, useEffect, useRef } from 'react';
import styles from './SpecialCharPicker.module.css';
import { FFXIV_SPECIAL_CHARS, FFXIV_CHAR_CATEGORIES } from '../../constants/ffxivSpecialChars';

interface Props {
  onSelect: (char: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function SpecialCharPicker({ onSelect, containerRef }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const categoryBarRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>(FFXIV_CHAR_CATEGORIES[1]);

  const groups = FFXIV_CHAR_CATEGORIES.slice(1)
    .map((cat) => ({
      category: cat,
      chars: FFXIV_SPECIAL_CHARS.filter((c) => c.category === cat),
    }))
    .filter((g) => g.chars.length > 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handler = () => {
      const containerTop = el.getBoundingClientRect().top;
      const containerBottom = el.getBoundingClientRect().bottom;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;

      if (isAtBottom) {
        const lastCat = groups[groups.length - 1]?.category;
        if (lastCat) setActiveCategory(lastCat);
        return;
      }

      for (const cat of groups.map((g) => g.category)) {
        const sec = sectionRefs.current[cat];
        if (!sec) continue;
        const top = sec.getBoundingClientRect().top - containerTop;
        const bottom = sec.getBoundingClientRect().bottom - containerTop;
        if (top < containerBottom - containerTop && bottom > 0) {
          setActiveCategory(cat);
          break;
        }
      }
    };

    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [groups]);

  useEffect(() => {
    const bar = categoryBarRef.current;
    if (!bar) return;
    // Use scoped CSS module class names for the querySelector
    const activeBtn = bar.querySelector(
      `.${styles['scp-cat-btn']}.${styles.active}`,
    ) as HTMLElement | null;
    if (!activeBtn) return;
    const barLeft = bar.scrollLeft;
    const barRight = barLeft + bar.clientWidth;
    const btnLeft = activeBtn.offsetLeft;
    const btnRight = btnLeft + activeBtn.offsetWidth;
    if (btnLeft < barLeft) {
      bar.scrollTo({ left: btnLeft - 8, behavior: 'smooth' });
    } else if (btnRight > barRight) {
      bar.scrollTo({ left: btnRight - bar.clientWidth + 8, behavior: 'smooth' });
    }
  }, [activeCategory]);

  const scrollToCategory = (cat: string) => {
    sectionRefs.current[cat]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setActiveCategory(cat);
  };

  return (
    <div className={styles['special-char-picker']} ref={containerRef} data-special-char-picker>
      <div className={styles['scp-category-bar']} ref={categoryBarRef}>
        {groups.map((g) => (
          <button
            key={g.category}
            type="button"
            className={`${styles['scp-cat-btn']}${activeCategory === g.category ? ` ${styles.active}` : ''}`}
            title={g.category}
            onClick={() => scrollToCategory(g.category)}
          >
            <span className={styles['scp-cat-char']}>{g.chars[0].char}</span>
          </button>
        ))}
      </div>

      <div className={styles['scp-scroll']} ref={scrollRef}>
        {groups.map((g) => (
          <div
            key={g.category}
            className={styles['scp-section']}
            ref={(el) => {
              sectionRefs.current[g.category] = el;
            }}
          >
            <div className={styles['scp-section-label']}>{g.category}</div>
            <div className={styles['scp-grid']}>
              {g.chars.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles['special-char-item']}
                  title={item.label}
                  onClick={() => onSelect(item.char)}
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
