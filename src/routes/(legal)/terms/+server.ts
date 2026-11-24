import { redirect } from '@sveltejs/kit';
import { LEGAL_SITE } from '$lib/config/constants';

// The marketing site is the one place the legal pages live.
export const GET = () => redirect(301, `${LEGAL_SITE}/terms`);
