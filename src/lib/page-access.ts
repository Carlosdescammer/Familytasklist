/**
 * Utility functions for checking page access based on user role and settings
 */

export type PageName = 'calendar' | 'tasks' | 'shopping' | 'family' | 'settings' | 'community' | 'budget';

/**
 * Check if a user has access to a specific page
 * @param userRole - The user's role (parent or child)
 * @param allowedPages - Array of pages the child is allowed to access (only for children)
 * @param pageName - The page to check access for
 * @returns true if user has access, false otherwise
 */
export function canAccessPage(
  userRole: string | undefined,
  allowedPages: string[] | null | undefined,
  pageName: PageName
): boolean {
  // Parents can access everything
  if (userRole === 'parent') {
    return true;
  }

  // Children with no restrictions can access everything
  if (!allowedPages || allowedPages.length === 0) {
    return true;
  }

  // Check if child has access to this specific page
  return allowedPages.includes(pageName);
}

/**
 * Get list of pages a user can access
 * @param userRole - The user's role
 * @param allowedPages - Array of pages the child is allowed to access
 * @returns Array of page names the user can access
 */
export function getAccessiblePages(
  userRole: string | undefined,
  allowedPages: string[] | null | undefined
): PageName[] {
  const allPages: PageName[] = ['calendar', 'tasks', 'shopping', 'family', 'settings', 'community', 'budget'];

  // Parents can access everything
  if (userRole === 'parent') {
    return allPages;
  }

  // Children with no restrictions can access everything
  if (!allowedPages || allowedPages.length === 0) {
    return allPages;
  }

  // Return only allowed pages
  return allPages.filter((page) => allowedPages.includes(page));
}

/**
 * Map page names to their routes
 */
export const PAGE_ROUTES: Record<PageName, string> = {
  calendar: '/calendar',
  tasks: '/tasks',
  shopping: '/shopping',
  family: '/family',
  settings: '/settings',
  community: '/community',
  budget: '/budget',
};

/**
 * Map page names to display labels
 */
export const PAGE_LABELS: Record<PageName, string> = {
  calendar: 'Calendar',
  tasks: 'My Tasks',
  shopping: 'Shopping',
  family: 'Family',
  settings: 'Settings',
  community: 'Community',
  budget: 'Budget',
};
