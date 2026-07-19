import { AttendanceRecord } from '../types';

export class ExportService {
  public static exportToCsv(filename: string, headers: string[], rows: string[][]) {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public static exportToExcel(filename: string, headers: string[], rows: string[][]) {
    // Generate a simple XML Spreadsheet-format or basic CSV disguised as .xls for absolute simplicity and compatibility
    let xlsContent = 'sep=,\r\n' + headers.join(',') + '\r\n';
    rows.forEach(r => {
      xlsContent += r.map(val => `"${val.replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public static exportToPdf(title: string, headers: string[], rows: string[][]) {
    // Create a hidden iframe for flawless native printing without triggering popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert('Could not generate printable PDF document');
      return;
    }

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; color: #1e293b; margin-bottom: 5px; }
            p { font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .badge-present { background-color: #dcfce7; color: #15803d; }
            .badge-late { background-color: #fef9c3; color: #a16207; }
            .badge-absent { background-color: #fee2e2; color: #b91c1c; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
            <div>
              <h1>${title}</h1>
              <p>Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row.map((cell, idx) => {
                    if (headers[idx]?.toLowerCase() === 'status') {
                      let cls = 'badge-present';
                      if (cell === 'Late') cls = 'badge-late';
                      if (cell === 'Absent') cls = 'badge-absent';
                      return `<td><span class="badge ${cls}">${cell}</span></td>`;
                    }
                    return `<td>${cell}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    doc.write(html);
    doc.close();

    // Trigger printing from the iframe
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove iframe once print window is closed/cancelled
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
}
