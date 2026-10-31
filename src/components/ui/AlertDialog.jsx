import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from './utils';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({ title, description, confirmLabel = '确认', cancelLabel = '取消', destructive = false, onConfirm, children, className }) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="ui-modal-overlay" />
      <AlertDialogPrimitive.Content className={cn('ui-modal-content', 'ui-alert-dialog', className)}>
        {title ? <AlertDialogPrimitive.Title className="ui-modal-title">{title}</AlertDialogPrimitive.Title> : null}
        {description ? <AlertDialogPrimitive.Description className="ui-modal-description">{description}</AlertDialogPrimitive.Description> : null}
        {children}
        <div className="ui-modal-footer">
          <AlertDialogPrimitive.Cancel asChild>
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--md">{cancelLabel}</button>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <button
              type="button"
              className={cn('ui-btn', 'ui-btn--md', destructive ? 'ui-btn--danger' : 'ui-btn--primary')}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  );
}
