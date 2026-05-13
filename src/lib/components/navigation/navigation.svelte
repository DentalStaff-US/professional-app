<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import {
		UserRound,
		LogOut,
		Menu,
		Home,
		CalendarSearch,
		Briefcase,
		CalendarClock,
		MessageCircle,
		Cog,
		ChevronRight,
		Building
	} from 'lucide-svelte';
	import { APP_NAME } from '$lib/config/constants';
	import Logo from '$lib/components/logo/logo.svelte';
	import { goto, afterNavigate } from '$app/navigation';
	import convertNameToInitials from '$lib/_helpers/convertNameToInitials';
	import {
		Drawer,
		CloseButton,
		Sidebar,
		SidebarGroup,
		SidebarItem,
		SidebarWrapper
	} from 'flowbite-svelte';
	import { sineIn } from 'svelte/easing';
	import { page } from '$app/stores';

	export let user: any;
	let hidden = true;
	let mobileMenuOpen = false;
	let transitionParams = {
		x: -400,
		duration: 200,
		easing: sineIn
	};
	$: activeUrl = $page.url.pathname;

	// Close the dropdown + drawer after every navigation. The DropdownMenu is
	// portal'd to body so it survives the layout re-render — without this it
	// lingers visibly over the new page.
	afterNavigate(() => {
		mobileMenuOpen = false;
		hidden = true;
	});

	function signOut() {
		// Create a form element
		var form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/sign-out';
		document.body.appendChild(form);
		form.submit();
	}

	let initials: string = '';
	$: {
		if (user) {
			initials = convertNameToInitials(user.firstName, user.lastName);
		}
	}
</script>

