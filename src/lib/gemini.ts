import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ShoppingItemAnalysis {
  category: string;
  estimatedPrice: number;
  priceRange: string;
  bestStore: string | null;
  alternatives: string[];
  tips: string[];
}

export interface RecipeSuggestion {
  title: string;
  description: string;
  ingredients: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Analyzes a shopping item using Google Gemini AI
 * @param itemName - The name of the shopping item
 * @param apiKey - The family's Google Gemini API key
 * @param preferredStores - List of family's preferred stores
 * @param location - Family's location for regional pricing
 * @returns Analysis data for the item
 */
export async function analyzeShoppingItem(
  itemName: string,
  apiKey: string,
  preferredStores: string[] = [],
  location?: string
): Promise<ShoppingItemAnalysis> {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!itemName || itemName.trim().length === 0) {
    throw new Error('Item name is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const storesContext = preferredStores.length > 0
    ? `The family prefers shopping at: ${preferredStores.join(', ')}.`
    : '';

  const locationContext = location
    ? `They are located in ${location}.`
    : '';

  const prompt = `Analyze this shopping item: "${itemName}"

${storesContext}
${locationContext}

Please provide:
1. Category (e.g., Produce, Dairy, Meat, Bakery, Pantry, Frozen, Beverages, Snacks, Personal Care, Household, etc.)
2. Estimated average price in USD
3. Price range (e.g., "$2-$4")
4. Best store to buy from (choose from preferred stores if provided, otherwise suggest a common store type)
5. 2-3 alternative or similar products
6. 2-3 shopping tips or suggestions

Respond in valid JSON format only, no markdown formatting:
{
  "category": "category name",
  "estimatedPrice": 0.00,
  "priceRange": "$X-$Y",
  "bestStore": "store name or null",
  "alternatives": ["alternative1", "alternative2"],
  "tips": ["tip1", "tip2"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '').trim();
    }

    const analysis: ShoppingItemAnalysis = JSON.parse(cleanedText);

    // Validate the response structure
    if (!analysis.category || typeof analysis.estimatedPrice !== 'number') {
      throw new Error('Invalid response structure from AI');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing shopping item:', error);
    throw new Error(`Failed to analyze item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates recipe suggestions based on a list of shopping items
 * @param items - Array of shopping item names
 * @param apiKey - The family's Google Gemini API key
 * @returns Array of recipe suggestions
 */
export async function generateRecipeSuggestions(
  items: string[],
  apiKey: string
): Promise<RecipeSuggestion[]> {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!items || items.length === 0) {
    throw new Error('At least one item is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const itemsList = items.join(', ');

  const prompt = `Based on these shopping list items: ${itemsList}

Suggest 3-4 recipes that could be made using some or all of these ingredients.

For each recipe, provide:
1. Title
2. Brief description (1-2 sentences)
3. Main ingredients needed (include items from the list)
4. Difficulty level (easy, medium, or hard)

Respond in valid JSON format only, no markdown formatting:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "ingredients": ["ingredient1", "ingredient2"],
      "difficulty": "easy"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up the response
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '').trim();
    }

    const result_data = JSON.parse(cleanedText);

    return result_data.recipes || [];
  } catch (error) {
    console.error('Error generating recipe suggestions:', error);
    throw new Error(`Failed to generate recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Tests if an API key is valid by making a simple request
 * @param apiKey - The API key to test
 * @returns true if valid, false otherwise
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = result.response;
    const text = response.text();

    return text.length > 0;
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}