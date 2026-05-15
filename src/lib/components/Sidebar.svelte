<script lang="ts">
  import { page } from '$app/stores';

  const {
    menuItems,
    logo,
    expandedLogo,
  } = $props<{
    menuItems: any[];
    logo: string;
    expandedLogo: string;
  }>();

  let sidebarWidth = $state<'w-18' | 'w-[220px]'>('w-18');

  function toggleSidebarWidth() {
    sidebarWidth = sidebarWidth === 'w-18' ? 'w-[220px]' : 'w-18';
  }
</script>

<div class={`flex flex-col h-screen bg-cyan-950 ${sidebarWidth}`}>

  <!-- LOGO -->
  <div class="flex justify-center">
    {#if sidebarWidth === 'w-[220px]'}
      <img src={expandedLogo} class="w-[180px] h-[180px]" />
    {:else}
      <img src={logo} class="w-[40px] h-[40px] mt-4" />
    {/if}
  </div>

  <!-- TOGGLE -->
  <button
    class="text-white p-3 hover:bg-cyan-700"
    on:click={toggleSidebarWidth}
  >
    {sidebarWidth === 'w-[220px]' ? 'Collapse' : '>>'}
  </button>

  <!-- MENU -->
  {#each menuItems as item}
    <a
      href={item.path}
      class="flex items-center gap-2 p-3 w-full text-left hover:bg-cyan-700 text-white
        {$page.url.pathname === item.path ? 'bg-white text-cyan-950 font-bold' : ''}"
    >
      <span>{item.label}</span>
    </a>
  {/each}

  <div class="flex-grow"></div>

</div>