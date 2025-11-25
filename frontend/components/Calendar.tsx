'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'leave' | 'holiday' | 'pending-leave';
  color: string;
  worker?: string;
  status?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export default function Calendar({ events, onDateClick, onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (day: number) => {
    const dateToCheck = new Date(year, month, day);
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
             eventDate.getMonth() === month &&
             eventDate.getFullYear() === year;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  const days = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDate(day);
    const today = isToday(day);

    days.push(
      <div
        key={day}
        onClick={() => onDateClick?.(new Date(year, month, day))}
        className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
          today ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
        }`}
      >
        <div className={`text-sm font-medium mb-1 ${today ? 'text-indigo-600' : 'text-gray-900'}`}>
          {day}
          {today && <span className="ml-1 text-xs">(Today)</span>}
        </div>
        <div className="space-y-1 overflow-y-auto max-h-16">
          {dayEvents.map((event, idx) => (
            <div
              key={`${event.id}-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick?.(event);
              }}
              className={`text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${event.color}`}
              title={event.title}
            >
              {event.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-indigo-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-indigo-500 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 bg-gray-100">
        {dayNames.map(day => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
}

