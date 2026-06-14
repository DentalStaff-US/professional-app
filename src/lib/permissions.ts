// Better Auth access-control — mirrors the admin app so the shared `role`
// column resolves consistently across both apps. The candidate app only ever
// hosts CANDIDATE users, but the full role set is defined for parity.
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

export const statement = {
	...defaultStatements
} as const;

export const ac = createAccessControl(statement);

export const SUPERADMIN = ac.newRole({ ...adminAc.statements });
export const CLIENT = ac.newRole({});
export const CLIENT_STAFF = ac.newRole({});
export const CANDIDATE = ac.newRole({});

export const roles = {
	SUPERADMIN,
	CLIENT,
	CLIENT_STAFF,
	CANDIDATE
};
