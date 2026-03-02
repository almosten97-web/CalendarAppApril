import CalendarView from '@/components/CalendarView';

export default function Home() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Click any appointment to view details, edit, or delete</p>
      </div>
      <CalendarView />
    </div>
  );
}
