import { PUBLIC_CLIENT_APP_DOMAIN } from '$env/static/public';
import { logger } from '$lib/server/logger';

/**
 * Default user-facing message for a page that couldn't load some of its data
 * from the admin API. Surfaced via `data.loadError` on the candidate-app pages.
 * Centralized here so we can tweak the wording in one place.
 */
export const ADMIN_LOAD_ERROR_MESSAGE =
	"We couldn't load some of this page's data right now. Please refresh in a few seconds.";

export type FetchAdminOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	token?: string;
	headers?: Record<string, string>;
	body?: unknown;
	timeoutMs?: number;
};

export type FetchAdminResult<T> =
	| { ok: true; data: T; status: number }
	| { ok: false; error: string; status?: number; reason: 'network' | 'http' | 'parse' | 'timeout' };

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Server-side fetch to the admin app's external API. Never throws on network
 * or HTTP failure — returns a discriminated result so callers can decide
 * whether to surface an error to the user or fall back to empty data.
 *
 * Errors are logged via `logger.error` automatically with structured props.
 */
export async function fetchAdmin<T = unknown>(
	path: string,
	options: FetchAdminOptions = {}
): Promise<FetchAdminResult<T>> {
	const url = `${PUBLIC_CLIENT_APP_DOMAIN.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
	const method = options.method ?? 'GET';
	const headers: Record<string, string> = { ...(options.headers ?? {}) };
	if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
	if (options.body !== undefined && !headers['content-type'] && !headers['Content-Type']) {
		headers['content-type'] = 'application/json';
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

	const startedAt = Date.now();
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers,
			body:
				options.body === undefined
					? undefined
					: typeof options.body === 'string'
						? options.body
						: JSON.stringify(options.body),
			signal: controller.signal
		});
	} catch (error) {
		clearTimeout(timer);
		const isAbort = error instanceof DOMException && error.name === 'AbortError';
		const reason = isAbort ? 'timeout' : 'network';
		const message = isAbort
			? `Admin API timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
			: error instanceof Error
				? error.message
				: String(error);
		logger.error(`fetchAdmin ${reason}`, {
			error,
			path,
			method,
			durationMs: Date.now() - startedAt
		});
		return { ok: false, error: message, reason };
	}
	clearTimeout(timer);

	if (!res.ok) {
		let body: string | undefined;
		try {
			body = (await res.text()).slice(0, 1000);
		} catch {
			// ignore — body unreadable
		}
		logger.error('fetchAdmin http error', {
			path,
			method,
			status: res.status,
			body,
			durationMs: Date.now() - startedAt
		});
		return {
			ok: false,
			status: res.status,
			error: `Admin API returned ${res.status}`,
			reason: 'http'
		};
	}

	let data: T;
	try {
		data = (await res.json()) as T;
	} catch (error) {
		logger.error('fetchAdmin parse error', {
			error,
			path,
			method,
			status: res.status,
			durationMs: Date.now() - startedAt
		});
		return {
			ok: false,
			error: 'Admin API returned invalid JSON',
			status: res.status,
			reason: 'parse'
		};
	}

	return { ok: true, data, status: res.status };
}
