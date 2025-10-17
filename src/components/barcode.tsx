'use client';

import { cn } from "@/lib/utils";
import React from 'react';
import QRCode from "react-qr-code";

type BarcodeProps = {
  value: string;
  className?: string;
};

export function Barcode({ value, className }: BarcodeProps) {

  if (!value) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted rounded-md", className)}>
        <span className="text-sm text-muted-foreground">No barcode to display</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center h-full w-full bg-white p-1", className)} aria-label={`Barcode for ${value}`}>
      <QRCode
        size={256}
        style={{ height: "auto", maxHeight: "100%", width: "100%" }}
        value={value}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
}
