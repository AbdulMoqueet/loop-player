import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'surface';
type Size = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Accessible label — required since the button has no visible text. */
  label: string;
  variant?: Variant;
  size?: Size;
}

const ICON_SIZE: Record<Size, number> = { sm: 16, md: 20, lg: 26 };

export function IconButton({
  icon,
  label,
  variant = 'surface',
  size = 'md',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`ui-iconbtn ui-iconbtn--${variant} ui-iconbtn--${size} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  );
}
