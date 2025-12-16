<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { apiFetch } from "../api/http";
import SafeImage from "../components/SafeImage.vue";

type Product = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  price: any;
  category?: { id: string; name: string; slug: string } | null;
  images?: Array<{ id: string; url: string; alt?: string | null }>;
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

type News = { id: string; title: string; slug: string; publishedAt?: string | null };

const q = ref("");
const sort = ref<"createdAt" | "price" | "title">("createdAt");
const order = ref<"asc" | "desc">("desc");
const page = ref(1);
const pageSize = ref(10);

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<ListResponse<Product> | null>(null);
const latestNews = ref<News[]>([]);

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
    data.value = await apiFetch(`/products?${params.toString()}`);
  } catch (e: any) {
    error.value = e?.message || "Не удалось загрузить каталог (проверь, что backend запущен)";
  } finally {
    loading.value = false;
  }
}

async function loadNews() {
  try {
    const res = await apiFetch<{ items: News[] }>("/news?sort=publishedAt&order=desc&page=1&pageSize=3");
    latestNews.value = res.items ?? [];
  } catch {
    latestNews.value = [];
  }
}

watch([q, sort, order, pageSize], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());

onMounted(() => void load());
onMounted(() => void loadNews());
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold">Каталог</h1>
        <p class="text-sm text-slate-600">Поиск/сортировка работают без авторизации.</p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="q"
          class="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 sm:w-72"
          placeholder="Поиск по названию/описанию..."
        />
        <select
          v-model="sort"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="createdAt">Новые</option>
          <option value="price">Цена</option>
          <option value="title">Название</option>
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

    <div v-if="latestNews.length" class="rounded-lg border bg-white p-4">
      <div class="mb-2 text-sm font-semibold">Последние новости</div>
      <div class="space-y-1">
        <RouterLink
          v-for="n in latestNews"
          :key="n.id"
          :to="{ name: 'newsItem', params: { slug: n.slug } }"
          class="block text-sm text-slate-800 hover:underline"
        >
          {{ n.title }}
        </RouterLink>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="p in data?.items || []"
        :key="p.id"
        :to="{ name: 'product', params: { slug: p.slug } }"
        class="group overflow-hidden rounded-lg border bg-white hover:shadow-sm"
      >
        <div class="aspect-[3/2] w-full bg-slate-100">
          <SafeImage
            :src="p.images?.[0]?.url"
            :alt="p.images?.[0]?.alt || p.title"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-4">
          <div class="text-xs text-slate-500">{{ p.category?.name || 'Без категории' }}</div>
          <div class="mt-1 font-semibold group-hover:underline">{{ p.title }}</div>
          <div class="mt-2 line-clamp-3 text-sm text-slate-700">
            {{ p.description || "—" }}
          </div>
          <div class="mt-3 text-sm font-medium">
            {{ String(p.price) }} ₽
          </div>
        </div>
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


