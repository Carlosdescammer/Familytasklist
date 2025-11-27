# PWA Phase 5: Real-Time Collaboration

## Overview
Phase 5 adds real-time collaboration features to FamilyList using Socket.IO, enabling family members to see live updates, presence indicators, and collaborative features across all devices.

## Features Implemented

### 1. Socket.IO Infrastructure

#### Server-Side
- **API Route**: `/api/socket` - Handles Socket.IO connections
- **Server Module**: `src/lib/socket-server.ts` - Socket.IO server configuration
- **Event Emitters**: `src/lib/realtime-events.ts` - Helper functions for emitting events

#### Client-Side
- **Client Module**: `src/lib/socket-client.ts` - Socket.IO client utilities
- **Provider Component**: `src/components/RealtimeProvider.tsx` - App-wide Socket.IO initialization

### 2. React Hooks

#### `useSocket`
Manages Socket.IO connection and provides connection status
```tsx
const { socket, connected, error, emit } = useSocket(config);
```

#### `useOnlineUsers`
Tracks online family members in real-time
```tsx
const { onlineUsers, loading, error } = useOnlineUsers(familyId);
```

#### `usePresence`
Manages user presence status (online, away, offline)
```tsx
const { status, updateStatus, sendHeartbeat } = usePresence();
```

#### `useTypingIndicator`
Shows who is currently typing in a specific location
```tsx
const { typingUsers, onTypingStart, onTypingStop } = useTypingIndicator('tasks');
```

#### `useRealtimeSync`
Syncs data automatically when real-time events occur
```tsx
const { data, loading, error, refetch } = useRealtimeSync({
  fetchData: fetchTasks,
  syncEvents: ['task:created', 'task:updated', 'task:deleted'],
});
```

#### `useSocketEvent`
Subscribe to specific Socket.IO events
```tsx
useSocketEvent('task:created', (task) => {
  console.log('New task created:', task);
});
```

### 3. UI Components

#### `<OnlineUsers />`
Displays currently online family members
```tsx
<OnlineUsers familyId={familyId} variant="avatars" maxDisplay={5} />
```

Props:
- `familyId`: string - Family ID to show online users for
- `variant`: 'list' | 'avatars' - Display style
- `maxDisplay`: number - Maximum users to display

#### `<TypingIndicator />`
Shows typing status in real-time
```tsx
<TypingIndicator location="tasks" />
```

#### `<RealtimeActivityFeed />`
Live activity feed showing family actions
```tsx
<RealtimeActivityFeed maxItems={10} height={400} />
```

### 4. Real-Time Events

#### Task Events
- `task:created` - New task created
- `task:updated` - Task updated
- `task:completed` - Task marked as complete
- `task:deleted` - Task deleted

#### Shopping Events
- `shopping:list-created` - New shopping list
- `shopping:list-updated` - Shopping list updated
- `shopping:list-deleted` - Shopping list deleted
- `shopping:item-added` - Item added to list
- `shopping:item-updated` - Item updated
- `shopping:item-deleted` - Item deleted
- `shopping:item-checked` - Item checked off

#### Calendar Events
- `calendar:event-created` - New event created
- `calendar:event-updated` - Event updated
- `calendar:event-deleted` - Event deleted

#### Recipe Events
- `recipe:created` - New recipe added
- `recipe:updated` - Recipe updated
- `recipe:deleted` - Recipe deleted
- `recipe:favorited` - Recipe favorited

#### Presence Events
- `presence:user-joined` - User came online
- `presence:user-left` - User went offline
- `presence:status-changed` - User status changed
- `presence:online-users` - List of online users

#### Activity Events
- `activity:new` - New activity occurred

#### Typing Events
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

## Usage Guide

### Setting Up Real-Time in Your Component

1. **Basic Setup** (already done in AppLayout):
```tsx
import { RealtimeProvider } from '@/components/RealtimeProvider';

function App() {
  const realtimeConfig = {
    familyId: user.currentFamilyId,
    userId: user.id,
    userName: user.name,
    autoConnect: true,
  };

  return (
    <RealtimeProvider config={realtimeConfig}>
      {/* Your app content */}
    </RealtimeProvider>
  );
}
```

