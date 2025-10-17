
'use client';

import { useState, useEffect } from 'react';
import { AssetForm, type LabelFormValues } from '@/components/asset-form';
import { LabelPreview, type LabelData } from '@/components/label-preview';
import { HowToUse } from '@/components/how-to-use';
import type { Asset } from '@/app/assets/index';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';
import * as assetService from '@/services/asset-service';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingSkeleton = () => (
    <div className="p-6">
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-96 w-full" />
        </div>
    </div>
);

export default function LabelerPage() {
  const [labelData, setLabelData] = useState<LabelData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { tenantId } = useAuth();
  const { databaseProvider, sqlConfig } = useSettings();

  useEffect(() => {
    const fetchAssets = async () => {
        if (!tenantId) {
            setDataLoading(false);
            return;
        };
        setDataLoading(true);
        try {
            const assetsData = await assetService.getAssets(databaseProvider, sqlConfig, tenantId);
            setAssets(assetsData);
        } catch (error) {
            console.error("Failed to fetch assets for labeler", error);
        } finally {
            setDataLoading(false);
        }
    };
    fetchAssets();
  }, [tenantId, databaseProvider, sqlConfig]);


  const handleFormSubmit = async (values: LabelFormValues) => {
    setIsLoading(true);
    try {
      const newLabels = await Promise.all(
        values.assets.map(async (asset) => {
          // All asset details will be stored in the QR code.
          const barcodeValue = JSON.stringify({
            companyName: values.companyName || '',
            make: asset.make || '',
            model: asset.model || '',
            assetTag: asset.assetTag || '',
            serialNumber: asset.serialNumber || '',
          });

          return {
            ...values,
            ...asset,
            barcodeValue,
            timestamp: new Date().toISOString(),
          };
        })
      );
      setLabelData(newLabels as LabelData[]);
    } catch (error) {
      console.error('Failed to generate labels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearPreview = () => {
    setLabelData(null);
  };
  
  if (dataLoading) {
      return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto py-6">
       <div className="mb-6">
        <h1 className="text-3xl font-bold">Asset Labeler</h1>
        <p className="text-muted-foreground">
          Generate, preview, and print custom asset labels with QR codes.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <AssetForm
            onFormSubmit={handleFormSubmit}
            isLoading={isLoading}
            existingAssets={assets}
          />
        </div>
        <div className="lg:sticky lg:top-8">
          <LabelPreview labelData={labelData} onClear={handleClearPreview} />
        </div>
      </div>
      <div className="mt-12">
        <HowToUse />
      </div>
    </div>
  );
}
