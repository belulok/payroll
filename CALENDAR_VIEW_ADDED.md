# ✅ Calendar View Added!

I've added a shared calendar component and integrated it into both the Leave Requests and Holidays pages!

## 📅 New Calendar Component

**Location:** `frontend/components/Calendar.tsx`

### **Features:**
- ✅ **Monthly calendar grid** - 7 columns (Sun-Sat)
- ✅ **Navigation** - Previous/Next month buttons
- ✅ **Today button** - Jump to current date
- ✅ **Today highlight** - Current date highlighted in indigo
- ✅ **Event display** - Shows events on each day
- ✅ **Color-coded events** - Different colors for different event types
- ✅ **Hover effects** - Interactive date cells
- ✅ **Responsive** - Works on all screen sizes
- ✅ **Multi-day events** - Events spanning multiple days

### **Props:**
```typescript
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
```

---

## 📄 Leave Requests Page Updates

### **New Features:**
- ✅ **View mode toggle** - Switch between Table and Calendar views
- ✅ **Calendar view** - Visual representation of all leave requests
- ✅ **Color legend** - Shows what each color means
- ✅ **Multi-day leave** - Leave spanning multiple days shows on all days

### **View Modes:**

#### **1. Table View** (Default)
- Full table with all details
- Approve/Reject buttons
- Worker info, dates, reason, status

#### **2. Calendar View** (New)
- Monthly calendar grid
- Leave requests shown on dates
- Color-coded by status:
  - **Yellow** - Pending leave
  - **Green** - Approved leave
  - **Red** - Rejected leave
- Shows worker name and leave type on each day

### **Toggle Buttons:**
- **Table** button with TableCellsIcon
- **Calendar** button with CalendarIcon
- Active button highlighted in indigo

### **Color Legend:**
```
🟨 Yellow - Pending
🟩 Green - Approved
🟥 Red - Rejected
```

---

## 🎉 Holidays Page Updates

### **New Features:**
- ✅ **View mode toggle** - Switch between List and Calendar views
- ✅ **Calendar view** - Visual representation of all holidays
- ✅ **Color legend** - Shows national vs state holidays
- ✅ **Year selector** - Still works in both views

### **View Modes:**

#### **1. List View** (Default)
- Grouped by month
- Large day numbers
- Holiday details
- State indicators

#### **2. Calendar View** (New)
- Monthly calendar grid
- Holidays shown on dates
- Color-coded by type:
  - **Indigo** - National holidays
  - **Blue** - State-specific holidays
- Shows holiday name on each day

### **Toggle Buttons:**
- **List** button with TableCellsIcon
- **Calendar** button with CalendarIcon
- Active button highlighted in indigo

### **Color Legend:**
```
🟦 Indigo - National Holiday
🔵 Blue - State Holiday
```

---

## 🎨 Calendar Design

### **Header:**
- **Indigo background** with white text
- **Month and Year** displayed prominently
- **Today button** - Quick jump to current date
- **Navigation arrows** - Previous/Next month

### **Day Names Row:**
- **Gray background** (bg-gray-100)
- **7 columns** - Sun, Mon, Tue, Wed, Thu, Fri, Sat
- **Centered text**

### **Calendar Grid:**
- **7 columns x 5-6 rows** (depending on month)
- **White background** for regular days
- **Indigo background** for today
- **Gray background** for empty cells (before/after month)
- **Border** around each cell
- **Hover effect** - Gray background on hover

### **Event Display:**
- **Small colored boxes** inside date cells
- **Truncated text** with ellipsis
- **Scrollable** if multiple events on one day
- **Border on left** for visual distinction
- **Tooltip** shows full title on hover

---

## 🔄 How It Works

### **Leave Requests Calendar:**

1. **Data Transformation:**
   - Each leave request is converted to calendar events
   - Multi-day leave creates one event per day
   - Events include worker name and leave type

2. **Color Coding:**
   - Pending: `bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500`
   - Approved: `bg-green-100 text-green-800 border-l-4 border-green-500`
   - Rejected: `bg-red-100 text-red-800 border-l-4 border-red-500`