2. **Show Online Users**:
```tsx
import { OnlineUsers } from '@/components/OnlineUsers';

function Header() {
  return (
    <div>
      <h1>My Family</h1>
      <OnlineUsers familyId={familyId} variant="avatars" />
    </div>
  );
}
```

3. **Listen for Real-Time Updates**:
```tsx
import { useSocketEvent } from '@/hooks/useSocket';

function TaskList() {
  const [tasks, setTasks] = useState([]);

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

  return <div>{/* Render tasks */}</div>;
}
```

4. **Auto-Sync Data with Real-Time**:
```tsx
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

function TaskList() {
  const { data: tasks, loading } = useRealtimeSync({
    fetchData: async () => {
      const res = await fetch('/api/tasks');
      return res.json();
    },
    syncEvents: ['task:created', 'task:updated', 'task:deleted'],
  });

  if (loading) return <div>Loading...</div>;
  return <div>{/* Render tasks */}</div>;
}
```

5. **Typing Indicators**:
```tsx
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';

function CommentBox() {
  const { onTypingStart, onTypingStop } = useTypingIndicator('comments');

  return (
    <div>
      <textarea
        onKeyDown={onTypingStart}
        onBlur={onTypingStop}
      />
      <TypingIndicator location="comments" />
    </div>
  );
}
```

### Emitting Real-Time Events from API Routes

```tsx
// In your API route (e.g., /api/tasks/route.ts)
import { emitTaskCreated } from '@/lib/realtime-events';

export async function POST(req: Request) {
  // Create task in database
  const task = await db.insert(tasks).values(data).returning();

  // Get user info
  const user = await getCurrentUser();

  // Emit real-time event to all family members
  emitTaskCreated(task.familyId, task[0], {
    id: user.id,
    name: user.name,
  });

  return Response.json(task[0]);
}
```

### Available Event Emitters

```tsx
// Tasks
emitTaskCreated(familyId, task, createdByUser);
emitTaskUpdated(familyId, task, updatedByUser);
emitTaskCompleted(familyId, task, completedByUser);
emitTaskDeleted(familyId, taskId, deletedBy);

// Shopping
emitShoppingListCreated(familyId, list, createdByUser);
emitShoppingListUpdated(familyId, list, updatedByUser);
emitShoppingListDeleted(familyId, listId, deletedBy);
emitShoppingItemAdded(familyId, item, addedByUser);
emitShoppingItemUpdated(familyId, item, updatedByUser);
emitShoppingItemChecked(familyId, itemId, listId, completed, checkedByUser);
emitShoppingItemDeleted(familyId, itemId, listId, deletedBy);

// Calendar
emitCalendarEventCreated(familyId, event, createdByUser);
emitCalendarEventUpdated(familyId, event, updatedByUser);
emitCalendarEventDeleted(familyId, eventId, deletedBy);

// Recipes
emitRecipeCreated(familyId, recipe, createdByUser);
emitRecipeUpdated(familyId, recipe, updatedByUser);
emitRecipeDeleted(familyId, recipeId, deletedBy);
emitRecipeFavorited(familyId, recipeId, userId, isFavorite);
```

## Architecture

### Connection Flow
1. User logs in and navigates to the app
2. `RealtimeProvider` initializes with user's family and user ID
3. Socket.IO client connects to `/api/socket`
4. Server creates Socket.IO server instance (if not exists)
5. Client emits `connection:join-family` event
6. Server adds client to family room
7. Server broadcasts `presence:user-joined` to family members
8. Client is now connected and receiving real-time updates

### Event Flow
1. User performs action (e.g., creates a task)
2. Client sends request to API route
3. API route updates database
4. API route calls event emitter (e.g., `emitTaskCreated()`)
5. Server emits event to family room via Socket.IO
6. All connected family members receive the event
7. Clients update UI automatically

