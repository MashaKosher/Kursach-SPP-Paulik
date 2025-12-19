<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { z } from "zod";
import { apiFetch } from "../../api/http";
import { useAuthStore } from "../../stores/auth";
import SafeImage from "../../components/SafeImage.vue";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };

type ProductItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  price: any;
  isActive: boolean;
  createdAt: string;
  category?: Category | null;
  images?: Array<{ id: string; url: string; sortOrder?: number }>;
  tags?: Array<{ tag: Tag }>;
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

const auth = useAuthStore();

const q = ref("");
const isActive = ref<"" | "true" | "false">("");
const sort = ref<"createdAt" | "price" | "title">("createdAt");
const order = ref<"asc" | "desc">("desc");
const page = ref(1);
const pageSize = ref(10);

const listLoading = ref(false);
const listError = ref<string | null>(null);
const data = ref<ListResponse<ProductItem> | null>(null);

const categories = ref<Category[]>([]);
const tags = ref<Tag[]>([]);

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1
);

async function loadLookups() {
  try {
    const cRes = await apiFetch<{ items: Category[] }>("/categories?page=1&pageSize=100&sort=name&order=asc");
    categories.value = cRes.items ?? [];
  } catch {
    categories.value = [];
  }
  try {
    const tRes = await apiFetch<{ items: Tag[] }>("/tags?page=1&pageSize=200&sort=name&order=asc");
    tags.value = tRes.items ?? [];
  } catch {
    tags.value = [];
  }
}

async function loadList() {
  listLoading.value = true;
  listError.value = null;
  try {
    const params = new URLSearchParams();
    if (q.value.trim()) params.set("q", q.value.trim());
    if (isActive.value) params.set("isActive", isActive.value);
    params.set("sort", sort.value);
    params.set("order", order.value);
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));

    data.value = await apiFetch(`/admin/products?${params.toString()}`, { token: auth.token || undefined });
  } catch (e: any) {
    listError.value = e?.message || "Не удалось загрузить список (проверь авторизацию)";
  } finally {
    listLoading.value = false;
  }
}

watch([q, isActive, sort, order, pageSize], () => {
  page.value = 1;
  void loadList();
});
watch(page, () => void loadList());

onMounted(() => {
  void loadLookups();
  void loadList();
});

const formError = ref<string | null>(null);
const saving = ref(false);
const editingId = ref<string | null>(null);

const title = ref("");
const slug = ref("");
const description = ref("");
const price = ref<string>("0");
const active = ref(true);
const categoryId = ref<string>("");
const tagIds = ref<string[]>([]);
const imageUrls = ref<string>("");
const imagePreviewError = ref(false);

const firstImageUrl = computed(() => {
  const u = imageUrls.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return u || null;
});

watch(imageUrls, () => {
  imagePreviewError.value = false;
});

const ProductFormSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  slug: z.string().trim().min(1, "Введите slug").max(250),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().nonnegative("Цена должна быть >= 0"),
  isActive: z.boolean(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  imageUrls: z.array(z.string().url()).optional()
});

function startCreate() {
  editingId.value = null;
  title.value = "";
  slug.value = "";
  description.value = "";
  price.value = "0";
  active.value = true;
  categoryId.value = "";
  tagIds.value = [];
  imageUrls.value = "";
  formError.value = null;
}

