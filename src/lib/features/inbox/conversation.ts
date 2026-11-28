type Conversation = {
	id: string;
	type?: string;
	applicationData?: {
		requisition?: { disciplineName?: string | null } | null;
		company?: { name?: string | null; companyName?: string | null; companyLogo?: string | null; logo?: string | null } | null;
	} | null;
	// A professional–practice thread started from a timesheet (no application).
	practice?: { name?: string | null; logo?: string | null } | null;
	participants?: any[] | null;
	lastMessage?: { body?: string | null; createdAt?: string | Date | null } | null;
};

const fullName = (person: any) => [person?.firstName, person?.lastName].filter(Boolean).join(' ');

/** The list and thread endpoints shape participants differently, so accept both. */
function otherParticipant(conversation: Conversation, userId: string | undefined) {
	const other = conversation.participants?.find((p) => (p.user?.id ?? p.userId) !== userId);
	return other?.user ?? other;
}

/** Who a conversation is with. A job conversation is named for the job and practice, a practice conversation for the practice. */
export function describeConversation(conversation: Conversation, userId: string | undefined) {
	const application = conversation.applicationData;
	if (application) {
		const company = application.company;
		return {
			title: application.requisition?.disciplineName || 'Job conversation',
			subtitle: company?.companyName ?? company?.name ?? '',
			avatarUrl: company?.companyLogo ?? company?.logo ?? null,
			isOrganization: true
		};
	}
	if (conversation.practice?.name) {
		return {
			title: conversation.practice.name,
			subtitle: 'Practice',
			avatarUrl: conversation.practice.logo ?? null,
			isOrganization: true
		};
	}
	const person = otherParticipant(conversation, userId);
	return {
		title: fullName(person) || 'DTSS team',
		subtitle: '',
		avatarUrl: person?.avatarUrl ?? null,
		isOrganization: false
	};
}

export function initialsOf(title: string): string {
	return title
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0].toUpperCase())
		.join('');
}

export function filterConversations<T extends Conversation>(
	conversations: T[],
	query: string,
	userId: string | undefined
): T[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return conversations;
	return conversations.filter((conversation) => {
		const { title, subtitle } = describeConversation(conversation, userId);
		return [title, subtitle, conversation.lastMessage?.body ?? '']
			.join(' ')
			.toLowerCase()
			.includes(needle);
	});
}

/** Newest activity first; conversations with no messages go last. */
export function sortConversations<T extends Conversation>(conversations: T[]): T[] {
	const at = (c: Conversation) => (c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt).getTime() : 0);
	return [...conversations].sort((a, b) => at(b) - at(a));
}

export function relativeTime(value: string | Date | null | undefined, now: Date = new Date()): string {
	if (!value) return '';
	const date = new Date(value);
	const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
	if (isNaN(minutes)) return '';
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
	if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d ago`;
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
	});
}