### Presence Tracking
- Heartbeat sent every 2 minutes to maintain connection
- Status automatically changes to "away" after 5 minutes of inactivity
- Activity detection via mouse/keyboard/touch events
- Status changes broadcast to all family members

## Benefits

### For Users
- **Instant Updates**: See changes immediately without refreshing
- **Presence Awareness**: Know who's online and active
- **Better Collaboration**: See what others are doing in real-time
- **Typing Indicators**: Know when someone is composing a message
- **Live Activity Feed**: Stay updated on family actions

### For Developers
- **Simple API**: Easy-to-use hooks and components
- **Type-Safe**: Full TypeScript support
- **Automatic Sync**: Data stays in sync without manual polling
- **Scalable**: Room-based architecture supports multiple families
- **Flexible**: Easy to add new events and features

## Performance Considerations

- Socket.IO uses WebSocket for low-latency communication
- Fallback to polling for older browsers
- Events are scoped to family rooms (not broadcast to all users)
- Automatic reconnection on disconnect
- Heartbeat mechanism prevents zombie connections

## Browser Support

- Chrome/Edge: Full support ✓
- Firefox: Full support ✓
- Safari: Full support ✓
- Mobile browsers: Full support ✓

## Next Steps

### Future Enhancements
1. **Conflict Resolution**: Handle simultaneous edits
2. **Optimistic Updates**: Update UI before server confirms
3. **Offline Queue**: Queue actions when offline, sync when online
4. **Collaborative Editing**: Real-time collaborative text editing
5. **Voice/Video Calls**: WebRTC integration for family calls
6. **Screen Sharing**: Share screens during family meetings
7. **Real-time Notifications**: In-app notifications with sound
8. **Presence Avatars**: Show user avatars at their cursor position

## Testing

To test real-time features:

1. **Single Device**: Open two browser windows/tabs
2. **Multiple Devices**: Test on phone + computer
3. **Different Networks**: Test across different network conditions

Test scenarios:
- Create a task in one tab, verify it appears in the other
- Check online users are displayed correctly
- Test typing indicators
- Verify presence status changes
- Test reconnection after network loss

## Troubleshooting

### Connection Issues
- Check that Socket.IO server is running
- Verify `/api/socket` route is accessible
- Check browser console for connection errors
- Ensure user has valid familyId and userId

### Events Not Received
- Verify event name matches exactly
- Check user is in correct family room
- Ensure event emitter is called in API route
- Check Socket.IO server logs

### Performance Issues
- Monitor number of connected clients
- Check for memory leaks in event listeners
- Verify heartbeat intervals aren't too frequent
- Consider implementing rate limiting for high-frequency events

## Files Created

### Server
- `src/app/api/socket/route.ts` - Socket.IO API route
- `src/lib/socket-server.ts` - Server configuration
- `src/lib/realtime-events.ts` - Event emitters

### Client
- `src/lib/socket-client.ts` - Client utilities
- `src/types/realtime.ts` - TypeScript types

### Hooks
- `src/hooks/useSocket.ts` - Socket connection hook
- `src/hooks/useOnlineUsers.ts` - Online users hook
- `src/hooks/usePresence.ts` - Presence status hook
- `src/hooks/useTypingIndicator.ts` - Typing indicator hook
- `src/hooks/useRealtimeSync.ts` - Auto-sync hook

### Components
- `src/components/RealtimeProvider.tsx` - Provider component
- `src/components/OnlineUsers.tsx` - Online users display
- `src/components/TypingIndicator.tsx` - Typing indicator
- `src/components/RealtimeActivityFeed.tsx` - Activity feed

## Conclusion

Phase 5 successfully transforms FamilyList into a real-time collaborative application. Family members can now see instant updates, track who's online, and collaborate in real-time across all features.

The implementation is production-ready, type-safe, and built on proven technologies (Socket.IO). All the infrastructure is in place for you to easily add real-time features to existing and new parts of the application.
