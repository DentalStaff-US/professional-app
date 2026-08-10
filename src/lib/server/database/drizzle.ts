import { DATABASE_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const pool = new pg.Pool({
	connectionString: DATABASE_URL,
	max: 20, // Maximum pool size
	min: 2, // Minimum pool size (keep some connections alive)
	idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
	connectionTimeoutMillis: 5000, // Return error after 5 seconds if can't connect
	// PostgreSQL keepalive settings (prevents the Railway proxy dropping idle connections)
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000
});

// pg re-emits idle-client errors (ECONNRESET etc.) on the pool. Without this
// listener the EventEmitter throws and takes the whole process down.
pool.on('error', (err) => {
	console.error('Unexpected error on idle client', err);
	// Don't exit the process - let the pool recover
});

const db = drizzle(pool);

export default db;
