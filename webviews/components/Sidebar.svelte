<script lang="ts">
    import { onMount } from "svelte";
    import type {User} from '../types'
    import Todos from "./Todos.svelte";
  import Contact from "./Contact.svelte";
  import { Circle3 } from 'svelte-loading-spinners';
    let accessToken = "";
    let loading = true;
    let user: User | null = null;
    let page: "todos" | "contact" = tsvscode.getState()?.page || "todos";

    $: {
        tsvscode.setState({ page });
    }
    onMount(async () => {
        window.addEventListener("message", async (event) => {
            const message = event.data;
            switch (message.type) {
                case "token":
                    accessToken = message.value;
                    const response = await fetch(`${apiBaseUrl}/me`, {
                        headers: {
                            authorization: `Bearer ${accessToken}`,
                        },
                    });
                    const data = await response.json(); 
                    user = data.user;
                    loading = false;
            }
        });

        tsvscode.postMessage({ type: "get-token", value: undefined });
    });
</script>
<style>
    .loader{
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>

{#if loading}
<div class="loader">
    <Circle3 duration="1s" />
</div>
{:else if user}
    {#if page === 'todos'}
        <Todos {user} {accessToken} />
        <button
            on:click={() => {
                page = 'contact';
            }}>How to use?🤔</button>
    {:else}
        <Contact />
        <button
            on:click={() => {
                page = 'todos';
            }}>go back</button>
    {/if}
    <button
        on:click={() => {
            accessToken = '';
            user = null;
            tsvscode.postMessage({ type: 'logout', value: undefined });
        }}>logout</button>
{:else}
    <button
        on:click={() => {
            tsvscode.postMessage({ type: 'authenticate', value: undefined });
        }}>login with GitHub</button>
{/if}