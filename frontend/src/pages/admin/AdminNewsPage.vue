<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { z } from "zod";
import { apiFetch } from "../../api/http";
import { useAuthStore } from "../../stores/auth";

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

const auth = useAuthStore();

const q = ref("");
const isPublished = ref<"" | "true" | "false">("");
const sort = ref<"createdAt" | "publishedAt" | "title">("createdAt");
const order = ref<"asc" | "desc">("desc");
const page = ref(1);
const pageSize = ref(10);

const listLoading = ref(false);
const listError = ref<string | null>(null);
const data = ref<ListResponse<NewsItem> | null>(null);

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1
);

async function loadList() {
  listLoading.value = true;
  listError.value = null;
  try {
    const params = new URLSearchParams();
    if (q.value.trim()) params.set("q", q.value.trim());
    if (isPublished.value) params.set("isPublished", isPublished.value);
    params.set("sort", sort.value);
    params.set("order", order.value);
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));

    data.value = await apiFetch(`/admin/news?${params.toString()}`, { token: auth.token || undefined });
  } catch (e: any) {
    listError.value = e?.message || "Не удалось загрузить список (проверь авторизацию)";
  } finally {
    listLoading.value = false;
  }
}

watch([q, isPublished, sort, order, pageSize], () => {
  page.value = 1;
  void loadList();
});
watch(page, () => void loadList());
onMounted(() => void loadList());

const formError = ref<string | null>(null);
const saving = ref(false);
const editingId = ref<string | null>(null);

const title = ref("");
const slug = ref("");
const excerpt = ref("");
const content = ref("");
const publish = ref(false);

const NewsFormSchema = z.object({
  title: z.string().trim().min(1, "Введите заголовок").max(250),
  slug: z.string().trim().min(1, "Введите slug").max(250),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1, "Введите текст"),
  isPublished: z.boolean()
});

function startCreate() {
  editingId.value = null;
  title.value = "";
  slug.value = "";
  excerpt.value = "";
  content.value = "";
  publish.value = false;
  formError.value = null;
}

function startEdit(n: NewsItem) {
  editingId.value = n.id;
  title.value = n.title;
  slug.value = n.slug;
  excerpt.value = n.excerpt || "";
  content.value = n.content || "";
  publish.value = n.isPublished;
  formError.value = null;
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

watch(title, (t) => {
  if (!editingId.value && !slug.value.trim() && t.trim().length >= 3) {
    slug.value = slugify(t);
  }
});

async function save() {
  formError.value = null;
  const parsed = NewsFormSchema.safeParse({
    title: title.value,
    slug: slug.value,
    excerpt: excerpt.value.trim() ? excerpt.value.trim() : undefined,
    content: content.value,
    isPublished: publish.value
  });
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await apiFetch(`/news/${editingId.value}`, {
        method: "PUT",
        token: auth.token || undefined,
        body: JSON.stringify(parsed.data)
      });
    } else {
      await apiFetch(`/news`, {
        method: "POST",
        token: auth.token || undefined,
        body: JSON.stringify(parsed.data)
      });
    }
    startCreate();
    await loadList();
  } catch (e: any) {
    formError.value = e?.message || "Не удалось сохранить";
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm("Удалить новость?")) return;
  try {
    await apiFetch(`/news/${id}`, { method: "DELETE", token: auth.token || undefined });
    await loadList();
    if (editingId.value === id) startCreate();
  } catch (e: any) {
    alert(e?.message || "Не удалось удалить");
  }
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <section class="space-y-3">
      <div class="flex items-end justify-between">
        <div>
          <h1 class="text-xl font-semibold">Админ — новости</h1>
          <p class="text-sm text-slate-600">Создание/редактирование доступно только авторизованным.</p>
        </div>
        <button class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" @click="startCreate">
          + Новость
        </button>
      </div>

      <div class="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center">
        <input
          v-model="q"
          class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Поиск..."
        />
        <select
          v-model="isPublished"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Все</option>
          <option value="true">Опубликованные</option>
          <option value="false">Черновики</option>
        </select>
        <select
          v-model="sort"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="createdAt">Созданы</option>
          <option value="publishedAt">Опубликованы</option>
          <option value="title">Заголовок</option>
        </select>
        <select
          v-model="order"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
      </div>

      <div v-if="listError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ listError }}
      </div>
      <div v-if="listLoading" class="text-sm text-slate-600">Загрузка...</div>

      <div v-else class="space-y-2">
        <div
          v-for="n in data?.items || []"
          :key="n.id"
          class="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <button class="truncate text-left font-semibold hover:underline" @click="startEdit(n)">
                {{ n.title }}
              </button>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="n.isPublished ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ n.isPublished ? "опублик." : "черновик" }}
              </span>
            </div>
            <div class="mt-1 truncate text-xs text-slate-500">/{{ n.slug }}</div>
            <div class="mt-1 line-clamp-2 text-sm text-slate-700">{{ n.excerpt || "—" }}</div>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <RouterLink
              v-if="n.isPublished"
              :to="{ name: 'newsItem', params: { slug: n.slug } }"
              class="text-xs text-slate-700 hover:underline"
            >
              открыть
            </RouterLink>
            <button class="text-xs text-red-700 hover:underline" @click="remove(n.id)">удалить</button>
          </div>
        </div>
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
    </section>

    <section class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold">{{ editingId ? "Редактирование" : "Новая новость" }}</h2>
        <p class="text-sm text-slate-600">После публикации новость появится в разделе Новости и в блоке в Каталоге.</p>
      </div>

      <form class="space-y-3 rounded-lg border bg-white p-4" @submit.prevent="save">
        <div class="space-y-1">
          <label class="text-sm font-medium">Заголовок</label>
          <input
            v-model="title"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Например: Скидки на услуги!"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Slug</label>
          <input
            v-model="slug"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="skidki-na-uslugi"
          />
          <div class="text-xs text-slate-500">Должен быть уникальным.</div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Коротко (excerpt)</label>
          <textarea
            v-model="excerpt"
            rows="2"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Текст</label>
          <textarea
            v-model="content"
            rows="8"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="publish" type="checkbox" class="h-4 w-4" />
          Опубликовать
        </label>

        <div v-if="formError" class="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? "Сохраняем..." : editingId ? "Сохранить изменения" : "Создать новость" }}
        </button>
      </form>
    </section>
  </div>
</template>


