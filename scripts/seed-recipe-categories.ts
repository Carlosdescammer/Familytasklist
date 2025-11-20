import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const defaultCategories = [
  { name: 'Breakfast', description: 'Morning meals and brunch ideas', icon: '🍳' },
  { name: 'Lunch', description: 'Midday meals and quick bites', icon: '🥪' },
  { name: 'Dinner', description: 'Evening meals and main courses', icon: '🍽️' },
  { name: 'Desserts', description: 'Sweet treats and baked goods', icon: '🍰' },
  { name: 'Appetizers', description: 'Starters and small plates', icon: '🥗' },
  { name: 'Snacks', description: 'Quick bites and munchies', icon: '🍿' },
  { name: 'Beverages', description: 'Drinks and refreshments', icon: '🥤' },
  { name: 'Salads', description: 'Fresh greens and healthy bowls', icon: '🥙' },
  { name: 'Soups & Stews', description: 'Comforting liquid meals', icon: '🍲' },
  { name: 'Pasta', description: 'Noodle dishes and Italian classics', icon: '🍝' },
  { name: 'Vegetarian', description: 'Plant-based meals', icon: '🥬' },
  { name: 'Vegan', description: 'No animal products', icon: '🌱' },
  { name: 'Gluten-Free', description: 'Wheat-free options', icon: '🌾' },
  { name: 'Low-Carb', description: 'Reduced carbohydrate meals', icon: '🥩' },
  { name: 'Kid-Friendly', description: 'Meals children love', icon: '👶' },
  { name: 'Quick & Easy', description: 'Recipes ready in 30 minutes or less', icon: '⚡' },
  { name: 'Holiday', description: 'Special occasion recipes', icon: '🎉' },
  { name: 'Baking', description: 'Breads, cakes, and pastries', icon: '🥐' },
];

async function seedCategories() {
  console.log('🔄 Seeding recipe categories...');

  try {
    for (const category of defaultCategories) {
      await sql`
        INSERT INTO recipe_categories (name, description, icon)
        VALUES (${category.name}, ${category.description}, ${category.icon})
        ON CONFLICT (name) DO NOTHING
      `;
      console.log(`✅ Added category: ${category.name}`);
    }

    console.log('✅ All recipe categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

seedCategories().then(() => {
  console.log('✅ Seeding complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
