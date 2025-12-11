import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payrollId } = await params;

    // Get JWT token from query parameter
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">Unauthorized</h1>
          <p>Please log in to view this payslip.</p>
        </body>
        </html>`,
        {
          status: 401,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Fetch payroll data from backend with JWT token
    // Add $populate to get worker details
    const backendUrl = new URL(`${API_URL}/payroll-records/${payrollId}`);
    backendUrl.searchParams.set('$populate', 'worker');

    console.log('Fetching payroll from:', backendUrl.toString());
    console.log('Using token:', token.substring(0, 20) + '...');

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

      console.error('Backend error:', response.status, errorText);
      console.error('Error details:', errorDetails);

      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; padding: 40px;">
          <h1 style="color: #dc2626; text-align: center;">Payroll Record Error</h1>
          <p style="text-align: center;">The requested payroll record could not be loaded.</p>
          <p style="color: #666; font-size: 14px; text-align: center;">HTTP Status: ${response.status}</p>
          <div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
            <h3 style="margin-top: 0;">Error Details:</h3>
            <pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 12px;">${errorText}</pre>
            ${errorDetails ? `<h3>Full Response:</h3><pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 11px; color: #666;">${errorDetails}</pre>` : ''}
          </div>
          <p style="text-align: center; margin-top: 30px;">
            <button onclick="window.close()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
          </p>
        </body>
        </html>`,
        {
          status: response.status,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const payroll = await response.json();

    // Generate PDF HTML
    const pdfHtml = generatePayslipHTML(payroll);

    // Return HTML that will be converted to PDF by the browser
    return new NextResponse(pdfHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generatePayslipHTML(payroll: any): string {
  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${payroll.worker?.firstName} ${payroll.worker?.lastName}</title>
  <style>
    @media print {
      @page { margin: 0; }
      body { margin: 1cm; }
    }
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0;
      font-size: 32px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      background-color: #4F46E5;
      color: white;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-item {
      padding: 10px;
      background-color: #f9fafb;
      border-left: 3px solid #4F46E5;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 14px;
      font-weight: bold;
      color: #111;
    }
    .pay-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .pay-table th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #e5e7eb;
    }
    .pay-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .pay-table tr:last-child td {
      border-bottom: none;
    }
    .total-row {
      background-color: #f9fafb;
      font-weight: bold;
      font-size: 16px;
    }
    .net-pay {
      background-color: #10b981;
      color: white;
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #4F46E5;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-button:hover {
      background-color: #4338CA;
    }
    @media print {
      .print-button { display: none; }
    }
  </style>
  <script>
    window.onload = function() {
      // Auto-print when page loads
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header">
    <h1>PAYSLIP</h1>
    <p>Pay Period: ${formatDate(payroll.periodStart)} - ${formatDate(payroll.periodEnd)}</p>
  </div>

  <div class="section">
    <div class="section-title">Employee Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Employee Name</div>
        <div class="info-value">${payroll.worker?.firstName} ${payroll.worker?.lastName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Employee ID</div>
        <div class="info-value">${payroll.worker?.employeeId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payment Type</div>
        <div class="info-value">${
          payroll.paymentType === 'monthly-salary' ? 'Monthly Salary' :
          payroll.paymentType === 'hourly' ? 'Hourly' :
          payroll.paymentType === 'unit-based' ? 'Unit-Based' : 'N/A'
        }</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payment Date</div>
        <div class="info-value">${new Date().toLocaleDateString('en-MY')}</div>
      </div>
    </div>
  </div>

  ${payroll.paymentType === 'hourly' ? `
  <div class="section">
    <div class="section-title">Hours Breakdown</div>
    <table class="pay-table">
      <tr>
        <th>Type</th>
        <th style="text-align: right;">Hours</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
      <tr>
        <td>Normal Hours</td>
        <td style="text-align: right;">${(payroll.totalNormalHours || 0).toFixed(1)}h</td>
        <td style="text-align: right;">${formatCurrency(payroll.hourlyRate || 0)}/hr</td>
        <td style="text-align: right;">${formatCurrency(payroll.normalPay || 0)}</td>
      </tr>
      ${payroll.totalOT1_5Hours > 0 ? `
      <tr>
        <td>Overtime 1.5x</td>
        <td style="text-align: right;">${(payroll.totalOT1_5Hours || 0).toFixed(1)}h</td>
        <td style="text-align: right;">${formatCurrency(payroll.ot1_5Rate || 0)}/hr</td>
        <td style="text-align: right;">${formatCurrency(payroll.ot1_5Pay || 0)}</td>
      </tr>
      ` : ''}
      ${payroll.totalOT2_0Hours > 0 ? `
      <tr>
        <td>Overtime 2.0x</td>
        <td style="text-align: right;">${(payroll.totalOT2_0Hours || 0).toFixed(1)}h</td>
        <td style="text-align: right;">${formatCurrency(payroll.ot2_0Rate || 0)}/hr</td>
        <td style="text-align: right;">${formatCurrency(payroll.ot2_0Pay || 0)}</td>
      </tr>
      ` : ''}
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Earnings & Deductions</div>
    <table class="pay-table">
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
      </tr>
      <tr>
        <td><strong>Gross Pay</strong></td>
        <td style="text-align: right;"><strong>${formatCurrency(payroll.grossPay)}</strong></td>
      </tr>
      <tr>
        <td style="padding-left: 30px;">EPF (Employee)</td>
        <td style="text-align: right; color: #dc2626;">-${formatCurrency(payroll.epf?.employeeContribution || 0)}</td>
      </tr>
      <tr>
        <td style="padding-left: 30px;">SOCSO (Employee)</td>
        <td style="text-align: right; color: #dc2626;">-${formatCurrency(payroll.socso?.employeeContribution || 0)}</td>
      </tr>
      <tr>
        <td style="padding-left: 30px;">EIS (Employee)</td>
        <td style="text-align: right; color: #dc2626;">-${formatCurrency(payroll.eis?.employeeContribution || 0)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Deductions</td>
        <td style="text-align: right; color: #dc2626;">-${formatCurrency(payroll.totalDeductions)}</td>
      </tr>
      <tr class="net-pay">
        <td>NET PAY</td>
        <td style="text-align: right;">${formatCurrency(payroll.netPay)}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Employer Contributions</div>
    <table class="pay-table">
      <tr>
        <th>Contribution</th>
        <th style="text-align: right;">Amount</th>
      </tr>
      <tr>
        <td>EPF (Employer)</td>
        <td style="text-align: right;">${formatCurrency(payroll.epf?.employerContribution || 0)}</td>
      </tr>
      <tr>
        <td>SOCSO (Employer)</td>
        <td style="text-align: right;">${formatCurrency(payroll.socso?.employerContribution || 0)}</td>
      </tr>
      <tr>
        <td>EIS (Employer)</td>
        <td style="text-align: right;">${formatCurrency(payroll.eis?.employerContribution || 0)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>This is a computer-generated payslip. No signature is required.</p>
    <p>Generated on ${new Date().toLocaleString('en-MY')}</p>
  </div>
</body>
</html>
  `;
}

