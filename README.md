# FamilyList - Family Task & Shopping Management System

A comprehensive family management application built with Next.js 14, featuring task management, shopping lists, calendar events, gamification, and AI-powered shopping assistance.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?style=flat-square&logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## Features

### Core Functionality
- **Multi-Family Support** - Create and manage multiple family groups with invite codes
- **User Roles** - Parent and Child roles with different permissions
- **Task Management** - Assign tasks to family members with photos, notes, and priorities
- **Shopping Lists** - Collaborative shopping lists with AI-powered item analysis
- **Calendar Events** - Shared family calendar with Google Calendar sync
- **Notifications** - Real-time notifications for task completions and family activities
- **PWA Support** - Installable on iOS and Android devices

### Gamification System
- **Child Profiles** - Custom profiles with avatars and relationships
- **Family Bucks** - Point-based reward system for completing tasks
- **Task Rewards** - Configurable points per task completion
- **Progress Tracking** - Total points earned and current balance tracking
- **Parent Controls** - Award bonus points and manage child settings

### AI Shopping Assistant (Google Gemini Integration)
- **Automatic Item Analysis** - AI analyzes each shopping item for:
  - Category classification (Produce, Dairy, Meat, Pantry, etc.)
  - Price estimation and price ranges
  - Best store recommendations
  - Alternative product suggestions
  - Shopping tips and advice
- **Recipe Suggestions** - Generate recipe ideas based on shopping list items
- **Personalized Recommendations** - Uses family location and preferred stores
- **Background Processing** - Non-blocking AI analysis for better UX
- **Category Grouping** - View shopping list organized by categories

### Advanced Features
- **Photo Uploads** - Attach photos when creating or completing tasks
- **Custom Child Settings** - Restrict access to specific pages (calendar, shopping, family)
- **Parent Controls** - Only parents can update family settings and award points
- **Multi-store Support** - Configure preferred stores for better AI recommendations
- **Secure API Key Storage** - Encrypted storage of Google Gemini API keys
- **Notification System** - Parents get notified when children complete all tasks

## Tech Stack

### Frontend
- **Next.js 14** - App Router with Server Components
- **React 18** - UI components with hooks
- **TypeScript** - Type-safe development
- **Mantine UI v7** - Modern component library
- **Tabler Icons** - Icon system
- **Day.js** - Date handling

