"use client";

import * as React from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface SheetProps extends Omit<React.ComponentProps<typeof Drawer>, "swipeDirection"> {
  side?: "top" | "bottom" | "left" | "right";
}

function Sheet({ side = "left", children, ...props }: SheetProps) {
  const swipeDirection = side === "top" ? "up" : side === "bottom" ? "down" : side;
  return (
    <Drawer swipeDirection={swipeDirection} {...props}>
      {children}
    </Drawer>
  );
}

const SheetTrigger = DrawerTrigger;
const SheetClose = DrawerClose;
const SheetPortal = DrawerPortal;
const SheetOverlay = DrawerOverlay;
const SheetHeader = DrawerHeader;
const SheetFooter = DrawerFooter;
const SheetTitle = DrawerTitle;
const SheetDescription = DrawerDescription;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerContent>) {
  return (
    <DrawerContent className={cn("max-w-[280px] sm:max-w-xs", className)} {...props}>
      {children}
    </DrawerContent>
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
