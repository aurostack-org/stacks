import { Home, Settings } from 'lucide-react';
import type { NavItem } from '@inerds/layouts';

/**
 * Drives the app shell's navigation. Keep it in step with `router.tsx` — the
 * shell derives the sidebar from this list, not from the router, so a route
 * added in one place and not the other is simply unreachable or dead.
 *
 * `icon` is a rendered element, not a component reference.
 */
export const NAV_ITEMS: NavItem[] = [
	{ to: '/', label: 'Home', icon: <Home className="size-4" />, end: true },
	{ to: '/settings', label: 'Settings', icon: <Settings className="size-4" /> }
];