<header class="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
	<div class="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
		<div class="flex gap-6 md:gap-10">
			<a class="flex items-center space-x-2" href="/"><Logo /></a>
			<nav class="md:flex gap-6 hidden">
				{#if user}
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/dashboard"
						class:active={'/dashboard' === activeUrl}>Dashboard</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/calendar"
						class:active={'/calendar' === activeUrl}>Calendar</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/my-shifts"
						class:active={'/my-shifts' === activeUrl}>My Shifts</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/permanent"
						class:active={'/permanent' === activeUrl}>Permanent</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/timesheets"
						class:active={activeUrl.includes('/timesheets')}>Timesheets</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/inbox"
						class:active={activeUrl.includes('/inbox')}>Inbox</a
					>
				{:else}
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/#professional-members">For Professionals</a
					>
					<a class="flex items-center text-sm font-medium text-blue-800" href="/#business-members"
						>For Businesses</a
					>
					<a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/#contact-us"
						class:active={activeUrl.includes('/#contact-us')}>Contact Us</a
					>
					<!-- <a
						class="flex items-center text-sm font-medium text-blue-800"
						href="/about-us"
						class:active={activeUrl.includes('/about-us')}>About Us</a
					> -->
				{/if}
			</nav>
		</div>
		<div class="flex flex-1 items-center justify-end space-x-4">
			<nav class="md:flex items-center space-x-1 hidden">
				{#if !user}
					<Button
						class="bg-blue-800 hover:bg-blue-900"
						on:click={() => goto('/auth/role-check?action=sign-up')}>Get Started</Button
					>
					<Button
						variant="outline"
						class="text-blue-800"
						on:click={() => goto('/auth/role-check?action=sign-in')}>Sign in</Button
					>
				{:else}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild let:builder>
							<Button variant="ghost" builders={[builder]} class="relative h-8 w-8 rounded-full">
								<Avatar.Root class="h-8 w-8">
									<Avatar.Image src={user.avatarUrl} />
									<Avatar.Fallback>{initials}</Avatar.Fallback>
								</Avatar.Root>
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-56" align="end">
							<DropdownMenu.Label class="font-normal">
								<div class="flex flex-col space-y-1">
									<p class="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
									<p class="text-xs leading-none text-muted-foreground">{user?.email}</p>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item on:click={() => goto('/settings')}>
								<Cog class="mr-2 h-4 w-4" />
								Settings
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item on:click={signOut}>
								<LogOut class="mr-2 h-4 w-4" />
								Sign out
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</nav>
			<nav class="md:hidden flex items-center space-x-1">
				<Button variant="ghost" size="icon" on:click={() => (hidden = false)}>
					<Menu class="h-[1.2rem] w-[1.2rem] text-blue-800" />
				</Button>
				<Drawer
					class="bg-white -left-4 flex flex-col w-full max-w-[400px]"
					transitionType="fly"
					{transitionParams}
					bind:hidden
					id="sidebar"
				>
					<div class="flex items-center">
						<CloseButton on:click={() => (hidden = true)} class="mb-4 text-blue-800" />
					</div>
					<Sidebar
						{activeUrl}
						activeClass="flex items-center p-2 text-base font-normal text-blue-900 bg-gray-200 rounded-lg"
						nonActiveClass="flex items-center p-2 text-base font-normal text-blue-800 bg-white rounded-lg"
					>
						<SidebarWrapper class="bg-white flex flex-col gap-2 items-stretch">
							{#if user}
								<SidebarGroup class="flex-1">
									<SidebarItem on:click={() => (hidden = true)} label="Dashboard" href="/dashboard">
										<svelte:fragment slot="icon">
											<Home class="w-6 h-6  transition duration-75 " />
										</svelte:fragment>
									</SidebarItem>
									<SidebarItem on:click={() => (hidden = true)} label="Calendar" href="/calendar">
										<svelte:fragment slot="icon">
											<CalendarSearch
												class="w-6 h-6 text-blue-800 transition duration-75 group-hover:text-gray-900"
											/>
										</svelte:fragment>
									</SidebarItem>
									<SidebarItem on:click={() => (hidden = true)} label="My Shifts" href="/my-shifts">
										<svelte:fragment slot="icon">
											<Building
												class="w-6 h-6 text-blue-800 transition duration-75 group-hover:text-gray-900"
											/>
										</svelte:fragment>
									</SidebarItem>
									<SidebarItem
										on:click={() => (hidden = true)}
										label="Job Listings"
										href="/permanent"
									>
										<svelte:fragment slot="icon">
											<Briefcase
												class="w-6 h-6 text-blue-800 transition duration-75 group-hover:text-gray-900"
											/>
										</svelte:fragment>
									</SidebarItem>
									<SidebarItem
										on:click={() => (hidden = true)}
										label="Timesheets"
										href="/timesheets"
									>
										<svelte:fragment slot="icon">
											<CalendarClock
												class="w-6 h-6 text-blue-800 transition duration-75 group-hover:text-gray-900"
											/>
										</svelte:fragment>
									</SidebarItem>
									<SidebarItem on:click={() => (hidden = true)} label="Inbox" href="/inbox">
										<svelte:fragment slot="icon">
											<MessageCircle
												class="w-6 h-6 text-blue-800 transition duration-75 group-hover:text-gray-900"
											/>
										</svelte:fragment>
									</SidebarItem>
								</SidebarGroup>
							{:else}
								<SidebarGroup class="flex-1">
									<SidebarItem
										on:click={() => (hidden = true)}
										label="For Professionals"
										href="/#professional-members"
									></SidebarItem>
									<SidebarItem
										on:click={() => (hidden = true)}
										label="For Businesses"
										href="/#business-members"
									></SidebarItem>
									<SidebarItem
										on:click={() => (hidden = true)}
										label="Contact Us"
										href="/#contact-us"
									></SidebarItem>
									<!-- <SidebarItem on:click={() => (hidden = true)} label="About Us" href="/about-us"
									></SidebarItem> -->
									<div class="flex flex-col gap-4 w-full">
										<Button
											class="bg-blue-800 hover:bg-blue-900"
											on:click={() => goto('/auth/role-check?action=sign-up')}>Get Started</Button
										>
										<Button
											variant="outline"
											class="text-blue-800"
											on:click={() => goto('/auth/role-check?action=sign-up')}>Sign in</Button
										>
									</div>
								</SidebarGroup>
							{/if}
						</SidebarWrapper>
					</Sidebar>
					{#if user}
						<DropdownMenu.Root bind:open={mobileMenuOpen} portal={null}>
							<DropdownMenu.Trigger asChild let:builder>
								<Button
									variant="ghost"
									builders={[builder]}
									class="mt-auto h-auto w-full justify-start gap-4 rounded-lg p-2 text-left hover:bg-gray-100"
								>
									<Avatar.Root class="h-12 w-12">
										<Avatar.Image src={user.avatarUrl} />
										<Avatar.Fallback>{initials}</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium leading-none truncate text-blue-900">
											{user?.firstName}
											{user?.lastName}
										</p>
										<p class="text-xs leading-none text-gray-600 mt-1 truncate">{user?.email}</p>
									</div>
									<ChevronRight class="text-blue-800 shrink-0" size={20} />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56" align="end" side="top">
								<DropdownMenu.Item
									on:click={() => {
										mobileMenuOpen = false;
										hidden = true;
										goto('/settings');
									}}
								>
									<Cog class="mr-2 h-4 w-4" />
									Settings
								</DropdownMenu.Item>
								<DropdownMenu.Separator />
								<DropdownMenu.Item
									on:click={() => {
										mobileMenuOpen = false;
										hidden = true;
										signOut();
									}}
								>
									<LogOut class="mr-2 h-4 w-4" />
									Sign out
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</Drawer>
			</nav>
		</div>
	</div>
</header>

<style>
	.active {
		@apply text-yellow-300;
	}
</style>
