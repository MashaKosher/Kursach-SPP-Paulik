<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { apiFetch } from "../api/http";

type News = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

const q = ref("");
const sort = ref<"createdAt" | "publishedAt" | "title">("publishedAt");
const order = ref<"asc" | "desc">("desc");
const page = ref(1);
const pageSize = ref(10);

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<ListResponse<News> | null>(null);

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const params = new URLSearchParams();
    if (q.value.trim()) params.set("q", q.value.trim());
    params.set("sort", sort.value);
    params.set("order", order.value);
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));
    data.value = await apiFetch(`/news?${params.toString()}`);
  } catch (e: any) {
    error.value = e?.message || "Не удалось загрузить новости (проверь, что backend запущен)";
  } finally {
    loading.value = false;
  }
}

watch([q, sort, order, pageSize], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());
onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold">Новости</h1>
        <p class="text-sm text-slate-600">Публичный просмотр без авторизации.</p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="q"
          class="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 sm:w-72"
          placeholder="Поиск по новостям..."
        />
        <select
          v-model="sort"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="publishedAt">По дате публикации</option>
          <option value="createdAt">По дате создания</option>
          <option value="title">По названию</option>
        </select>
        <select
          v-model="order"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="text-sm text-slate-600">Загрузка...</div>

    <div v-else class="space-y-3">
      <RouterLink
        v-for="n in data?.items || []"
        :key="n.id"
        :to="{ name: 'newsItem', params: { slug: n.slug } }"
        class="block rounded-lg border bg-white p-4 hover:shadow-sm"
      >
        <div class="text-xs text-slate-500">
          {{ n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : "—" }}
        </div>
        <div class="mt-1 font-semibold hover:underline">{{ n.title }}</div>
        <div class="mt-2 text-sm text-slate-700">{{ n.excerpt || "—" }}</div>
      </RouterLink>
    </div>

    <div v-if="data" class="flex items-center justify-between pt-2">
      <button
        class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="page <= 1"
        @click="page--"
      >
        Назад
      </button>
      <div class="text-sm text-slate-600">Стр. {{ page }} / {{ totalPages }}</div>
      <button
        class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="page >= totalPages"
        @click="page++"
      >
        Вперёд
      </button>
    </div>
  </div>
</template>


