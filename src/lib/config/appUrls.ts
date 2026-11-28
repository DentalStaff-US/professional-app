import { PUBLIC_CLIENT_APP_DOMAIN as RAW_CLIENT_APP_DOMAIN } from '$env/static/public';

/**
 * The admin / practice app's origin, with any trailing slash removed. Every
 * admin API call is built as `${PUBLIC_CLIENT_APP_DOMAIN}/api/...`, so a stray
 * `/` on the Railway variable would produce `//api/...`. Import it from here,
 * never from $env directly.
 */
export const trimTrailingSlash = (url: string | undefined) => (url ?? '').trim().replace(/\/+$/, '');

export const PUBLIC_CLIENT_APP_DOMAIN = trimTrailingSlash(RAW_CLIENT_APP_DOMAIN);
