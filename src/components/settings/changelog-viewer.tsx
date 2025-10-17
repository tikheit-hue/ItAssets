
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import changelogData from '@/lib/changelog.json';

type ChangelogEntry = {
  version: string;
  date: string;
  description: string;
};

export function ChangelogViewer() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    // The JSON is imported directly, so we can just set it.
    setChangelog(changelogData.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Changelog</CardTitle>
        <CardDescription>
          A history of all changes and updates made to this application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 border rounded-md">
          <div className="p-4 space-y-6">
            {changelog.length > 0 ? (
              changelog.map((entry, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <Badge variant="secondary">v{entry.version}</Badge>
                    <time className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                      {format(parseISO(entry.date), 'PPP')}
                    </time>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                No version history found.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
