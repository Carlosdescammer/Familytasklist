import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

export interface BrandOption {
  brand: string;
  price: number;
  store: string;
  details?: string; // Additional details about this brand (e.g., "Organic", "Store brand", "Premium")
}

export interface ShoppingItemAnalysis {
  category: string;
  estimatedPrice: number;
  priceRange: string;
  bestStore: string | null;
  currentPrice?: number; // Current online price if available
  deals?: string[]; // Active deals/coupons
  brandOptions?: BrandOption[]; // Different brand options with pricing
  alternatives: string[];
  tips: string[];
}

export type AIProvider = 'gemini' | 'openai';

export interface RecipeSuggestion {
  title: string;
  description: string;
  ingredients: string[];
  cookingTime?: string;
  servings?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Analyzes a shopping item using AI (Gemini or OpenAI)
 * @param itemName - The name of the shopping item
 * @param apiKey - The family's API key
 * @param preferredStores - List of family's preferred stores
 * @param location - Family's location for regional pricing
 * @param provider - AI provider to use ('gemini' or 'openai')
 * @returns Analysis data for the item
 */
export async function analyzeShoppingItem(
  itemName: string,
  apiKey: string,
  preferredStores: string[] = [],
  location?: string,
  provider: AIProvider = 'gemini'
): Promise<ShoppingItemAnalysis> {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!itemName || itemName.trim().length === 0) {
    throw new Error('Item name is required');
  }

  if (provider === 'openai') {
    return analyzeWithOpenAI(itemName, apiKey, preferredStores, location);
  } else {
    return analyzeWithGemini(itemName, apiKey, preferredStores, location);
  }
}

