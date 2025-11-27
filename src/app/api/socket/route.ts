/**
 * Socket.IO API Route Handler
 *
 * This route initializes and manages the Socket.IO server for real-time
 * collaboration features in the FamilyList application.
 */

import { Server as HTTPServer } from 'http';
import { NextRequest } from 'next/server';
import { initSocketServer, getIO } from '@/lib/socket-server';

// Global flag to track if Socket.IO has been initialized
let isSocketInitialized = false;

export async function GET(req: NextRequest) {
  const server: HTTPServer = (req as any).socket?.server;

  if (!server) {
    return new Response(JSON.stringify({ error: 'Server not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize Socket.IO server if not already initialized
  if (!isSocketInitialized) {
    try {
      initSocketServer(server);
      isSocketInitialized = true;
      console.log('[Socket.IO] Server initialized successfully');
    } catch (error) {
      console.error('[Socket.IO] Failed to initialize server:', error);
      return new Response(JSON.stringify({ error: 'Failed to initialize Socket.IO' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const io = getIO();

  return new Response(
    JSON.stringify({
      success: true,
      connected: io ? true : false,
      message: 'Socket.IO server is running'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(req: NextRequest) {
  // This endpoint can be used to trigger server-side Socket.IO events
  try {
    const io = getIO();

    if (!io) {
      return new Response(JSON.stringify({ error: 'Socket.IO not initialized' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { event, data, room } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Emit event to specific room or broadcast
    if (room) {
      io.to(room).emit(event as any, data);
    } else {
      io.emit(event as any, data);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event emitted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Socket.IO] Error emitting event:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to emit event' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
