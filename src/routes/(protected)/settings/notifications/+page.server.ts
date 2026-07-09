import { redirect, fail, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import db from '$lib/server/database/drizzle';
import { userTable } from '$lib/server/database/drizzle-schemas';
import { updateUser } from '$lib/server/database/user-model';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) redirect(302, '/sign-in');

	const [row] = await db
		.select({ receiveEmail: userTable.receiveEmail, receiveSms: userTable.receiveSms })
		.from(userTable)
		.where(eq(userTable.id, user.id))
		.limit(1);

	return {
		receiveEmail: row?.receiveEmail ?? true,
		receiveSms: row?.receiveSms ?? true
	};
};

export const actions = {
	default: async (event: RequestEvent) => {
		const user = event.locals.user;
		if (!user) return fail(401, { error: 'Unauthorized' });

		const fd = await event.request.formData();
		// Unchecked checkboxes are absent from the payload → false.
		const receiveEmail = fd.get('receiveEmail') === 'on';
		const receiveSms = fd.get('receiveSms') === 'on';

		await updateUser(user.id, { receiveEmail, receiveSms });
		setFlash({ type: 'success', message: 'Notification preferences updated.' }, event);
		return { success: true, receiveEmail, receiveSms };
	}
};
