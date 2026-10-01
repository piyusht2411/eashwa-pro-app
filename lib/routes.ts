import type { Href } from 'expo-router';

import type { AppUser } from '@/types';

/**
 * Where a signed-in account belongs.
 *
 * One place decides this, so the root guard and the index route can never send
 * a user to two different screens at the same moment.
 */

export const LOGIN_ROUTE = '/(auth)/login' as Href;

export function homeRouteFor(user?: AppUser | null): Href {
  if (!user) return LOGIN_ROUTE;

  // Transport portal
  if (user.portal === 'transport') {
    if (user.role === 'admin') return '/(transport-admin)/dashboard' as Href;
    if (user.role === 'accounts') return '/(accounts)/dashboard' as Href;
    if (user.role === 'driver') return '/(driver)/dashboard' as Href;
  }

  // Production portal
  if (user.role === 'admin') return '/(admin)/dashboard' as Href;
  if (user.role === 'team') return '/(team)/dashboard' as Href;
  if (user.role === 'pdi') return '/(pdi)/dashboard' as Href;

  // Transport roles on accounts whose portal was never set explicitly.
  if (user.role === 'accounts') return '/(accounts)/dashboard' as Href;
  if (user.role === 'driver') return '/(driver)/dashboard' as Href;

  return LOGIN_ROUTE;
}
