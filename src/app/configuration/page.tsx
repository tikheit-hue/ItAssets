
"use client";

import { useState } from "react";
import { useConfiguration } from "@/context/configuration-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Category = "processors" | "rams" | "storages" | "assetTypes" | "departments" | "designations";

const categoryTitles: Record<Category, string> = {
  processors: "Processors",
  rams: "RAM Options",
  storages: "Storage Types",
  assetTypes: "Asset Types",
  departments: "Departments",
  designations: "Designations",
};

export default function ConfigurationPage() {
  const {
    processors,
    setProcessors,
    rams,
    setRams,
    storages,
    setStorages,
    assetTypes,
    setAssetTypes,
    departments,
    setDepartments,
    designations,
    setDesignations,
  } = useConfiguration();

  const { toast } = useToast();

  const stateMap = {
    processors: { items: processors, setItems: setProcessors },
    rams: { items: rams, setItems: setRams },
    storages: { items: storages, setItems: setStorages },
    assetTypes: { items: assetTypes, setItems: setAssetTypes },
    departments: { items: departments, setItems: setDepartments },
    designations: { items: designations, setItems: setDesignations },
  };

  const handleAddItem = (category: Category, value: string) => {
    if (!value) return;
    const { items, setItems } = stateMap[category];
    if (items.find(item => item.toLowerCase() === value.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Duplicate Item",
            description: `"${value}" already exists in ${categoryTitles[category]}.`,
        });
        return;
    }
    setItems(prev => [...prev, value]);
    toast({
        title: "Item Added",
        description: `"${value}" has been added to ${categoryTitles[category]}.`,
    });
  };

  const handleRemoveItem = (category: Category, value: string) => {
    const { setItems } = stateMap[category];
    setItems(prev => prev.filter(item => item !== value));
    toast({
        title: "Item Removed",
        description: `"${value}" has been removed from ${categoryTitles[category]}.`,
    });
  };

  const ConfigCard = ({ category }: { category: Category }) => {
    const [inputValue, setInputValue] = useState("");
    const { items } = stateMap[category];

    const onAdd = () => {
      handleAddItem(category, inputValue);
      setInputValue("");
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>{categoryTitles[category]}</CardTitle>
          <CardDescription>Manage the available options for this category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder={`Add new ${categoryTitles[category].slice(0, -1)}...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
            <Button onClick={onAdd}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-4">
            {items.length > 0 ? (
                items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                        <span>{item}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(category, item)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No items yet.</p>
            )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6">
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground">
              Manage the dropdown options for various asset fields. Changes are saved locally.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConfigCard category="processors" />
            <ConfigCard category="rams" />
            <ConfigCard category="storages" />
            <ConfigCard category="assetTypes" />
            <ConfigCard category="departments" />
            <ConfigCard category="designations" />
        </div>
    </div>
  );
}
