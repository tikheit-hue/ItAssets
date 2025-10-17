
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Printer, History, FileUp, FileDown, ToggleRight } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "Dynamic Label Generation",
    description:
      "Enter your company name and asset details (make, model, asset tag, serial number) to instantly generate professional labels with QR codes.",
  },
  {
    icon: Printer,
    title: "Live Preview & Multi-Label Printing",
    description:
      "See a live preview of your labels as you create them. The app arranges multiple labels efficiently on a standard A4 page to save paper.",
  },
  {
    icon: History,
    title: "Generation History",
    description:
      "All generated labels are automatically saved. You can view past entries, quickly regenerate a label from history, or clear it when needed.",
  },
  {
    icon: FileUp,
    title: "CSV Import",
    description:
      "Quickly populate the form by importing a CSV file with your asset data. A downloadable sample template is provided to get you started.",
  },
  {
    icon: FileDown,
    title: "CSV Export",
    description:
      "Export your entire label generation history to a CSV file for record-keeping or for use in other asset management systems.",
  },
  {
    icon: ToggleRight,
    title: "Duplicate Control",
    description:
        "When importing from a CSV, you can use the 'Remove Duplicates' toggle. When enabled, it automatically filters out assets with the same asset tag and serial number.",
    },
];

export function HowToUse() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-headline text-center">Application Features & Guide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="p-6 border rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-4 mb-2">
                    <feature.icon className="h-8 w-8 text-primary" />
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="prose prose-sm max-w-none text-muted-foreground mt-8 p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">How to Get Started:</h3>
            <ol className="list-decimal list-inside space-y-2">
                <li>
                    <strong>Fill in the Form:</strong> Start by entering your Company Name and the details for your first asset in the "Label Generator" tab.
                </li>
                <li>
                    <strong>Generate Labels:</strong> Click the "Generate Labels" button. You'll see a live preview of your label(s) on the right.
                </li>
                <li>
                    <strong>Import Data (Optional):</strong> For multiple assets, click "Import CSV" and select a file. Use the "Sample" button to download a template. You can use the "Remove Duplicates" toggle to control how duplicates are handled.
                </li>
                 <li>
                    <strong>Review and Print:</strong> Once you are happy with the preview, click the "Print Labels" button. This will open your browser's print dialog.
                </li>
                 <li>
                    <strong>Manage History:</strong> Your generated labels appear in the "History" section. Click an item to preview it again or use the buttons to export or clear your history.
                </li>
            </ol>
        </div>
      </CardContent>
    </Card>
  );
}
