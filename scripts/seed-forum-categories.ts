import { db } from '@/lib/db';
import { forumCategories } from '@/db/schema';

const defaultCategories = [
  {
    name: 'Meal Planning & Recipes',
    description: 'Discuss meal planning strategies, share cooking tips, and get recipe advice',
    icon: '🍳',
    slug: 'meal-planning-recipes',
    order: 1,
  },
  {
    name: 'Budgeting & Shopping',
    description: 'Share budgeting tips, shopping strategies, and money-saving ideas',
    icon: '💰',
    slug: 'budgeting-shopping',
    order: 2,
  },
  {
    name: 'Chores & Organization',
    description: 'Tips for organizing your home and managing household chores',
    icon: '🏠',
    slug: 'chores-organization',
    order: 3,
  },
  {
    name: 'Family Activities',
    description: 'Share ideas for family fun, activities, and quality time together',
    icon: '🎉',
    slug: 'family-activities',
    order: 4,
  },
  {
    name: 'General Discussion',
    description: 'General conversation about family life and parenting',
    icon: '💬',
    slug: 'general-discussion',
    order: 5,
  },
  {
    name: 'Q&A / Help',
    description: 'Ask questions and get help from the community',
    icon: '❓',
    slug: 'qa-help',
    order: 6,
  },
];

async function seedCategories() {
  console.log('Seeding forum categories...');

  try {
    for (const category of defaultCategories) {
      const existing = await db.query.forumCategories.findFirst({
        where: (categories, { eq }) => eq(categories.slug, category.slug),
      });

      if (existing) {
        console.log(`⊘ Category already exists: ${category.name}`);
      } else {
        await db.insert(forumCategories).values(category);
        console.log(`✓ Created category: ${category.name}`);
      }
    }

    console.log('Done seeding forum categories!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
