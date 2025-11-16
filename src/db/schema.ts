import { pgTable, uuid, text, timestamp, boolean, integer, numeric, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Families table
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').unique(),
  description: text('description'),
  funFacts: text('fun_facts'), // JSON string of fun facts
  // AI Shopping Assistant fields
  aiApiKey: text('ai_api_key'), // Encrypted Google Gemini API key
  aiEnabled: boolean('ai_enabled').default(false).notNull(),
  preferredStores: text('preferred_stores'), // JSON array of store names
  location: text('location'), // City/region for price estimates
  shoppingPreferences: text('shopping_preferences'), // JSON for AI preferences
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id').references(() => families.id, { onDelete: 'cascade' }),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'),
  role: text('role').default('parent').notNull(),
  name: text('name'),
  bio: text('bio'),
  birthday: timestamp('birthday', { withTimezone: true }),
  favoriteColor: text('favorite_color'),
  favoriteFood: text('favorite_food'),
  hobbies: text('hobbies'),
  relationship: text('relationship'), // e.g., "Mom", "Dad", "Son", "Daughter"
  googleId: text('google_id').unique(),
  googleAccessToken: text('google_access_token'),
  googleRefreshToken: text('google_refresh_token'),
  tokenExpires: timestamp('token_expires', { withTimezone: true }),
  // Child Profile & Gamification fields
  allowedPages: text('allowed_pages'), // JSON array of page names child can access
  gamificationEnabled: boolean('gamification_enabled').default(false).notNull(),
  familyBucks: numeric('family_bucks', { precision: 10, scale: 2 }).default('0').notNull(), // Current balance
  totalPointsEarned: numeric('total_points_earned', { precision: 10, scale: 2 }).default('0').notNull(), // Lifetime points
  pointsPerTask: numeric('points_per_task', { precision: 10, scale: 2 }).default('10').notNull(), // Points awarded per task completion
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Events table
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'), // Address or location name
  eventType: text('event_type'), // e.g., "Birthday", "Appointment", "Family Gathering"
  attendees: text('attendees'), // Comma-separated user IDs
  url: text('url'), // Link to virtual event or related website
  color: text('color'), // Color for visual coding
  notes: text('notes'), // Additional notes
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  googleEventId: text('google_event_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Shopping lists table
export const shoppingLists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
  members: text('members'), // Comma-separated user IDs who can collaborate
  isFamilyList: boolean('is_family_list').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Shopping items table
export const shoppingItems = pgTable('shopping_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => shoppingLists.id, { onDelete: 'cascade' })
    .notNull(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  qty: text('qty'),
  addedBy: uuid('added_by').references(() => users.id, { onDelete: 'set null' }),
  completed: boolean('completed').default(false).notNull(),
  // AI-generated fields
  category: text('category'), // e.g., "Produce", "Dairy", "Meat"
  estimatedPrice: numeric('estimated_price', { precision: 10, scale: 2 }), // AI-suggested price
  priceRange: text('price_range'), // e.g., "$2-$4"
  bestStore: text('best_store'), // AI recommendation based on family preferences
  aiMetadata: text('ai_metadata'), // JSON for additional AI data (alternatives, tips, etc.)
  lastAiUpdate: timestamp('last_ai_update', { withTimezone: true }), // When AI last analyzed this item
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  priority: text('priority').default('medium').notNull(),
  tags: text('tags'), // Comma-separated tags
  completed: boolean('completed').default(false).notNull(),
  photoUrl: text('photo_url'), // Photo attached to task (creation or completion)
  completionPhotoUrl: text('completion_photo_url'), // Photo proving task completion
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(), // Who should receive this notification
  type: text('type').notNull(), // e.g., 'task_completion', 'all_tasks_complete'
  title: text('title').notNull(),
  message: text('message').notNull(),
  relatedTaskId: uuid('related_task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  relatedUserId: uuid('related_user_id').references(() => users.id, { onDelete: 'set null' }), // e.g., which child completed tasks
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const familiesRelations = relations(families, ({ many }) => ({
  users: many(users),
  events: many(events),
  shoppingLists: many(shoppingLists),
  shoppingItems: many(shoppingItems),
  tasks: many(tasks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  createdEvents: many(events),
  createdShoppingLists: many(shoppingLists),
  addedShoppingItems: many(shoppingItems),
  assignedTasks: many(tasks),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  family: one(families, {
    fields: [events.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  shoppingLists: many(shoppingLists),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  family: one(families, {
    fields: [shoppingLists.familyId],
    references: [families.id],
  }),
  event: one(events, {
    fields: [shoppingLists.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [shoppingLists.createdBy],
    references: [users.id],
  }),
  items: many(shoppingItems),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  family: one(families, {
    fields: [shoppingItems.familyId],
    references: [families.id],
  }),
  list: one(shoppingLists, {
    fields: [shoppingItems.listId],
    references: [shoppingLists.id],
  }),
  addedByUser: one(users, {
    fields: [shoppingItems.addedBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  family: one(families, {
    fields: [tasks.familyId],
    references: [families.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

// NextAuth.js adapter tables (required by @auth/drizzle-adapter)
export const authUsers = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Type exports for use in application
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;
export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type NewShoppingItem = typeof shoppingItems.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
