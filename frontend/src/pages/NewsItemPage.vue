<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { apiFetch } from "../api/http";

const props = defineProps<{ slug: string }>();

const loading = ref(false);
const error = ref<string | null>(null);
const item = ref<any | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    item.value = await apiFetch(`/news/${props.slug}`);
  } catch (e: any) {
    error.value = e?.message || "Не удалось загрузить новость";
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
    <article v-else-if="item" class="prose prose-slate max-w-none">
      <h1>{{ item.title }}</h1>
      <p class="text-sm text-slate-500">
        {{ item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "" }}
      </p>
      <p v-if="item.excerpt">{{ item.excerpt }}</p>
      <p>{{ item.content }}</p>
    </article>
  </div>
</template>


