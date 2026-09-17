import { fetchAdmin } from '$lib/server/fetchAdmin';
import { generateToken } from '$lib/server/utils';
import { redirect } from '@sveltejs/kit';
// import { userSchema } from '$lib/config/zod-schemas';
// import { updateEmailAddressSuccessEmail } from '$lib/config/email-messages';
// import { updateUser } from '$lib/server/database/user-model.js';

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/sign-in');
	}
	// Affiliate card data — status and link only; everything else is in the
	// portal. Never blocks the settings page: fetchAdmin returns a result rather
	// than throwing, and a failure just hides the entry.
	const token = generateToken(user.id);
	const affiliate = await fetchAdmin<{
		programEnabled: boolean;
		eligible: boolean;
		enrolled: boolean;
		status?: string;
		linkActive?: boolean;
		connectComplete?: boolean;
		referralCode?: string | null;
		referralUrl?: string | null;
	}>('/api/external/affiliate/status', { token });

	return {
		user,
		affiliateStatus: affiliate.ok ? affiliate.data : null
	};
};

// export const actions = {
// 	default: async (event) => {
// 		const form = await superValidate(event, profileSchema);
// 		//console.log(form);

// 		if (!form.valid) {
// 			return fail(400, {
// 				form
// 			});
// 		}

// 		//add user to db
// 		try {
// 			console.log('updating profile');
// 			const user = event.locals.user;
// 			if (user) {
// 				await updateUser(user.id, {
// 					firstName: form.data.firstName,
// 					lastName: form.data.lastName,
// 					email: form.data.email
// 				});
// 				setFlash({ type: 'success', message: 'Profile update successful.' }, event);
// 			}

// 			if (user?.email !== form.data.email) {
// 				if (user) {
// 					await updateUser(user?.userId, {
// 						verified: false
// 					});
// 					await updateEmailAddressSuccessEmail(form.data.email, user?.email, user?.token);
// 				}
// 			}
// 		} catch (e) {
// 			console.error(e);
// 			return setError(form, 'There was a problem updating your profile.');
// 		}
// 		console.log('profile updated successfully');
// 		return message(form, 'Profile updated successfully.');
// 	}
// };
