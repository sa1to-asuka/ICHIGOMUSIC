import React from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster({ theme = 'dark', ...props }) {
  return (
    <SonnerToaster
      position="bottom-right"
      theme={theme}
      richColors
      closeButton
      duration={3600}
      toastOptions={{ className: 'ui-toast' }}
      {...props}
    />
  );
}

export { toast };
