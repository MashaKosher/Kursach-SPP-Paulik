<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { apiFetch } from "../api/http";
import SafeImage from "../components/SafeImage.vue";

const props = defineProps<{ slug: string }>();

const loading = ref(false);
const error = ref<string | null>(null);
const product = ref<any | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    product.value = await apiFetch(`/products/${props.slug}`);
  } catch (e: any) {
    error.value = e?.message || "Не удалось загрузить товар";
  } finally {
    loading.value = false;
  }
}

watch(() => props.slug, () => void load());
onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div v-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>
    <div v-else-if="loading" class="text-sm text-slate-600">Загрузка...</div>
    <div v-else-if="product" class="grid gap-4 lg:grid-cols-2">
      <div class="space-y-2">
        <div class="aspect-[3/2] w-full overflow-hidden rounded-lg border bg-slate-100">
          <SafeImage
            :src="product.images?.[0]?.url"
            :alt="product.images?.[0]?.alt || product.title"
            class="h-full w-full object-cover"
          />
        </div>
        <div v-if="(product.images?.length || 0) > 1" class="grid grid-cols-4 gap-2">
          <a
            v-for="img in product.images"
            :key="img.id"
            :href="img.url"
            target="_blank"
            class="aspect-square overflow-hidden rounded-md border bg-slate-100"
          >
            <SafeImage :src="img.url" :alt="img.alt || product.title" class="h-full w-full object-cover" />
          </a>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-xs text-slate-500">{{ product.category?.name || "Без категории" }}</div>
        <h1 class="text-2xl font-semibold">{{ product.title }}</h1>
        <div class="text-sm font-medium">{{ String(product.price) }} ₽</div>
        <p class="text-slate-700">{{ product.description || "—" }}</p>
      </div>
    </div>
  </div>
</template>


