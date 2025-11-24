/**
 * Email sending module for bug reports
 * Uses a simple SMTP-like approach or external API
 */

interface BugReportEmail {
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  pageUrl?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Send bug report email to admin
 * For now, this logs to console. In production, integrate with email service (Resend, SendGrid, etc.)
 */
export async function sendBugReportEmail(report: BugReportEmail): Promise<boolean> {
  const recipientEmail = "piotr.ostaszewski@ekovoltis.pl";
  
  const emailContent = `
==============================================
NOWE ZGŁOSZENIE BŁĘDU
==============================================

Tytuł: ${report.title}

Opis:
${report.description}

---
Zgłaszający: ${report.userName} (${report.userEmail})
Strona: ${report.pageUrl || 'N/A'}
Przeglądarka: ${report.userAgent || 'N/A'}
Data zgłoszenia: ${report.createdAt.toLocaleString('pl-PL')}

==============================================
  `.trim();

  // TODO: Integrate with actual email service
  // For now, log to console
  console.log('[EMAIL] Sending bug report to:', recipientEmail);
  console.log(emailContent);
  
  // In production, use email service:
  /*
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@ekovoltis.pl',
        to: recipientEmail,
        subject: `[Zgłoszenie błędu] ${report.title}`,
        text: emailContent,
      }),
    });
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send bug report:', error);
    return false;
  }
  */
  
  return true; // Simulate success for now
}
