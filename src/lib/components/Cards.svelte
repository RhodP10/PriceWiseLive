<script lang="ts">
  import { formatPhp } from '$lib/utils/numberFormat';

  const { item, onView } = $props<{
    item: {
      recipeName: string;
      suggestedPrice: number;
    };
    onView: () => void;
  }>();
</script>

<div class="bg-white shadow-lg rounded-lg p-5">

  <h1 class="font-bold text-lg">
    {item.recipeName}
  </h1>

  <p class="text-xl font-bold mt-2">
    {formatPhp(item.suggestedPrice)}
  </p>

  <button
    class="mt-3 w-full bg-black text-white py-2 rounded"
    onclick={onView}
  >
    See Details
  </button>

</div>