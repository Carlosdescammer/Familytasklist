import { NextRequest, NextResponse } from 'next/server';
import { sendNotificationEmail } from '@/lib/email';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const testEmailSchema = z.object({
  to: z.string().email(),
  userName: z.string(),
  familyName: z.string(),
  notificationType: z.enum([
    'task_assigned',
    'task_completed',
    'all_tasks_complete',
    'event_reminder',
    'event_created',
    'shopping_list_created',
    'shopping_list_updated',
    'budget_alert',
    'budget_limit_reached',
    'family_member_joined',
    'recipe_shared',
  ]),
  title: z.string(),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = testEmailSchema.parse(body);

    console.log('Sending test email:', {
      to: data.to,
      type: data.notificationType,
      title: data.title,
    });

    const result = await sendNotificationEmail({
      to: data.to,
      userName: data.userName,
      familyName: data.familyName,
      notificationType: data.notificationType,
      title: data.title,
      message: data.message,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        data: result.data,
      });
    } else {
      console.error('Email send error:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error instanceof Error ? result.error.message : 'Failed to send email',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
