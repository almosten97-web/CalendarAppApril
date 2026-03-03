'use client';

import { useRouter } from 'next/navigation';
import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Client Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a roster image or paste text. AI will extract all shifts for the named employee.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <UploadForm
          onSuccess={() => {
            // Navigate back to calendar after a short delay so the success message is readable
            setTimeout(() => router.push('/'), 1500);
          }}
        />
      </div>
    </div>
  );
}
