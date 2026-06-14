import { clsx } from 'clsx';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}

export function Card({ className, children, title, action }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[#131722] border border-[#2A2E3D] rounded overflow-hidden flex flex-col',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2E3D]">
          <span className="text-[11px] font-semibold text-[#787B86] uppercase tracking-wider">
            {title}
          </span>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple';
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
        {
          'bg-[#2A2E3D] text-[#787B86]': variant === 'default',
          'bg-[#089981]/20 text-[#089981]': variant === 'green',
          'bg-[#F23645]/20 text-[#F23645]': variant === 'red',
          'bg-[#F7A600]/20 text-[#F7A600]': variant === 'yellow',
          'bg-[#2962FF]/20 text-[#2962FF]': variant === 'blue',
          'bg-[#9C27B0]/20 text-[#CE93D8]': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
