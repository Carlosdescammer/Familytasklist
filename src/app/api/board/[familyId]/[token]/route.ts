import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families, tasks, events, shoppingLists, shoppingItems, budgets, expenses, photos, users } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, isNotNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/board/[familyId]/[token] - Get board data (public, authenticated by token)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; token: string }> }
) {
  try {
    const { familyId, token } = await params;

    // Validate the family and token
    const family = await db.query.families.findFirst({
      where: and(
        eq(families.id, familyId),
        eq(families.boardToken, token),
        eq(families.boardEnabled, true)
      ),
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Board not found or disabled' },
        { status: 404 }
      );
    }

    const widgets = family.boardWidgets ? JSON.parse(family.boardWidgets) : ['events', 'tasks', 'shopping'];
    const boardData: any = {
      familyName: family.name,
      widgets,
      lastUpdated: new Date().toISOString(),
    };

    // Fetch data for each enabled widget
    const now = new Date();

    if (widgets.includes('events')) {
      // Get upcoming events for the next 7 days
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);

      const upcomingEvents = await db.query.events.findMany({
        where: and(
          eq(events.familyId, familyId),
          gte(events.startTime, now)
        ),
        orderBy: [events.startTime],
        limit: 10,
      });

      boardData.events = upcomingEvents.map((event) => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        color: event.color,
      }));
    }

    if (widgets.includes('tasks')) {
      // Get incomplete tasks
      const incompleteTasks = await db.query.tasks.findMany({
        where: and(
          eq(tasks.familyId, familyId),
          eq(tasks.completed, false)
        ),
        orderBy: [desc(tasks.priority), tasks.dueDate],
        limit: 15,
        with: {
          assignedUser: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      boardData.tasks = incompleteTasks.map((task) => {
        const assignedUser = Array.isArray(task.assignedUser)
          ? task.assignedUser[0]
          : task.assignedUser;

        return {
          id: task.id,
          title: task.title,
          completed: task.completed,
          priority: task.priority,
          dueDate: task.dueDate,
          assigneeName: assignedUser?.name || 'Unassigned',
        };
      });
    }

    if (widgets.includes('shopping')) {
      // Get shopping lists with items
      const activeLists = await db.query.shoppingLists.findMany({
        where: eq(shoppingLists.familyId, familyId),
        orderBy: [desc(shoppingLists.createdAt)],
        limit: 3,
        with: {
          items: {
            where: eq(shoppingItems.completed, false),
            limit: 20,
          },
        },
      });

      boardData.shopping = activeLists.map((list) => ({
        id: list.id,
        name: list.name,
        itemCount: list.items.length,
        items: list.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.qty,
          category: item.category,
        })),
      }));
    }

    if (widgets.includes('budget')) {
      // Get current month budget
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
      const monthStart = new Date(`${currentMonth}-01`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthBudget = await db.query.budgets.findFirst({
        where: and(
          eq(budgets.familyId, familyId),
          eq(budgets.month, currentMonth)
        ),
      });

      const totalSpending = await db
        .select({
          total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)::numeric(10,2)`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.familyId, familyId),
            gte(expenses.expenseDate, monthStart),
            lte(expenses.expenseDate, monthEnd)
          )
        );

      const totalSpent = parseFloat(totalSpending[0]?.total?.toString() || '0');
      const budgetLimit = monthBudget?.totalBudget
        ? parseFloat(monthBudget.totalBudget.toString())
        : 0;

      boardData.budget = {
        month: currentMonth,
        totalBudget: budgetLimit,
        totalSpent,
        percentUsed: budgetLimit > 0 ? Math.round((totalSpent / budgetLimit) * 100) : 0,
      };
    }

    if (widgets.includes('clock')) {
      boardData.clock = {
        enabled: true,
      };
    }

    if (widgets.includes('photos')) {
      // Get recent photos (last 12 photos)
      const recentPhotos = await db.query.photos.findMany({
        where: eq(photos.familyId, familyId),
        orderBy: [desc(photos.createdAt)],
        limit: 12,
        with: {
          uploader: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      boardData.photos = recentPhotos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        uploaderName: photo.uploader?.name || 'Unknown',
        createdAt: photo.createdAt,
      }));
    }

    if (widgets.includes('weather')) {
      // Get weather data using family location
      if (family.location) {
        try {
          // Using wttr.in as a free weather API (no key required)
          const weatherResponse = await fetch(
            `https://wttr.in/${encodeURIComponent(family.location)}?format=j1`,
            { next: { revalidate: 1800 } } // Cache for 30 minutes
          );

          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            const current = weatherData.current_condition?.[0];
            const forecast = weatherData.weather?.slice(0, 3); // Next 3 days

            boardData.weather = {
              location: family.location,
              current: current ? {
                temp: current.temp_F,
                feelsLike: current.FeelsLikeF,
                condition: current.weatherDesc?.[0]?.value || 'Unknown',
                humidity: current.humidity,
                windSpeed: current.windspeedMiles,
                icon: current.weatherCode,
              } : null,
              forecast: forecast?.map((day: any) => ({
                date: day.date,
                maxTemp: day.maxtempF,
                minTemp: day.mintempF,
                condition: day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown',
                icon: day.hourly?.[4]?.weatherCode,
              })) || [],
            };
          }
        } catch (error) {
          console.error('Error fetching weather:', error);
          boardData.weather = { error: 'Unable to fetch weather' };
        }
      } else {
        boardData.weather = { error: 'Location not set' };
      }
    }

    if (widgets.includes('birthdays')) {
      // Get upcoming birthdays (next 60 days)
      const familyUsers = await db.query.users.findMany({
        where: and(
          eq(users.familyId, familyId),
          isNotNull(users.birthday)
        ),
        columns: {
          id: true,
          name: true,
          birthday: true,
          avatarUrl: true,
        },
      });

      // Calculate upcoming birthdays
      const today = new Date();
      const upcomingBirthdays = familyUsers
        .map((user) => {
          if (!user.birthday) return null;

          const birthday = new Date(user.birthday);
          const thisYearBirthday = new Date(
            today.getFullYear(),
            birthday.getMonth(),
            birthday.getDate()
          );

          // If birthday has passed this year, use next year
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(today.getFullYear() + 1);
          }

          const daysUntil = Math.ceil(
            (thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Only include birthdays in the next 60 days
          if (daysUntil <= 60) {
            const age = today.getFullYear() - birthday.getFullYear();
            return {
              id: user.id,
              name: user.name || 'Unknown',
              birthday: thisYearBirthday.toISOString(),
              daysUntil,
              age: age + (thisYearBirthday.getFullYear() > today.getFullYear() ? 1 : 0),
              avatarUrl: user.avatarUrl,
            };
          }
          return null;
        })
        .filter((b) => b !== null)
        .sort((a, b) => a!.daysUntil - b!.daysUntil);

      boardData.birthdays = upcomingBirthdays;
    }

    if (widgets.includes('calendar')) {
      // Get all events for current month (for calendar view)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthEvents = await db.query.events.findMany({
        where: and(
          eq(events.familyId, familyId),
          gte(events.startTime, monthStart),
          lte(events.startTime, monthEnd)
        ),
        orderBy: [events.startTime],
      });

      boardData.calendar = {
        month: now.getMonth(),
        year: now.getFullYear(),
        events: monthEvents.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          color: event.color,
        })),
      };
    }

    return NextResponse.json(boardData);
  } catch (error) {
    console.error('Error fetching board data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
