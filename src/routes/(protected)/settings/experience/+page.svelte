<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import { AlertCircle, DollarSign, X } from 'lucide-svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { PageData } from './$types';
	import { superForm } from 'sveltekit-superforms/client';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import Label from '$lib/components/ui/label/label.svelte';

	export let data: PageData;
	$: profile = data.profile;
	$: disciplines = data.disciplines;
	$: candidateDisciplines = data.candidateDisciplines || [];
	$: experienceLevels = data.experienceLevels;

	const form = superForm(data.form, {
		dataType: 'json'
	});
	const { enhance, form: formData, errors, submitting } = form;

	// Initialize disciplines array if it doesn't exist
	$: if (!$formData.disciplines) {
		$formData.disciplines = [];
	}

	$: if (candidateDisciplines?.length > 0) {
		$formData.disciplines = candidateDisciplines.map(d => ({
			disciplineId: d.disciplineId,
			experienceLevelId: d.experienceLevelId,
			preferredHourlyMin: d.preferredHourlyMin || 0,
			preferredHourlyMax: d.preferredHourlyMax || 0
		}));
	}

	// Search/filter functionality
	let searchTerm = '';
	$: filteredDisciplines = searchTerm
		? disciplines.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
		: disciplines;

	// Temporary form state for adding new discipline
	let selectedDisciplineId = '';
	let selectedExperienceLevelId = experienceLevels?.length > 0 ? experienceLevels[0].id : '';
	let tempMinRate = 0;
	let tempMaxRate = 0;

	// Check if a discipline is already selected
	function isDisciplineSelected(disciplineId: string) {
		return $formData.disciplines.some((d) => d.disciplineId === disciplineId);
	}

	// Add a discipline to the selected list with rates
	function addDisciplineWithRates() {
		if (!selectedDisciplineId) {
			return;
		}

		if (isDisciplineSelected(selectedDisciplineId)) {
			alert('This discipline has already been added');
			return;
		}

		if (tempMaxRate < tempMinRate) {
			alert('Maximum rate must be greater than or equal to minimum rate');
			return;
		}

		$formData.disciplines = [
			...$formData.disciplines,
			{
				disciplineId: selectedDisciplineId,
				experienceLevelId: selectedExperienceLevelId,
				preferredHourlyMin: tempMinRate,
				preferredHourlyMax: tempMaxRate
			}
		];

		// Reset form
		selectedDisciplineId = '';
		selectedExperienceLevelId = experienceLevels.length > 0 ? experienceLevels[0].id : '';
		tempMinRate = 0;
		tempMaxRate = 0;
		searchTerm = '';
	}

	// Remove a discipline from the selected list
	function removeDiscipline(disciplineId: string) {
		$formData.disciplines = $formData.disciplines.filter((d) => d.disciplineId !== disciplineId);
	}

	// Get discipline name by ID
	function getDisciplineName(disciplineId: string) {
		const discipline = disciplines.find((d) => d.id === disciplineId);
		return discipline ? discipline.name : 'Unknown Discipline';
	}

	// Get experience level value by ID
	function getExperienceLevelValue(experienceLevelId: string) {
		const level = experienceLevels.find((l) => l.id === experienceLevelId);
		return level ? level.value : 'Unknown';
	}

	$: sortedExperienceLevels = [...experienceLevels].sort((a, b) => {
		const priorityMap = {
			'0-2 Years': 1,
			'2-5 Years': 2,
			'5-7 Years': 3,
			'7-10 Years': 4,
			'10+ years': 5
		};

		const priorityA = priorityMap[a.value] || 999;
		const priorityB = priorityMap[b.value] || 999;

		return priorityA - priorityB;
	});

	$: console.log(profile)
</script>

<svelte:head>
	<title>Manage Your Experience | DTSS</title>
</svelte:head>

