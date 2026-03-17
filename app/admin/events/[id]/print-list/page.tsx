import { Suspense } from 'react';
import PrintListContent from './PrintListContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintListPage({ params }: PageProps) {
  const { id: eventId } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <PrintListContent eventId={eventId} />
    </Suspense>
  );
}
