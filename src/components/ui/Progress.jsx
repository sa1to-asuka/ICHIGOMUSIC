import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from './utils';

export const Progress = React.forwardRef(function Progress({ className, value = 0, max = 100, label = '进度', ...props }, ref) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (Number(value) / max) * 100)) : 0;
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('ui-progress', className)}
      value={value}
      max={max}
      aria-label={label}
      {...props}
    >
      <ProgressPrimitive.Indicator className="ui-progress-indicator" style={{ transform: `translateX(-${100 - percent}%)` }} />
    </ProgressPrimitive.Root>
  );
});
