import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn('[Email] RESEND_API_KEY not configured - emails will not be sent');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface ShareInviteEmailData {
  to: string;
  ownerName: string;
  ownerEmail: string;
  deviceName: string;
  permissions: string[];
  acceptUrl: string;
  expiresInDays: number;
}

export async function sendShareInviteEmail(data: ShareInviteEmailData) {
  if (!resend) {
    console.error('[Email] Cannot send email - Resend not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const permissionsText = data.permissions.includes('control')
    ? 'view and control'
    : 'view only';

  try {
    const result = await resend.emails.send({
      from: 'No Longer Evil <noreply@nolongerevil.com>',
      to: data.to,
      subject: `${data.ownerName} invited you to control their thermostat`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thermostat Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Thermostat Sharing Invitation</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${data.ownerName}</strong> (${data.ownerEmail}) has invited you to access their thermostat.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
              <p style="margin: 0 0 10px 0;"><strong>Device:</strong> ${data.deviceName}</p>
              <p style="margin: 0;"><strong>Access Level:</strong> ${permissionsText}</p>
            </div>

            <p style="margin-bottom: 30px;">
              You'll be able to ${permissionsText} this thermostat from your No Longer Evil dashboard.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.acceptUrl}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 14px 32px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Accept Invitation
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              This invitation will expire in ${data.expiresInDays} days. If you don't want to accept, you can safely ignore this email.
            </p>

            <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.acceptUrl}" style="color: #667eea; word-break: break-all;">${data.acceptUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Failed to send share invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
