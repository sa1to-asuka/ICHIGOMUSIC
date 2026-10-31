import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from './utils';

export const Checkbox = React.forwardRef(function Checkbox({ className, label, id, ...props }, ref) {
  return (
    <label className={cn('ui-checkbox-label', className)} htmlFor={id}>
      <CheckboxPrimitive.Root ref={ref} id={id} className="ui-checkbox" {...props}>
        <CheckboxPrimitive.Indicator className="ui-checkbox-indicator">
          <Check size={12} strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? <span className="ui-checkbox-text">{label}</span> : null}
    </label>
  );
});
