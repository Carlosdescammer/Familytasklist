import { Resend } from 'resend';
import { NotificationType } from './notifications';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@familylist.app';

export interface EmailNotificationData {
  to: string;
  userName: string;
  familyName: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

// Generate HTML email template
function getEmailTemplate(data: EmailNotificationData): string {
  const { userName, familyName, title, message, actionUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #228be6;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #228be6;
      margin: 0;
    }
    .title {
      color: #228be6;
      font-size: 24px;
      margin: 20px 0;
    }
    .message {
      font-size: 16px;
      color: #555;
      margin: 20px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #228be6;
      color: #ffffff !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #888;
    }
    .family-badge {
      background-color: #e7f5ff;
      color: #228be6;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">FamilyList</h1>
      <span class="family-badge">${familyName}</span>
    </div>

    <h2 class="title">${title}</h2>

    <p class="message">Hi ${userName},</p>

    <p class="message">${message}</p>

    ${actionUrl ? `
      <div style="text-align: center;">
        <a href="${actionUrl}" class="cta-button">View Details</a>
      </div>
    ` : ''}

    <div class="footer">
      <p>You're receiving this email because you're a member of ${familyName} on FamilyList.</p>
      <p>To manage your email preferences, visit your <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/settings" style="color: #228be6;">settings</a>.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Get action URL based on notification type
function getActionUrl(notificationType: NotificationType): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

  const urlMap: Record<NotificationType, string> = {
    task_assigned: `${baseUrl}/tasks`,
    task_completed: `${baseUrl}/tasks`,
    all_tasks_complete: `${baseUrl}/tasks`,
    event_created: `${baseUrl}/calendar`,
    event_reminder: `${baseUrl}/calendar`,
    shopping_list_created: `${baseUrl}/shopping`,
    shopping_list_updated: `${baseUrl}/shopping`,
    budget_alert: `${baseUrl}/budget`,
    budget_limit_reached: `${baseUrl}/budget`,
    family_member_joined: `${baseUrl}/family`,
    recipe_shared: `${baseUrl}/recipes`,
  };

  return urlMap[notificationType];
}

// Send notification email
export async function sendNotificationEmail(data: EmailNotificationData) {
  try {
    // Skip if no API key configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
      console.log('Resend API key not configured, skipping email notification');
      return { success: false, error: 'API key not configured' };
    }

    // Add action URL if not provided
    if (!data.actionUrl) {
      data.actionUrl = getActionUrl(data.notificationType);
    }

    const htmlContent = getEmailTemplate(data);

    const result = await resend.emails.send({
      from: `FamilyList <${FROM_EMAIL}>`,
      to: data.to,
      subject: data.title,
      html: htmlContent,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error };
  }
}

// Send digest email with multiple notifications
export interface DigestNotification {
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
}

export interface DigestEmailData {
  to: string;
  userName: string;
  familyName: string;
  notifications: DigestNotification[];
  period: 'daily' | 'weekly';
}

export async function sendDigestEmail(data: DigestEmailData) {
  try {
    // Skip if no API key configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
      console.log('Resend API key not configured, skipping digest email');
      return { success: false, error: 'API key not configured' };
    }

    const { userName, familyName, notifications, period } = data;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';

    // Group notifications by type
    const groupedNotifications = notifications.reduce((acc, notif) => {
      if (!acc[notif.type]) {
        acc[notif.type] = [];
      }
      acc[notif.type].push(notif);
      return acc;
    }, {} as Record<string, DigestNotification[]>);

    const notificationsList = Object.entries(groupedNotifications)
      .map(([type, notifs]) => {
        const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
            <h3 style="color: #228be6; margin-top: 0; font-size: 18px;">${typeLabel} (${notifs.length})</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${notifs.map(n => `<li style="margin: 5px 0;">${n.message}</li>`).join('')}
            </ul>
          </div>
        `;
      })
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${period === 'daily' ? 'Daily' : 'Weekly'} Digest - FamilyList</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #228be6;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #228be6;
      margin: 0;
    }
    .family-badge {
      background-color: #e7f5ff;
      color: #228be6;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background-color: #228be6;
      color: #ffffff !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">FamilyList</h1>
      <span class="family-badge">${familyName}</span>
    </div>

    <h2 style="color: #228be6; font-size: 24px;">Your ${period === 'daily' ? 'Daily' : 'Weekly'} Digest</h2>

    <p>Hi ${userName},</p>

    <p>Here's what happened in your family ${period === 'daily' ? 'today' : 'this week'}:</p>

    ${notificationsList}

    <div style="text-align: center; margin-top: 30px;">
      <a href="${baseUrl}" class="cta-button">Open FamilyList</a>
    </div>

    <div class="footer">
      <p>You're receiving this ${period} digest because you're a member of ${familyName} on FamilyList.</p>
      <p>To manage your email preferences, visit your <a href="${baseUrl}/settings" style="color: #228be6;">settings</a>.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const result = await resend.emails.send({
      from: `FamilyList <${FROM_EMAIL}>`,
      to: data.to,
      subject: `Your ${period === 'daily' ? 'Daily' : 'Weekly'} Family Digest`,
      html: htmlContent,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending digest email:', error);
    return { success: false, error };
  }
}

// Check if user wants email notifications for a specific type
export function shouldSendEmail(
  userEmailEnabled: boolean,
  userPreferences: string | null,
  notificationType: NotificationType
): boolean {
  // If email notifications are disabled globally, don't send
  if (!userEmailEnabled) {
    return false;
  }

  // If no preferences set, send all notifications
  if (!userPreferences) {
    return true;
  }

  try {
    const preferences = JSON.parse(userPreferences) as Record<string, boolean>;
    // If preference is not set for this type, default to true
    return preferences[notificationType] !== false;
  } catch (error) {
    console.error('Error parsing notification preferences:', error);
    return true; // Default to sending if preferences are malformed
  }
}