function startEdit(p: ProductItem) {
  editingId.value = p.id;
  title.value = p.title;
  slug.value = p.slug;
  description.value = p.description || "";
  price.value = String(p.price ?? "0");
  active.value = !!p.isActive;
  categoryId.value = p.category?.id || "";
  tagIds.value = (p.tags || []).map((x) => x.tag.id);
  imageUrls.value = (p.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => i.url)
    .join("\n");
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

  const urls = imageUrls.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = ProductFormSchema.safeParse({
    title: title.value,
    slug: slug.value,
    description: description.value.trim() ? description.value.trim() : undefined,
    price: price.value,
    isActive: active.value,
    categoryId: categoryId.value || undefined,
    tagIds: tagIds.value.length ? tagIds.value : undefined,
    imageUrls: urls.length ? urls : undefined
  });

  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await apiFetch(`/products/${editingId.value}`, {
        method: "PUT",
        token: auth.token || undefined,
        body: JSON.stringify(parsed.data)
      });
    } else {
      await apiFetch(`/products`, {
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
  if (!confirm("Удалить товар?")) return;
  try {
    await apiFetch(`/products/${id}`, { method: "DELETE", token: auth.token || undefined });
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
          <h1 class="text-xl font-semibold">Админ — товары</h1>
          <p class="text-sm text-slate-600">Полный CRUD доступен только авторизованным.</p>
        </div>
        <button class="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50" @click="startCreate">
          + Товар
        </button>
      </div>

      <div class="flex gap-2 text-sm">
        <RouterLink to="/admin/products" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">
          Товары
        </RouterLink>
        <RouterLink to="/admin/news" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">
          Новости
        </RouterLink>
        <RouterLink to="/admin/users" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">
          Пользователи
        </RouterLink>
      </div>

      <div class="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center">
        <input
          v-model="q"
          class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Поиск..."
        />
        <select
          v-model="isActive"
          class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Все</option>
          <option value="true">Активные</option>
          <option value="false">Скрытые</option>
        </select>
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

      <div v-if="listError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ listError }}
      </div>
      <div v-if="listLoading" class="text-sm text-slate-600">Загрузка...</div>

      <div v-else class="space-y-2">
        <div
          v-for="p in data?.items || []"
          :key="p.id"
          class="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <button class="truncate text-left font-semibold hover:underline" @click="startEdit(p)">
                {{ p.title }}
              </button>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="p.isActive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ p.isActive ? "активен" : "скрыт" }}
              </span>
            </div>
            <div class="mt-1 truncate text-xs text-slate-500">/{{ p.slug }}</div>
            <div class="mt-1 text-sm text-slate-700">{{ String(p.price) }} ₽</div>
            <div class="mt-1 text-xs text-slate-500">{{ p.category?.name || "Без категории" }}</div>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <RouterLink
              :to="{ name: 'product', params: { slug: p.slug } }"
              class="text-xs text-slate-700 hover:underline"
            >
              открыть
            </RouterLink>
            <button class="text-xs text-red-700 hover:underline" @click="remove(p.id)">удалить</button>
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
        <h2 class="text-lg font-semibold">{{ editingId ? "Редактирование" : "Новый товар" }}</h2>
        <p class="text-sm text-slate-600">Можно скрывать товар (isActive=false), чтобы не показывался публично.</p>
      </div>

      <form class="space-y-3 rounded-lg border bg-white p-4" @submit.prevent="save">
        <div class="space-y-1">
          <label class="text-sm font-medium">Название</label>
          <input
            v-model="title"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Slug</label>
          <input
            v-model="slug"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1">
            <label class="text-sm font-medium">Цена</label>
            <input
              v-model="price"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium">Категория</label>
            <select
              v-model="categoryId"
              class="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Без категории</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Описание</label>
          <textarea
            v-model="description"
            rows="5"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          ></textarea>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Теги</label>
          <div v-if="tags.length" class="grid grid-cols-2 gap-2 rounded-md border bg-white p-3 text-sm">
            <label v-for="t in tags" :key="t.id" class="flex items-center gap-2">
              <input v-model="tagIds" type="checkbox" :value="t.id" class="h-4 w-4" />
              <span>{{ t.name }}</span>
            </label>
          </div>
          <div v-else class="text-sm text-slate-600">Теги не загружены.</div>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium">Картинки (URL, по одной в строке)</label>
          <textarea
            v-model="imageUrls"
            rows="3"
            class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="https://placehold.co/600x400"
          ></textarea>
          <div class="text-xs text-slate-500">
            Нужен <b>прямой</b> публичный URL картинки (обычно заканчивается на <b>.jpg/.png</b>). Если сайт блокирует
            hotlink — картинка не отобразится.
          </div>
          <div class="mt-2 flex items-start gap-3">
            <div class="h-20 w-28 overflow-hidden rounded-md border bg-slate-100">
              <SafeImage
                v-if="firstImageUrl"
                :src="firstImageUrl"
                alt="preview"
                class="h-full w-full object-cover"
                @error="imagePreviewError = true"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-xs text-slate-500">preview</div>
            </div>
            <div class="text-xs text-slate-600">
              <div v-if="imagePreviewError" class="text-red-700">
                Ссылка не открывается как картинка (или доступ запрещён).
              </div>
              <div v-else>Предпросмотр первой ссылки.</div>
            </div>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="active" type="checkbox" class="h-4 w-4" />
          Активен (показывать публично)
        </label>

        <div v-if="formError" class="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <button
          type="submit"
          class="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? "Сохраняем..." : editingId ? "Сохранить изменения" : "Создать товар" }}
        </button>
      </form>
    </section>
  </div>
</template>


