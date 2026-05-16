'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';
import { AdminSection } from '@/types/admin';
import { cn } from '@/lib/utils';

type CardSize = 'compact' | 'large';

type DomainSectionCardProps = {
  section: AdminSection;
  /** When set, shows mastery label and progress bar (dashboard). */
  masteryPercent?: number;
  size?: CardSize;
  className?: string;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

const sizeStyles: Record<
  CardSize,
  {
    card: string;
    corner: string;
    iconBox: string;
    icon: string;
    title: string;
    masteryWrap: string;
    masteryLabel: string;
    progress: string;
    footer: string;
    footerRow: string;
  }
> = {
  compact: {
    card: 'min-h-[132px] p-3 sm:p-4',
    corner: 'w-16 h-16 -mr-8 -mt-8',
    iconBox: 'w-8 h-8 mb-3',
    icon: 'w-4 h-4',
    title: 'text-xs sm:text-sm',
    masteryWrap: 'mt-3 space-y-1.5',
    masteryLabel: 'text-[8px]',
    progress: 'h-1',
    footer: 'text-[8px] pt-2',
    footerRow: 'flex-col sm:flex-row sm:items-center sm:justify-between',
  },
  large: {
    card: 'min-h-[168px] sm:min-h-[184px] p-4 sm:p-5 md:p-6',
    corner: 'w-20 h-20 -mr-10 -mt-10',
    iconBox: 'w-10 h-10 sm:w-11 sm:h-11 mb-4',
    icon: 'w-5 h-5',
    title: 'text-sm sm:text-base',
    masteryWrap: 'mt-4 space-y-2',
    masteryLabel: 'text-[9px] sm:text-[10px]',
    progress: 'h-1.5',
    footer: 'text-[9px] sm:text-[10px] pt-3',
    footerRow: 'flex-row items-center justify-between',
  },
};

const cardBaseClassName =
  'flex flex-col bg-card border border-border/50 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all group text-left relative overflow-hidden w-full min-w-0';

export function DomainSectionCard({
  section,
  masteryPercent,
  size = 'compact',
  href,
  onClick,
  className,
}: DomainSectionCardProps) {
  const styles = sizeStyles[size];
  const pathLabel = section.path ?? `/${section.key}`;
  const showMastery = masteryPercent !== undefined;

  const content = (
    <>
      <div
        className={cn(
          'absolute top-0 right-0 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500',
          styles.corner,
        )}
        aria-hidden
      />
      <div
        className={cn(
          'rounded-lg bg-secondary flex items-center justify-center border border-border/50 group-hover:scale-110 transition-transform relative z-10',
          styles.iconBox,
        )}
      >
        <Database className={cn('text-primary', styles.icon)} />
      </div>
      <h3
        className={cn(
          'font-black text-foreground tracking-tight relative z-10 uppercase break-words',
          styles.title,
        )}
      >
        {section.label}
      </h3>

      {showMastery && (
        <div className={cn('relative z-10', styles.masteryWrap)}>
          <div
            className={cn(
              'flex justify-between font-bold tracking-widest gap-1',
              styles.masteryLabel,
            )}
          >
            <span className="text-muted-foreground/60 uppercase">Mastery</span>
            <span className="text-primary shrink-0">{masteryPercent}%</span>
          </div>
          <div
            className={cn(
              'w-full bg-secondary rounded-full overflow-hidden',
              styles.progress,
            )}
          >
            <div
              className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex gap-1 mt-auto relative z-10',
          styles.footerRow,
          styles.footer,
        )}
      >
        <p className="text-muted-foreground/60 uppercase tracking-widest font-bold break-all min-w-0">
          {pathLabel}
        </p>
        <span className="font-black text-primary/60 shrink-0">
          {section.questionCount || 0} nodes
        </span>
      </div>
    </>
  );

  const classes = cn(cardBaseClassName, styles.card, className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