3. **Event Title:**
   - Format: `{Worker Name} - {Leave Type}`
   - Example: "Sarah Wong - Annual Leave"

### **Holidays Calendar:**

1. **Data Transformation:**
   - Each holiday is converted to a calendar event
   - Single-day events only

2. **Color Coding:**
   - National: `bg-indigo-100 text-indigo-800 border-l-4 border-indigo-500`
   - State: `bg-blue-100 text-blue-800 border-l-4 border-blue-500`

3. **Event Title:**
   - Format: `{Holiday Name}`
   - Example: "Hari Raya Aidilfitri"

---

## 📱 User Experience

### **Leave Requests Page:**

**Table View:**
1. See all leave requests in a table
2. Filter by status
3. Approve/Reject pending requests

**Calendar View:**
1. Click "Calendar" button
2. See all leave requests on calendar
3. Navigate months with arrows
4. Click "Today" to jump to current date
5. See color legend at top

### **Holidays Page:**

**List View:**
1. See holidays grouped by month
2. Select year from dropdown
3. See holiday details

**Calendar View:**
1. Click "Calendar" button
2. See all holidays on calendar
3. Navigate months with arrows
4. Click "Today" to jump to current date
5. See color legend at top

---

## 🎯 Benefits

### **Visual Overview:**
- See entire month at a glance
- Identify busy periods
- Spot conflicts

### **Better Planning:**
- Plan leave around holidays
- See team availability
- Avoid overlapping leave

### **Intuitive:**
- Familiar calendar interface
- Easy navigation
- Clear color coding

### **Flexible:**
- Switch between views easily
- Choose what works best
- Both views always available

---

## 🔮 Future Enhancements

### **Calendar Component:**
- [ ] Click on date to add new event
- [ ] Click on event to view details
- [ ] Drag and drop to reschedule
- [ ] Week view option
- [ ] Day view option
- [ ] Export to iCal/Google Calendar
- [ ] Print calendar

### **Leave Requests Calendar:**
- [ ] Filter by worker
- [ ] Filter by leave type
- [ ] Show leave balance on hover
- [ ] Approve/Reject from calendar
- [ ] Add new leave request from calendar

### **Holidays Calendar:**
- [ ] Add new holiday from calendar
- [ ] Edit holiday from calendar
- [ ] Delete holiday from calendar
- [ ] Import holidays from file
- [ ] Sync with public holiday API

---

## 💻 Technical Details

### **Calendar Component:**
- **State:** `currentDate` - Tracks displayed month
- **Functions:**
  - `previousMonth()` - Navigate to previous month
  - `nextMonth()` - Navigate to next month
  - `goToToday()` - Jump to current date
  - `getEventsForDate(day)` - Get events for specific day
  - `isToday(day)` - Check if day is today

### **Leave Requests Page:**
- **State:** `viewMode` - 'table' | 'calendar'
- **Data:** `calendarEvents` - Transformed leave requests
- **Multi-day logic:** Loop through date range, create event for each day

### **Holidays Page:**
- **State:** `viewMode` - 'list' | 'calendar'
- **Data:** `calendarEvents` - Transformed holidays
- **Single-day events:** One event per holiday

---

## 📊 Example Data

### **Leave Request Event:**
```typescript
{
  id: "67890-1234567890",
  date: new Date("2025-01-15"),
  title: "Sarah Wong - Annual Leave",
  type: "leave",
  color: "bg-green-100 text-green-800 border-l-4 border-green-500",
  worker: "Sarah Wong",
  status: "approved"
}
```

### **Holiday Event:**
```typescript
{
  id: "12345",
  date: new Date("2025-01-01"),
  title: "New Year's Day",
  type: "holiday",
  color: "bg-indigo-100 text-indigo-800 border-l-4 border-indigo-500",
  worker: "National",
  status: "Public Holiday"
}
```

---

**Both pages now have beautiful calendar views!** 🎉

**Try it out:**
1. Go to Leave Requests page
2. Click "Calendar" button
3. See all leave requests on calendar
4. Go to Holidays page
5. Click "Calendar" button
6. See all holidays on calendar

