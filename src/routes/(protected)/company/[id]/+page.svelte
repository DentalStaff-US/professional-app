<script lang="ts">
	import { CompanyPage } from '$features/shifts';

	let { data } = $props();
</script>

<CompanyPage company={data.company} requisitions={data.requisitions} />
