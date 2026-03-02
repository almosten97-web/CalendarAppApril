'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { getAllEvents, type Event } from '@/lib/db';
import EventModal from './EventModal';

type Props = {
  initialEvents?: Event[];
};

function toFCEvent(e: Event) {
  return {
    id: e.id,
    title: e.title,
    start: e.start_time,
    end: e.end_time ?? undefined,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: e,
  };
}

export default function CalendarView({ initialEvents = [] }: Props) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [selected, setSelected] = useState<Event | null>(null);
  const calRef = useRef<FullCalendar>(null);

  // Reload events from the API whenever this component mounts
  useEffect(() => {
    getAllEvents().then(setEvents).catch(console.error);
  }, []);

  function handleUpdated(updated: Event) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelected(null);
  }

  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth',
          }}
          events={events.map(toFCEvent)}
          eventClick={({ event }) => {
            const original = events.find((e) => e.id === event.id);
            if (original) setSelected(original);
          }}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={4}
          nowIndicator
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', list: 'List' }}
        />
      </div>

      {selected && (
        <EventModal
          event={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