async function analyzeWithGemini(
  itemName: string,
  apiKey: string,
  preferredStores: string[] = [],
  location?: string
): Promise<ShoppingItemAnalysis> {
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

Please provide CURRENT, UP-TO-DATE information:
1. Category (e.g., Produce, Dairy, Meat, Bakery, Pantry, Frozen, Beverages, Snacks, Personal Care, Household, etc.)
2. Estimated average price in USD (based on current 2025 prices)
3. Price range (e.g., "$2-$4")
4. Current online price if available from major retailers (e.g., Walmart.com, Target.com, Amazon)
5. Best store to buy from (choose from preferred stores if provided, otherwise suggest a common store type)
6. Active deals, coupons, or typical savings opportunities (e.g., "Buy 2 Get 1 Free at Target", "Digital coupon available", "On sale this week")
7. BRAND OPTIONS: List 3-5 different brand options available at common stores with their prices and details:
   - Include store brands (e.g., "Great Value" at Walmart, "Good & Gather" at Target, "365" at Whole Foods)
   - Include popular national brands (e.g., "Kraft", "Pepsi", "Tide", etc.)
   - Include organic/premium options if applicable
   - Provide current pricing for each brand at specific stores
   - Add brief details (e.g., "Organic", "Store brand - best value", "Premium quality")
8. 2-3 alternative or similar products
9. 2-3 shopping tips or suggestions

IMPORTANT:
- Use realistic current market prices from 2025
- Check for typical promotional patterns (e.g., seasonal sales, common BOGO deals)
- Mention if the item is commonly on sale or has digital coupons
- For brand options, focus on brands actually available at the preferred stores or common retailers

Respond in valid JSON format only, no markdown formatting:
{
  "category": "category name",
  "estimatedPrice": 0.00,
  "currentPrice": 0.00,
  "priceRange": "$X-$Y",
  "bestStore": "store name or null",
  "deals": ["deal1", "deal2"],
  "brandOptions": [
    {
      "brand": "Brand Name",
      "price": 0.00,
      "store": "Store Name",
      "details": "Description (e.g., Organic, Store brand, Premium)"
    }
  ],
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

async function analyzeWithOpenAI(
  itemName: string,
  apiKey: string,
  preferredStores: string[] = [],
  location?: string
): Promise<ShoppingItemAnalysis> {
  const openai = new OpenAI({ apiKey });

  const storesContext = preferredStores.length > 0
    ? `The family prefers shopping at: ${preferredStores.join(', ')}.`
    : '';

  const locationContext = location
    ? `They are located in ${location}.`
    : '';

  const prompt = `Analyze this shopping item: "${itemName}"

${storesContext}
${locationContext}

Please provide CURRENT, UP-TO-DATE information:
1. Category (e.g., Produce, Dairy, Meat, Bakery, Pantry, Frozen, Beverages, Snacks, Personal Care, Household, etc.)
2. Estimated average price in USD (based on current 2025 prices)
3. Price range (e.g., "$2-$4")
4. Current online price if available from major retailers (e.g., Walmart.com, Target.com, Amazon)
5. Best store to buy from (choose from preferred stores if provided, otherwise suggest a common store type)
6. Active deals, coupons, or typical savings opportunities (e.g., "Buy 2 Get 1 Free at Target", "Digital coupon available", "On sale this week")
7. BRAND OPTIONS: List 3-5 different brand options available at common stores with their prices and details:
   - Include store brands (e.g., "Great Value" at Walmart, "Good & Gather" at Target, "365" at Whole Foods)
   - Include popular national brands (e.g., "Kraft", "Pepsi", "Tide", etc.)
   - Include organic/premium options if applicable
   - Provide current pricing for each brand at specific stores
   - Add brief details (e.g., "Organic", "Store brand - best value", "Premium quality")
8. 2-3 alternative or similar products
9. 2-3 shopping tips or suggestions

IMPORTANT:
- Use realistic current market prices from 2025
- Check for typical promotional patterns (e.g., seasonal sales, common BOGO deals)
- Mention if the item is commonly on sale or has digital coupons
- For brand options, focus on brands actually available at the preferred stores or common retailers

Respond in valid JSON format:
{
  "category": "category name",
  "estimatedPrice": 0.00,
  "currentPrice": 0.00,
  "priceRange": "$X-$Y",
  "bestStore": "store name or null",
  "deals": ["deal1", "deal2"],
  "brandOptions": [
    {
      "brand": "Brand Name",
      "price": 0.00,
      "store": "Store Name",
      "details": "Description (e.g., Organic, Store brand, Premium)"
    }
  ],
  "alternatives": ["alternative1", "alternative2"],
  "tips": ["tip1", "tip2"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest and fastest
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content;
    if (!text) {
      throw new Error('No response from OpenAI');
    }

    const analysis: ShoppingItemAnalysis = JSON.parse(text);

    // Validate the response structure
    if (!analysis.category || typeof analysis.estimatedPrice !== 'number') {
      throw new Error('Invalid response structure from AI');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing shopping item with OpenAI:', error);
    throw new Error(`Failed to analyze item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates recipe suggestions based on a list of shopping items
 * @param items - Array of shopping item names
 * @param apiKey - The family's API key
 * @returns Array of recipe suggestions
 */
export async function generateRecipeSuggestions(
  items: string[],
  apiKey: string,
  provider: AIProvider = 'gemini'
): Promise<RecipeSuggestion[]> {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!items || items.length === 0) {
    throw new Error('At least one item is required');
  }

  if (provider === 'openai') {
    return generateRecipesWithOpenAI(items, apiKey);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const itemsList = items.join(', ');

  const prompt = `Based on these shopping list items: ${itemsList}

Generate 3-4 REAL, PRACTICAL recipes that can actually be cooked using some or all of these ingredients. These should be genuine recipes that people actually make, not invented or fake recipes.

For each recipe, provide:
1. Title - A real recipe name (e.g., "Classic Chicken Stir Fry", "Homemade Tomato Soup")
2. Description - Brief description of what the dish is and why it's good (1-2 sentences)
3. Ingredients - List of main ingredients with REALISTIC MEASUREMENTS (e.g., "2 cups rice", "1 lb chicken breast", "3 tablespoons olive oil")
4. Cooking Time - Approximate total time to prepare and cook (e.g., "30 minutes")
5. Servings - How many people this recipe serves (e.g., "4 servings")
6. Difficulty - easy, medium, or hard

IMPORTANT: Only suggest recipes that:
- Are commonly cooked and have been tested
- Use realistic ingredient combinations
- Include proper measurements and quantities
- Are practical for home cooking

Respond in valid JSON format only, no markdown formatting:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "ingredients": ["2 cups ingredient1 with measurement", "1 lb ingredient2"],
      "cookingTime": "30 minutes",
      "servings": "4 servings",
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

async function generateRecipesWithOpenAI(
  items: string[],
  apiKey: string
): Promise<RecipeSuggestion[]> {
  const openai = new OpenAI({ apiKey });
  const itemsList = items.join(', ');

  const prompt = `Based on these shopping list items: ${itemsList}

Generate 3-4 REAL, PRACTICAL recipes that can actually be cooked using some or all of these ingredients. These should be genuine recipes that people actually make, not invented or fake recipes.

For each recipe, provide:
1. Title - A real recipe name (e.g., "Classic Chicken Stir Fry", "Homemade Tomato Soup")
2. Description - Brief description of what the dish is and why it's good (1-2 sentences)
3. Ingredients - List of main ingredients with REALISTIC MEASUREMENTS (e.g., "2 cups rice", "1 lb chicken breast", "3 tablespoons olive oil")
4. Cooking Time - Approximate total time to prepare and cook (e.g., "30 minutes")
5. Servings - How many people this recipe serves (e.g., "4 servings")
6. Difficulty - easy, medium, or hard

IMPORTANT: Only suggest recipes that:
- Are commonly cooked and have been tested
- Use realistic ingredient combinations
- Include proper measurements and quantities
- Are practical for home cooking

Respond in valid JSON format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "ingredients": ["2 cups ingredient1 with measurement", "1 lb ingredient2"],
      "cookingTime": "30 minutes",
      "servings": "4 servings",
      "difficulty": "easy"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const text = completion.choices[0].message.content;
    if (!text) {
      throw new Error('No response from OpenAI');
    }

    const result_data = JSON.parse(text);
    return result_data.recipes || [];
  } catch (error) {
    console.error('Error generating recipe suggestions with OpenAI:', error);
    throw new Error(`Failed to generate recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Tests if an API key is valid by making a simple request
 * @param apiKey - The API key to test
 * @param provider - AI provider to test ('gemini' or 'openai')
 * @returns true if valid, false otherwise
 */
export async function testApiKey(apiKey: string, provider: AIProvider = 'gemini'): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    console.error('API key test failed: Empty API key provided');
    return false;
  }

  if (provider === 'openai') {
    try {
      const openai = new OpenAI({
        apiKey,
        timeout: 10000, // 10 second timeout
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 5,
      });

      const hasContent = !!completion.choices[0]?.message?.content;
      console.log('OpenAI API key test result:', hasContent ? 'SUCCESS' : 'FAILED (no content)');
      return hasContent;
    } catch (error: any) {
      console.error('OpenAI API key test failed:', {
        message: error?.message,
        status: error?.status,
        type: error?.type,
        code: error?.code,
      });

      // Log specific error types to help with debugging
      if (error?.status === 401) {
        console.error('OpenAI authentication failed - API key is invalid');
      } else if (error?.status === 429) {
        console.error('OpenAI rate limit exceeded');
      } else if (error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
        console.error('OpenAI network error - cannot reach API');
      }

      return false;
    }
  }

  // Gemini validation
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = result.response;
    const text = response.text();

    const isValid = text.length > 0;
    console.log('Gemini API key test result:', isValid ? 'SUCCESS' : 'FAILED (no content)');
    return isValid;
  } catch (error: any) {
    console.error('Gemini API key test failed:', {
      message: error?.message,
      status: error?.status,
    });
    return false;
  }
}