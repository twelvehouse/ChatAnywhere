import styles from './SymbolsTab.module.css';
import { FFXIV_SPECIAL_CHARS, FFXIV_CHAR_CATEGORIES } from '../../constants/ffxivSpecialChars';

// Pre-computed once at module load — derived from constants that never change
const SYMBOL_GROUPS = FFXIV_CHAR_CATEGORIES.slice(1)
  .map((cat) => ({
    category: cat,
    chars: FFXIV_SPECIAL_CHARS.filter((c) => c.category === cat),
  }))
  .filter((g) => g.chars.length > 0);

interface Props {
  onSelect: (char: string) => void;
}

export function SymbolsTab({ onSelect }: Props) {
  return (
    <div className={styles.scroll}>
      {SYMBOL_GROUPS.map((g) => (
        <div key={g.category} className={styles.section}>
          <div className={styles['section-label']}>{g.category}</div>
          <div className={styles.grid}>
            {g.chars.map((item, i) => (
              <button
                key={i}
                type="button"
                className={styles['char-btn']}
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
  );
}
