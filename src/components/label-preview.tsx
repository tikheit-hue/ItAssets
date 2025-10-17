
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Info, XCircle } from "lucide-react";
import { Barcode } from "./barcode";
import { ScrollArea } from "./ui/scroll-area";

export type LabelData = {
  companyName: string;
  assetTag: string;
  make: string;
  model: string;
  serialNumber: string;
  barcodeValue: string;
  timestamp?: string;
};

type LabelPreviewProps = {
  labelData: LabelData[] | null;
  onClear: () => void;
};

const Label = ({ labelData }: { labelData: LabelData }) => (
    <div 
      className="printable-area bg-white text-black font-sans flex flex-row items-center justify-between shadow-lg"
      style={{ width: '63.3mm', height: '30.7mm', padding: '0.1in', border: '1px solid #e5e7eb', fontSize: '6pt' }}
    >
      <div className="flex flex-col items-center justify-center w-1/3 h-full pt-1">
        <Barcode value={labelData.barcodeValue} className="w-full h-auto max-h-[80%]" />
      </div>
      <div className="flex flex-col justify-center w-2/3 h-full pl-2 overflow-hidden">
        <div className="text-center mb-1">
          <p className="font-bold text-[7pt] break-words">{labelData.companyName}</p>
        </div>
        <hr className="border-t border-black my-1" />
        <div className="text-center">
            <div className="text-[6pt] leading-tight">
              <div className="font-bold">Asset Tag:</div>
              <div className="break-words">{labelData.assetTag}</div>
            </div>
            <div className="text-[6pt] leading-tight mt-1">
              <div className="font-bold">Make/Model:</div>
              <div className="break-words">{labelData.make} {labelData.model}</div>
            </div>
            <div className="text-[6pt] leading-tight mt-1">
                <div className="font-bold">Serial No:</div>
                <div className="font-bold text-[9pt] break-words leading-tight">{labelData.serialNumber}</div>
            </div>
        </div>
      </div>
    </div>
  );

export function LabelPreview({ labelData, onClear }: LabelPreviewProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!labelData || labelData.length === 0) {
    return (
      <Card className="w-full h-full flex items-center justify-center min-h-[300px] md:min-h-[500px] bg-card/50 border-dashed no-print">
        <div className="text-center text-muted-foreground p-8">
          <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-foreground">Label Preview</h3>
          <p className="mt-1">Your generated labels will appear here once you enter asset details and click 'Generate'.</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="w-full">
      <Card className="no-print mb-4">
        <CardHeader>
          <CardTitle>Label Preview</CardTitle>
          <CardDescription>This is how your asset labels will look. You can now print them.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ScrollArea className="h-[400px]">
            <div className="flex flex-row flex-wrap gap-2">
                {labelData.map((data, index) => (
                    <Label key={index} labelData={data} />
                ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handlePrint} className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Print Labels
          </Button>
          <Button onClick={onClear} variant="outline" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Clear
          </Button>
        </CardFooter>
      </Card>

      {/* This div is only for printing */}
      <div id="print-container" className="hidden print:flex print:flex-wrap print:gap-0">
        {labelData.map((data, index) => (
            <Label key={`print-${index}`} labelData={data} />
        ))}
      </div>
    </div>
  );
}
