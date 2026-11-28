<script lang="ts">
	import { page } from '$app/state';
	import { AvailabilityPage, DocumentsPage, EditProfilePage, ResumePage, SkillsPage, SupportPage } from '$features/settings';
	import AppShell from '$shell/AppShell.svelte';

	// /_dev/preview/settings?view=documents|documents-empty|documents-locked|profile|resume|resume-empty|skills|skills-locked|skills-empty|availability|support|support-empty
	const view = $derived(page.url.searchParams.get('view') ?? 'documents');
	const form = (data: object) => ({ id: view, valid: true, posted: false, errors: {}, data, constraints: {} });
	const docs = [
		{ id: 'a', filename: 'efda-registration-with-a-rather-long-file-name-2029.pdf', type: 'LICENSE', uploadUrl: '#', createdAt: '2026-03-01T12:00:00Z', expiryDate: '2029-01-01', disciplineId: 'd3', disciplineAbbreviation: 'EFDA' },
		{ id: 'b', filename: 'cpr.jpg', type: 'CERTIFICATE', uploadUrl: '#', createdAt: '2026-04-01T12:00:00Z', locked: true },
		{ id: 'c', filename: 'w9.pdf', type: 'OTHER', uploadUrl: '#', createdAt: '2026-05-01T12:00:00Z' }
	];
	const disciplines = [{ disciplineId: 'd3', name: 'EFDA', abbreviation: 'EFDA', requiresLicense: true, requiresCert: true, effectiveLicenseExpiry: '2029-01-01' }];
	const catalog = [{ id: 'k1', name: 'Clinical', description: 'Hands-on skills.', skills: [{ id: 's1', name: 'Nitrous monitoring', requiresCertificate: true }, { id: 's2', name: 'Digital x-rays', requiresCertificate: false }] }];
	const skills = [{ skillId: 's1', categoryId: 'k1', name: 'Nitrous monitoring', requiresCertificate: true, certExpiresOn: null, effective: false }];
	const tickets = [{ supportTicket: { id: 't1', ticketNumber: 1042, title: 'My timesheet shows the wrong practice', status: 'NEW', updatedAt: '2026-10-01T15:00:00Z' } }];
	const documentForm = form({ documentType: 'LICENSE', documentDisciplineId: '', documentExpiryDate: '' });
</script>

<AppShell pathname={`/settings/${view.split('-')[0]}`} name="Maria Lopez" email="maria@example.com" initials="ML">
	{#if view.startsWith('documents')}
		<DocumentsPage documents={view === 'documents-empty' ? [] : docs} documentsForm={documentForm} {disciplines} editable={view !== 'documents-locked'} canEditCredentialMetadata={true} />
	{:else if view === 'profile'}
		<EditProfilePage user={{ firstName: 'Maria', lastName: 'Lopez' }} profile={{ completeAddress: '1 Main St, Tampa, FL' }} form={form({ firstName: 'Maria', lastName: 'Lopez', email: 'maria@example.com', cellPhone: '+15555555555', birthday: '1990-01-01', workPreference: 'BOTH' })} avatarForm={form({ url: '' })} />
	{:else if view.startsWith('resume')}
		<ResumePage resume={view === 'resume-empty' ? null : { filename: 'maria-lopez-resume.pdf', createdAt: '2026-02-01T12:00:00Z', uploadUrl: '#' }} resumeForm={form({ url: '', filename: '' })} />
	{:else if view.startsWith('skills')}
		<SkillsPage skills={view === 'skills-empty' ? [] : skills} catalog={view === 'skills-empty' ? [] : catalog} editable={view !== 'skills-locked'} />
	{:else if view === 'availability'}
		<AvailabilityPage form={form({ availableDays: [1, 2, 3], blockedDates: [] })} bookedDates={[]} today="2026-11-04" loaded={true} />
	{:else}
		<SupportPage tickets={view === 'support-empty' ? [] : tickets} />
	{/if}
</AppShell>
