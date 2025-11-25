import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timesheetId } = await params;

    // Get JWT token from query parameter
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Unauthorized</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">Unauthorized</h1>
            <p>Please log in to view this timesheet.</p>
          </body>
        </html>`,
        { status: 401, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Fetch timesheet data from backend with JWT token
    const backendUrl = new URL(`http://localhost:3030/timesheets/${timesheetId}`);
    backendUrl.searchParams.set('$populate', 'worker');

    console.log('Fetching timesheet from:', backendUrl.toString());

    const response = await fetch(backendUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorText = '';
      let errorDetails = '';
      try {
        const errorJson = await response.json();
        errorText = errorJson.message || errorJson.error || 'Unknown error';
        errorDetails = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        errorText = await response.text();
      }

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px;">
            <h1 style="color: #dc2626;">Error Loading Timesheet</h1>
            <p><strong>Status:</strong> ${response.status}</p>
            <p><strong>Message:</strong> ${errorText}</p>
            ${errorDetails ? `<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;">${errorDetails}</pre>` : ''}
          </body>
        </html>`,
        { status: response.status, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const timesheet = await response.json();
    const pdfHtml = generateTimesheetHTML(timesheet);

    return new NextResponse(pdfHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Error generating timesheet PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateTimesheetHTML(timesheet: any): string {
  const worker = timesheet.worker;
  const weekStart = new Date(timesheet.weekStartDate).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const weekEnd = new Date(timesheet.weekEndDate).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const formatTime = (timeString: string) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('en-MY', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: '2-digit', month: 'short'
    });
  };

  const dailyRows = timesheet.dailyEntries.map((entry: any) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${entry.dayOfWeek}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${formatDate(entry.date)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${entry.isAbsent ? 'ABSENT' : formatTime(entry.clockIn)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${entry.isAbsent ? 'ABSENT' : formatTime(entry.clockOut)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${entry.normalHours.toFixed(1)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${entry.ot1_5Hours.toFixed(1)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${entry.ot2_0Hours.toFixed(1)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">${entry.totalHours.toFixed(1)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-size: 11px;">${entry.checkInMethod || '-'}</td>
    </tr>
  `).join('');

  const statusColors: any = {
    draft: '#6b7280',
    submitted: '#3b82f6',
    approved_subcon: '#eab308',
    approved_admin: '#10b981',
    rejected: '#ef4444'
  };

  const statusLabels: any = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved_subcon: 'Approved (Subcon)',
    approved_admin: 'Approved (Admin)',
    rejected: 'Rejected'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Timesheet - ${worker.firstName} ${worker.lastName}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 20px;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #4f46e5;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        .summary-row {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .print-button {
          background-color: #4f46e5;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .print-button:hover {
          background-color: #4338ca;
        }
      </style>
      <script>
        window.onload = function() {
          // Auto-print when page loads
          setTimeout(() => window.print(), 500);
        }
      </script>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Print Timesheet</button>

      <div class="header">
        <h1 style="margin: 0; color: #1f2937; font-size: 28px;">WEEKLY TIMESHEET</h1>
        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Payroll & Timesheet System</p>
      </div>

      <div class="info-section">
        <div>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">WORKER</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${worker.firstName} ${worker.lastName}</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">ID: ${worker.employeeId}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">PERIOD</p>
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${weekStart} - ${weekEnd}</p>
          <p style="margin: 4px 0 0 0;">
            <span style="background: ${statusColors[timesheet.status] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              ${statusLabels[timesheet.status] || timesheet.status}
            </span>
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Date</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th style="text-align: center;">Normal</th>
            <th style="text-align: center;">OT 1.5x</th>
            <th style="text-align: center;">OT 2.0x</th>
            <th style="text-align: center;">Total</th>
            <th>Method</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRows}
          <tr class="summary-row">
            <td colspan="4" style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">WEEK TOTAL:</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${timesheet.totalNormalHours.toFixed(1)}h</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${timesheet.totalOT1_5Hours.toFixed(1)}h</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${timesheet.totalOT2_0Hours.toFixed(1)}h</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-size: 18px; color: #4f46e5;">${timesheet.totalHours.toFixed(1)}h</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;">
          <div style="border-top: 2px solid #000; padding-top: 8px;">
            <p style="margin: 0; font-weight: bold;">Worker Signature</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Date: _____________</p>
          </div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="border-top: 2px solid #000; padding-top: 8px;">
            <p style="margin: 0; font-weight: bold;">Supervisor Signature</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Date: _____________</p>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 11px; color: #6b7280;">
        <p style="margin: 0;"><strong>Notes:</strong></p>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
          <li>Normal hours are calculated at regular hourly rate</li>
          <li>OT 1.5x hours are paid at 1.5 times the regular rate</li>
          <li>OT 2.0x hours are paid at 2.0 times the regular rate</li>
          <li>This timesheet must be approved by both subcontractor and admin before payroll processing</li>
        </ul>
      </div>

      <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #9ca3af;">
        <p style="margin: 0;">Generated on ${new Date().toLocaleString('en-MY')}</p>
      </div>
    </body>
    </html>
  `;
}

