/**
 * Affiliate portal location.
 *
 * Mirrors dental-staff-app/src/lib/config/portal.ts — keep the two in sync.
 * Three environments (local :4000, staging Railway URL, prod partners.*), so a
 * `dev ? local : prod` ternary cannot express it, and PUBLIC_APP_ENV cannot be
 * used to branch because it is always INTERNAL.
 */
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

const LOCAL_PORTAL_URL = 'http://localhost:4000';
const PROD_PORTAL_URL = 'https://partners.dtstaffingsolutions.com';

export const PARTNER_PORTAL_URL =
	env.PUBLIC_PARTNER_PORTAL_URL || (dev ? LOCAL_PORTAL_URL : PROD_PORTAL_URL);
