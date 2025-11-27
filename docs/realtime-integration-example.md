# Real-Time Integration Example

This document shows how to integrate real-time events into your existing API routes.

## Example: Adding Real-Time to Tasks API

### Before (Without Real-Time)

```tsx
// src/app/api/tasks/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Create task
  const newTask = await db.insert(tasks).values({
    title: body.title,
    description: body.description,
    assignedTo: body.assignedTo,
    familyId: body.familyId,
    dueDate: body.dueDate,
  }).returning();

  return Response.json(newTask[0]);
}
```

### After (With Real-Time)

```tsx
// src/app/api/tasks/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { emitTaskCreated } from '@/lib/realtime-events';  // ← Import event emitter
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Create task
  const newTask = await db.insert(tasks).values({
    title: body.title,
    description: body.description,
    assignedTo: body.assignedTo,
    familyId: body.familyId,
    dueDate: body.dueDate,
  }).returning();

  // Get user info for real-time event
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  // Emit real-time event to all family members  ← Add this
  if (user) {
    emitTaskCreated(body.familyId, newTask[0], {
      id: user.id,
      name: user.name,
    });
  }

  return Response.json(newTask[0]);
}
```

**Changes Made:**
1. Import `emitTaskCreated` from `@/lib/realtime-events`
2. Fetch user info to include in the event
3. Call `emitTaskCreated()` after database operation
4. Pass family ID, task data, and user info

**Result:** All family members now see the new task instantly without refreshing!

---

## Example: Task Update with Real-Time

```tsx
// src/app/api/tasks/[id]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { emitTaskUpdated, emitTaskCompleted } from '@/lib/realtime-events';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id } = params;

  // Get existing task
  const existingTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });

  if (!existingTask) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Update task
  const updatedTask = await db
    .update(tasks)
    .set(body)
    .where(eq(tasks.id, id))
    .returning();

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user) {
    // Check if task was completed
    if (body.completed && !existingTask.completed) {
      // Task was just completed
      emitTaskCompleted(existingTask.familyId, updatedTask[0], {
        id: user.id,
        name: user.name,
      });
    } else {
      // Regular update
      emitTaskUpdated(existingTask.familyId, updatedTask[0], {
        id: user.id,
        name: user.name,
      });
    }
  }

  return Response.json(updatedTask[0]);
}
```

---

## Example: Shopping List with Real-Time

```tsx
// src/app/api/shopping/items/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { shoppingItems, users } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { emitShoppingItemAdded } from '@/lib/realtime-events';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // Get user's family ID
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.currentFamilyId) {
    return Response.json({ error: 'No family' }, { status: 400 });
  }

  // Add item to shopping list
  const newItem = await db.insert(shoppingItems).values({
    name: body.name,
    quantity: body.quantity,
    listId: body.listId,
    completed: false,
  }).returning();

  // Emit real-time event
  emitShoppingItemAdded(user.currentFamilyId, newItem[0], {
    id: user.id,
    name: user.name,
  });

  return Response.json(newItem[0]);
}
```

---

## Frontend: Listening for Real-Time Updates

### Option 1: Using `useRealtimeSync` (Recommended)

This automatically refetches data when events occur:

```tsx
// src/app/tasks/page.tsx
'use client';

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export default function TasksPage() {
  const { data: tasks, loading, refetch } = useRealtimeSync({
    fetchData: async () => {
      const res = await fetch('/api/tasks');
      return res.json();
    },
    syncEvents: [
      'task:created',
      'task:updated',
      'task:completed',
      'task:deleted',
    ],
    fetchOnMount: true,
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Tasks</h1>
      {tasks?.map(task => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}
```

### Option 2: Using `useSocketEvent` (Manual)

This gives you more control over how to handle events:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSocketEvent } from '@/hooks/useSocket';
import type { Task } from '@/db/schema';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Initial fetch
  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(setTasks);
  }, []);

  // Listen for new tasks
  useSocketEvent('task:created', (newTask) => {
    setTasks(prev => [...prev, newTask]);
  });

  // Listen for task updates
  useSocketEvent('task:updated', (updatedTask) => {
    setTasks(prev => prev.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    ));
  });

  // Listen for task deletions
  useSocketEvent('task:deleted', (data) => {
    setTasks(prev => prev.filter(t => t.id !== data.taskId));
  });

  return (
    <div>
      <h1>Tasks</h1>
      {tasks.map(task => (
        <div key={task.id}>{task.title}</div>
      ))}
    </div>
  );
}
```

---

## Testing Your Integration

1. **Open two browser tabs**
2. **Log in as the same user** (or different family members)
3. **Create a task in one tab**
4. **Verify it appears instantly in the other tab**

---

## Common Patterns

### Pattern 1: Create Operation
```tsx
// 1. Insert into database
const newItem = await db.insert(table).values(data).returning();

// 2. Get user info
const user = await getCurrentUser();

// 3. Emit event
emitItemCreated(familyId, newItem[0], { id: user.id, name: user.name });

// 4. Return response
return Response.json(newItem[0]);
```

### Pattern 2: Update Operation
```tsx
// 1. Update database
const updated = await db.update(table).set(data).where(eq(table.id, id)).returning();

// 2. Get user info
const user = await getCurrentUser();

// 3. Emit event
emitItemUpdated(familyId, updated[0], { id: user.id, name: user.name });

// 4. Return response
return Response.json(updated[0]);
```

### Pattern 3: Delete Operation
```tsx
// 1. Get item to find familyId
const item = await db.query.table.findFirst({ where: eq(table.id, id) });

// 2. Delete from database
await db.delete(table).where(eq(table.id, id));

// 3. Get user info
const user = await getCurrentUser();

// 4. Emit event
emitItemDeleted(item.familyId, id, user.id);

// 5. Return response
return Response.json({ success: true });
```

---

## Best Practices

1. **Always emit events AFTER database operations**
   - Ensures data is saved before notifying others
   - Prevents race conditions

2. **Include user context in events**
   - Shows who made the change
   - Useful for activity feeds and notifications

3. **Use try-catch for event emissions**
   - Don't fail the request if event emission fails
   - Log errors for debugging

```tsx
try {
  emitTaskCreated(familyId, task, user);
} catch (error) {
  console.error('Failed to emit real-time event:', error);
  // Don't throw - the task was created successfully
}
```

4. **Test with multiple clients**
   - Always test real-time features with multiple tabs/devices
   - Verify events are received by all family members

5. **Consider rate limiting**
   - Prevent abuse of high-frequency operations
   - Debounce events if needed

---

## Debugging

### Check if Socket.IO is connected
```tsx
import { isConnected } from '@/lib/socket-client';

console.log('Connected:', isConnected());
```

### Monitor events in browser console
```tsx
import { on } from '@/lib/socket-client';

on('task:created', (task) => {
  console.log('Task created:', task);
});
```

### Check server logs
Look for these messages in your terminal:
- `[Socket.IO] Client connected:`
- `[Socket.IO] User joined family:`
- `[Socket.IO] Emitted task:created to family:`

---

## Summary

To add real-time to any feature:

1. **Import event emitter** from `@/lib/realtime-events`
2. **Call emitter after database operation**
3. **Pass family ID, data, and user info**
4. **Use `useRealtimeSync` or `useSocketEvent`** on frontend
5. **Test with multiple tabs/devices**

That's it! Your feature now supports real-time collaboration. 🎉