### Backend
- **Next.js API Routes** - RESTful API endpoints
- **NextAuth.js v5** - Authentication with Google OAuth
- **Drizzle ORM** - Type-safe database ORM
- **PostgreSQL** (Neon) - Serverless database
- **Google Gemini API** - AI-powered shopping assistance
- **Zod** - Schema validation

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Drizzle Kit** - Database migrations
- **Docker** - Containerization (optional)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Google OAuth credentials
- Google Calendar API access
- Google Gemini API key (for AI features - optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Carlosdescammer/Familytasklist.git
   cd Familytasklist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Encryption (for API keys)
   ENCRYPTION_KEY=your-32-character-encryption-key
   ```

4. **Generate encryption key**
   ```bash
   openssl rand -hex 16
   ```
   Copy the output to `ENCRYPTION_KEY` in `.env.local`

5. **Generate NextAuth secret**
   ```bash
   openssl rand -base64 32
   ```
   Copy the output to `NEXTAUTH_SECRET` in `.env.local`

6. **Run database migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3001`

## Environment Variables Guide

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_URL` | Your application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for auth | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | From Google Cloud Console |
| `ENCRYPTION_KEY` | 32-character encryption key | Generate with `openssl rand -hex 16` |

### Obtaining Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to `.env.local`

### Setting Up Google Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add the key in the app's **Family Settings** page
4. Enable AI features in settings
5. Configure preferred stores and location for personalized recommendations

## Database Schema

The application uses the following main tables:

- **users** - User accounts, roles, and gamification data
- **families** - Family groups with AI settings
- **tasks** - Task assignments with photos and completion tracking
- **shopping_lists** - Shopping lists linked to events
- **shopping_items** - Items with AI analysis data (category, price, store)
- **events** - Calendar events with Google Calendar sync
- **notifications** - User notifications
- **child_profiles** - Extended child user profiles with avatars

## Project Structure

```
familylist/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   ├── families/     # Family management
│   │   │   ├── tasks/        # Task operations
│   │   │   ├── shopping-lists/ # Shopping list endpoints
│   │   │   ├── events/       # Calendar events
│   │   │   ├── notifications/ # Notification system
│   │   │   └── users/        # User management
│   │   ├── auth/             # Auth pages
│   │   ├── calendar/         # Calendar page
│   │   ├── family/           # Family management page
│   │   ├── onboarding/       # New user onboarding
│   │   ├── profile/          # Child profiles
│   │   ├── settings/         # Family settings
│   │   ├── shopping/         # Shopping lists
│   │   ├── tasks/            # Task management
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Dashboard
│   ├── components/            # React components
│   │   ├── AppLayout.tsx     # Main layout with navigation
│   │   └── PageAccessGuard.tsx # Permission guard
│   ├── db/
│   │   └── schema.ts         # Drizzle ORM schema
│   ├── lib/
│   │   ├── db.ts             # Database connection
│   │   ├── encryption.ts     # API key encryption
│   │   └── gemini.ts         # Google Gemini AI integration
│   └── auth.ts               # NextAuth configuration
├── drizzle/                   # Database migrations
├── public/                    # Static assets
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── .env.local                 # Environment variables (not in git)
├── drizzle.config.ts          # Drizzle configuration
├── package.json
└── tsconfig.json
```

## Key Features Explained

### Gamification System

Parents can enable gamification for child accounts:
1. Navigate to **Settings** → **Child Profile Settings**
2. Create a child profile with avatar and relationship
3. Enable **Gamification Mode**
4. Configure **Points Per Task** (e.g., 10 Family Bucks per task)
5. Children earn points automatically when completing tasks
6. Parents can manually award bonus points
7. Track total points earned and current balance on the child's dashboard

**Features:**
- Customizable point values
- Real-time balance updates
- Total points earned tracking
- Parent override for manual awards

### AI Shopping Assistant

When AI is enabled (requires Google Gemini API key):

1. **Enable AI Features**:
   - Go to **Family Settings**
   - Add your Google Gemini API key
   - Enable **AI Shopping Assistant**
   - Configure **Preferred Stores** and **Location**

2. **Using AI Analysis**:
   - Add items to shopping lists (e.g., "bananas", "chicken breast")
   - AI automatically analyzes each item in the background (2-3 seconds)
   - Items display:
     - Purple sparkle icon ✨ (AI analyzed)
     - Category badge (e.g., "Produce", "Meat")
     - Estimated price ($X.XX)
     - Price range ($X-$Y)
     - Best store recommendation

3. **View Detailed Analysis**:
   - Click any AI-analyzed item
   - See alternative products
   - Read shopping tips
   - View timestamp of analysis

4. **Recipe Suggestions**:
   - Click **Get Recipe Ideas** button
   - AI generates 3-4 recipes using your list items
   - Includes ingredients, instructions, and difficulty level

5. **Category View**:
   - Toggle between **List View** and **Category View**
   - Category view groups items by type (Produce, Dairy, etc.)
   - Shows item count per category

**AI Model**: Uses Google Gemini 2.0 Flash (experimental) for fast, accurate analysis

**Rate Limits** (Free Tier):
- 15 requests per minute
- 1,500 requests per day
- Check usage at: https://ai.dev/usage?tab=rate-limit

### Task Management with Photos

1. **Create Tasks**:
   - Click **Add Task**
   - Enter title, notes, due date, priority
   - Assign to family member
   - Optionally attach a photo (reference image)

2. **Complete Tasks**:
   - Mark task as complete
   - Upload completion photo as proof
   - Parents receive notification when all tasks done

3. **Task Photos**:
   - Stored as base64 in database
   - Supports JPG, PNG, GIF
   - Viewable in task details

### Notification System

- **Automatic Notifications**: Parents get notified when children complete all assigned tasks
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Badge Counter**: Shows unread notification count
- **Mark Read/Unread**: Click to toggle notification status
- **Detailed Messages**: Includes child name and task count

### Child Settings & Access Control

Parents can customize each child's experience:

1. **Page Access Control**:
   - Toggle access to Calendar page
   - Toggle access to Shopping page
   - Toggle access to Family page
   - Children only see allowed pages in navigation

2. **Profile Customization**:
   - Choose avatar
   - Set relationship (Son, Daughter, etc.)
   - Display name on dashboard

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with Google
- `GET /api/auth/session` - Get current session
- `GET /api/auth/callback/google` - OAuth callback

### Families
- `POST /api/families` - Create family
- `GET /api/families` - Get family details
- `PATCH /api/families` - Update family settings (AI, stores, location)

### Tasks
- `GET /api/tasks` - List all family tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/[id]` - Update task (complete, photos)
- `DELETE /api/tasks/[id]` - Delete task

### Shopping Lists
- `GET /api/shopping-lists` - List all lists
- `POST /api/shopping-lists` - Create list
- `POST /api/shopping-lists/[id]/items` - Add item (triggers AI analysis)
- `PUT /api/shopping-lists/[id]/items/[itemId]` - Update item
- `DELETE /api/shopping-lists/[id]/items/[itemId]` - Delete item
- `GET /api/shopping-lists/[id]/recipe-suggestions` - Get AI recipe ideas

### Events
- `GET /api/events` - List calendar events
- `POST /api/events` - Create event (syncs to Google Calendar)
- `PATCH /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/[id]` - Mark as read/unread

### Users
- `GET /api/users/[id]/child-settings` - Get child settings
- `PATCH /api/users/[id]/child-settings` - Update child settings
- `POST /api/users/[id]/award-points` - Award Family Bucks (parents only)

## Available Scripts

- `npm run dev` - Start development server (runs on port 3001)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

The app will be available at `http://localhost:3000`.

### Environment Variables for Production

Ensure you set all environment variables in your hosting platform:
- Update `NEXTAUTH_URL` to your production domain
- Use production database credentials
- Keep `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` secure and random
- Never commit `.env.local` to version control

## Usage Guide

### For Parents

1. **Initial Setup**
   - Sign in with Google
   - Create a family and get invite code
   - Share invite code with family members

2. **Family Settings**
   - Add Google Gemini API key for AI features
   - Configure preferred stores (e.g., "Walmart", "Target", "Whole Foods")
   - Set family location (e.g., "New York, NY")
   - Enable AI shopping assistant

3. **Managing Children**
   - Go to **Settings** → **Child Profile Settings**
   - Create child profiles with custom settings
   - Enable/disable gamification
   - Set points per task (default: 10)
   - Award bonus points manually
   - Restrict page access (calendar, shopping, family) as needed

4. **Creating Tasks**
   - Add tasks with photos, notes, priorities
   - Assign to family members
   - Set due dates
   - Track completion and view proof photos
   - Receive notifications when children complete all tasks

### For Children

1. **Dashboard**
   - View assigned tasks
   - See Family Bucks balance (if gamification enabled)
   - Check completed tasks count
   - View total points earned

2. **Completing Tasks**
   - Mark tasks as complete
   - Upload proof photos (optional)
   - Earn Family Bucks automatically
   - See updated balance instantly

3. **Shopping & Calendar**
   - Access if enabled by parents
   - Add items to shopping lists
   - View family events
   - Participate in family planning

## PWA Installation

### iOS

1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

### Android

1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Tap "Add"

## Troubleshooting

### AI Features Not Working

**Issue**: "Failed to generate recipe suggestions" or items not showing AI data

**Solutions**:
1. **Check API Key**: Verify Google Gemini API key is valid in Family Settings
2. **Verify AI Enabled**: Ensure AI toggle is ON in Family Settings
3. **Check Quota**: Visit https://ai.dev/usage?tab=rate-limit to check your usage
4. **Free Tier Limits**: 15 requests/minute, 1,500 requests/day
5. **Wait for Quota Reset**: If exceeded, wait a few minutes before trying again
6. **Generate New Key**: Create a new API key at https://aistudio.google.com/app/apikey

**Error Code 429**: Quota exceeded - wait or upgrade your plan

### Database Connection Issues

**Issue**: "Error connecting to database"

**Solutions**:
1. Verify `DATABASE_URL` in `.env.local`
2. Check database is accessible and active (Neon databases auto-suspend)
3. Ensure `sslmode=require` is in connection string
4. Run migrations: `npm run db:migrate`
5. Restart dev server

### Photo Upload Issues

**Issue**: Photos not displaying or uploading

**Solutions**:
1. Check file size (large files may be slow)
2. Supported formats: JPG, PNG, GIF
3. Photos stored as base64 in database
4. Clear browser cache if images don't load

### Gamification Not Working

**Issue**: Points not awarded or balance not updating

**Solutions**:
1. Ensure gamification is **enabled** in child settings
2. Check points per task is set (must be > 0)
3. Parent must save settings after changes
4. Refresh page to see updated balance

### Google OAuth Errors

**Issue**: OAuth signin fails

**Solutions**:
1. Verify redirect URIs in Google Cloud Console
2. Check Google Calendar API is enabled
3. Ensure Client ID and Secret are correct in `.env.local`
4. Use correct callback URL: `/api/auth/callback/google`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear commit messages
4. Test thoroughly (especially database and AI features)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request with detailed description

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI Components by [Mantine](https://mantine.dev/)
- Icons by [Tabler Icons](https://tabler.io/icons)
- Database by [Neon](https://neon.tech/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

## Support

For issues, questions, or contributions:
- **GitHub Issues**: https://github.com/Carlosdescammer/Familytasklist/issues
- **Documentation**: See this README
- **AI API Support**: https://ai.google.dev/gemini-api/docs

## Roadmap

### Planned Features
- [ ] Mobile app (React Native)
- [ ] Push notifications for mobile
- [ ] Two-way Google Calendar sync
- [ ] Chore scheduling automation (recurring tasks)
- [ ] Budget tracking integration
- [ ] Meal planning with recipe library
- [ ] Multiple language support (i18n)
- [ ] Dark mode theme
- [ ] Export reports (PDF/CSV)
- [ ] Voice input for tasks/shopping
- [ ] Barcode scanner for shopping items
- [ ] Location-based reminders
- [ ] Family chat/messaging

### Recently Completed
- [x] AI-powered shopping assistant
- [x] Gamification system with Family Bucks
- [x] Child profiles and access control
- [x] Photo uploads for tasks
- [x] Parent notification system
- [x] Recipe suggestions from AI
- [x] Category-grouped shopping view

---

**Made with ❤️ for families**

*Helping families stay organized, productive, and connected.*
