<script>
import {env} from "$env/dynamic/public";
import {page} from "$app/stores";
const action = $page.url.searchParams.get("action")

$: console.log(action)
</script>

<div class="min-h-screen flex items-center justify-center">

    <div class="bg-white p-8 rounded shadow-md w-full max-w-md flex flex-col justify-center items-center">
        <h1 class="text-2xl font-bold mb-4 text-start w-full">Welcome to Dental Temps Staffing Solutions.</h1>
        <p class="text-sm text-gray-500 mb-4 w-full">Please select a role. This will route you to the appropriate application portal.</p>
        <a href={`/auth/${action || 'sign-up'}`} class="text-blue-500 hover:underline flex items-center gap-2 border border-gray-200 rounded-md p-4 mb-4 w-full justify-center">
            <div>
                <p>Professional Member Portal</p>
            </div>
        </a>
        <a href={`${env.PUBLIC_CLIENT_APP_DOMAIN}/auth/${action || 'sign-up'}`} class="text-blue-500 hover:underline flex items-center gap-2 border border-gray-200 rounded-md p-4 w-full justify-center">
            <div>
                <p>Business Member Portal</p>
            </div>
        </a>
    </div>
</div>ß