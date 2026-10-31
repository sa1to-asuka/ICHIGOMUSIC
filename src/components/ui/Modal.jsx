import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './utils';
import { IconButton } from './Button';

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;

export const ModalContent = React.forwardRef(function ModalContent({ className, children, showClose = true, ...props }, ref) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="ui-modal-overlay" />
      <Dialog.Content ref={ref} className={cn('ui-modal-content', className)} {...props}>
        {children}
        {showClose && (
          <Dialog.Close asChild>
            <IconButton className="ui-modal-close" size="sm" label="关闭" variant="ghost"><X size={16} /></IconButton>
          </Dialog.Close>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
});
export const ModalTitle = React.forwardRef(function ModalTitle({ className, ...props }, ref) {
  return <Dialog.Title ref={ref} className={cn('ui-modal-title', className)} {...props} />;
});
export const ModalDescription = React.forwardRef(function ModalDescription({ className, ...props }, ref) {
  return <Dialog.Description ref={ref} className={cn('ui-modal-desc', className)} {...props} />;
});
export function ModalHeader({ className, children }) { return <div className={cn('ui-modal-header', className)}>{children}</div>; }
export function ModalBody({ className, children }) { return <div className={cn('ui-modal-body', className)}>{children}</div>; }
export function ModalFooter({ className, children }) { return <div className={cn('ui-modal-footer', className)}>{children}</div>; }