<section class="sm:container mx-auto px-4 py-6 space-y-8">
	<h1 class="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">Work Experience</h1>
{#if profile.status === 'ACTIVE'}
		<Alert.Root class="mb-4">
			<Alert.Title class="text-lg font-semibold">Profile Approved</Alert.Title>
			<Alert.Description>
				Your profile has been approved. You cannot edit your experience at this time.
			</Alert.Description>
		</Alert.Root>

		{#each candidateDisciplines as discipline, index}
			<div class="border rounded-lg p-4 bg-white">
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1 min-w-0">
						<p class="font-medium text-sm text-gray-900 truncate">
							{getDisciplineName(discipline.disciplineId)}
						</p>
						<p class="text-xs text-gray-600 mt-1">
							{getExperienceLevelValue(discipline.experienceLevelId)}
						</p>
					</div>

					<div class="flex items-center gap-3">
						<div class="text-right flex-shrink-0">
							<div class="flex items-center gap-1 text-sm font-medium text-gray-900">
								<DollarSign class="h-4 w-4 text-gray-500"/>
								<span>
									{discipline.preferredHourlyMin} - {discipline.preferredHourlyMax}
								</span>
							</div>
							<p class="text-xs text-gray-500 mt-0.5">/hr</p>
						</div>
					</div>
				</div>
			</div>
		{/each}
{:else}

		<Card.Root class="border-0 sm:border">
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl">Manage your work experience</Card.Title>
				<Card.Description>
					Select the disciplines you have experience in, specify your experience level, and set your preferred hourly rate for each.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form id="experienceForm" action="?/submitExperience" method="POST" use:enhance>
					<div class="grid gap-6">
						{#if $errors._errors?.length}
							<Alert.Root variant="destructive">
								<AlertCircle class="h-4 w-4" />
								<Alert.Title>Error</Alert.Title>
								<Alert.Description>
									{#each $errors._errors as error}
										{error}
									{/each}
								</Alert.Description>
							</Alert.Root>
						{/if}

						<!-- Add Discipline Form -->
						<div class="border rounded-lg p-4 bg-gray-50">
							<h3 class="text-sm font-medium mb-4">Add New Discipline</h3>

							<div class="grid gap-4">
								<!-- Discipline Search/Select -->
								<div>
									<Label for="search">Search & Select Discipline</Label>
									<Input
										id="search"
										type="text"
										placeholder="Search by name..."
										bind:value={searchTerm}
										class="mt-1.5"
									/>

									{#if searchTerm && filteredDisciplines.length > 0}
										<div class="mt-2 border rounded-md bg-white max-h-48 overflow-y-auto">
											{#each filteredDisciplines as discipline}
												<button
													type="button"
													class="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
													class:bg-blue-50={selectedDisciplineId === discipline.id}
													on:click={() => {
														selectedDisciplineId = discipline.id;
														searchTerm = discipline.name;
													}}
													disabled={isDisciplineSelected(discipline.id)}
												>
													{discipline.name}
													{#if isDisciplineSelected(discipline.id)}
														<span class="text-xs text-gray-500 ml-2">(Already added)</span>
													{/if}
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Experience Level -->
								<div>
									<Label>Experience Level</Label>
									<Select.Root
										selected={{ value: selectedExperienceLevelId, label: getExperienceLevelValue(selectedExperienceLevelId) }}
										onSelectedChange={(value) => selectedExperienceLevelId = value?.value || ''}
									>
										<Select.Trigger class="mt-1.5">
											<Select.Value placeholder="Select experience level" />
										</Select.Trigger>
										<Select.Content>
											{#each sortedExperienceLevels as level}
												<Select.Item value={level.id}>{level.value}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>

								<!-- Hourly Rate Range -->
								<div class="grid grid-cols-2 gap-4">
									<div>
										<Label for="minRate">Minimum Rate ($/hr)</Label>
										<div class="relative mt-1.5">
											<DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
											<Input
												id="minRate"
												type="number"
												min="0"
												step="1"
												bind:value={tempMinRate}
												class="pl-9"
												placeholder="0"
											/>
										</div>
									</div>
									<div>
										<Label for="maxRate">Maximum Rate ($/hr)</Label>
										<div class="relative mt-1.5">
											<DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
											<Input
												id="maxRate"
												type="number"
												min="0"
												step="1"
												bind:value={tempMaxRate}
												class="pl-9"
												placeholder="0"
											/>
										</div>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									class="w-full"
									on:click={addDisciplineWithRates}
									disabled={!selectedDisciplineId}
								>
									Add Discipline
								</Button>
							</div>
						</div>

						{#if $errors.disciplines?._errors?.length}
							<Alert.Root variant="destructive">
								<AlertCircle class="h-4 w-4" />
								<Alert.Description>
									{$errors.disciplines._errors[0]}
								</Alert.Description>
							</Alert.Root>
						{/if}

						<!-- Selected Disciplines List -->
						<div>
							<h3 class="text-sm font-medium mb-3">Your Experience ({$formData.disciplines.length})</h3>

							{#if $formData.disciplines.length === 0}
								<div class="border rounded-md p-8 text-center">
									<p class="text-sm text-gray-500">No disciplines added yet</p>
									<p class="text-xs text-gray-400 mt-1">Add your first discipline above to get started</p>
								</div>
							{:else}
								<div class="space-y-3">
									{#each $formData.disciplines as discipline, index}
										<div class="border rounded-lg p-4 bg-white">
											<div class="flex items-start justify-between gap-4">
												<div class="flex-1 min-w-0">
													<p class="font-medium text-sm text-gray-900 truncate">
														{getDisciplineName(discipline.disciplineId)}
													</p>
													<p class="text-xs text-gray-600 mt-1">
														{getExperienceLevelValue(discipline.experienceLevelId)}
													</p>
												</div>

												<div class="flex items-center gap-3">
													<div class="text-right flex-shrink-0">
														<div class="flex items-center gap-1 text-sm font-medium text-gray-900">
															<DollarSign class="h-4 w-4 text-gray-500"/>
															<span>
																{discipline.preferredHourlyMin} - {discipline.preferredHourlyMax}
															</span>
														</div>
														<p class="text-xs text-gray-500 mt-0.5">/hr</p>
													</div>

													<Button
														type="button"
														variant="ghost"
														size="icon"
														class="h-8 w-8 text-gray-400 hover:text-red-600"
														on:click={() => removeDiscipline(discipline.disciplineId)}
													>
														<X class="h-4 w-4" />
														<span class="sr-only">Remove</span>
													</Button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</form>
			</Card.Content>
			<Card.Footer>
				<Button
					type="submit"
					form="experienceForm"
					class="w-full sm:w-fit ml-auto bg-primary hover:bg-primary/90"
					disabled={$formData.disciplines.length === 0 || $submitting}
				>
					{#if $submitting}
						Saving...
					{:else}
						Save Experience
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</section>
