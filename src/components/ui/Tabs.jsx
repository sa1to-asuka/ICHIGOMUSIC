import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(function TabsList({ className, bare = false, ...props }, ref) {
  return <TabsPrimitive.List ref={ref} className={cn(!bare && 'ui-tabs-list', className)} {...props} />;
});

export const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return <TabsPrimitive.Trigger ref={ref} className={cn('ui-tabs-trigger', className)} {...props} />;
});

export const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} className={cn('ui-tabs-content', className)} {...props} />;
});
