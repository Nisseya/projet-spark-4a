<script lang="ts">
	import { Sidebar, SidebarGroup, SidebarItem, SidebarButton, uiHelpers } from 'flowbite-svelte';
	import { ChartOutline, GridSolid, UserSolid } from 'flowbite-svelte-icons';
	import { page } from '$app/state';

	const spanClass = 'flex-1 ms-3 whitespace-nowrap';

	const demoSidebarUi = uiHelpers();
	let isDemoOpen = $state(false);

	let activeUrl = $state(page.url.pathname);

	$effect(() => {
		isDemoOpen = demoSidebarUi.isOpen;
		activeUrl = page.url.pathname;
	});

	let { children } = $props();
</script>

<div class="min-h-screen">
	<!-- Mobile top bar -->
	<div
		class="sticky top-0 z-[60] flex items-center gap-2 border-b bg-white p-2 md:hidden dark:border-gray-800 dark:bg-gray-900"
	>
		<SidebarButton onclick={demoSidebarUi.toggle} />
		<div class="text-sm font-semibold text-gray-900 dark:text-white">Dashboard</div>
	</div>

	<!-- Sidebar (overlay on mobile, fixed column on desktop) -->
	<Sidebar
		{activeUrl}
		backdrop={true}
		isOpen={isDemoOpen}
		closeSidebar={demoSidebarUi.close}
		params={{ x: -50, duration: 120 }}
		position="fixed"
		class="z-50 h-screen w-64"
		classes={{ nonactive: 'p-2', active: 'p-2' }}
	>
		<SidebarGroup>
			<SidebarItem label="Presentation" href="/source/presentation">
				{#snippet icon()}
					<ChartOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>

			<SidebarItem label="Jobs" href="/source/jobs">
				{#snippet icon()}
					<ChartOutline
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>

			<SidebarItem label="Upload" {spanClass} href="/source/upload">
				{#snippet icon()}
					<GridSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
				{#snippet subtext()}
					<span
						class="ms-3 inline-flex items-center justify-center rounded-full bg-gray-200 px-2 text-sm font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300"
						>Pro</span
					>
				{/snippet}
			</SidebarItem>

			<SidebarItem label="Account" href="/source/account">
				{#snippet icon()}
					<UserSolid
						class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					/>
				{/snippet}
			</SidebarItem>
		</SidebarGroup>
	</Sidebar>

	<!-- Content: pushed on desktop, full width on mobile -->
	<main class="min-h-screen bg-gray-50 p-4 md:ml-64 dark:bg-gray-950">
		{@render children()}
	</main>
</div>
