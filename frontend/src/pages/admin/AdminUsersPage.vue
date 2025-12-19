<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { apiFetch } from "../../api/http";
import { useAuthStore } from "../../stores/auth";

type UserRow = {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
};

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number };

const auth = useAuthStore();

const q = ref("");
const isActive = ref<"" | "true" | "false">("");
const page = ref(1);
const pageSize = ref(10);

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<ListResponse<UserRow> | null>(null);

const totalPages = computed(() =>
  data.value ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize)) : 1
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const params = new URLSearchParams();
    if (q.value.trim()) params.set("q", q.value.trim());
    if (isActive.value) params.set("isActive", isActive.value);
    params.set("sort", "createdAt");
    params.set("order", "desc");
    params.set("page", String(page.value));
    params.set("pageSize", String(pageSize.value));

    data.value = await apiFetch(`/admin/users?${params.toString()}`, { token: auth.token || undefined });
  } catch (e: any) {
    error.value = e?.message || "Не удалось загрузить пользователей";
  } finally {
    loading.value = false;
  }
}

watch([q, isActive, pageSize], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());
onMounted(() => void load());

async function toggleActive(u: UserRow) {
  await apiFetch(`/admin/users/${u.id}`, {
    method: "PUT",
    token: auth.token || undefined,
    body: JSON.stringify({ isActive: !u.isActive })
  });
  await load();
}

async function toggleAdmin(u: UserRow) {
  const nextRoles = u.roles.includes("admin")
    ? u.roles.filter((r) => r !== "admin")
    : Array.from(new Set([...u.roles, "admin"]));

  await apiFetch(`/admin/users/${u.id}/roles`, {
    method: "PUT",
    token: auth.token || undefined,
    body: JSON.stringify({ roles: nextRoles })
  });
  await load();
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-end justify-between">
      <div>
        <h1 class="text-xl font-semibold">Админ — пользователи</h1>
        <p class="text-sm text-slate-600">Только админ может сделать другого админом и блокировать аккаунты.</p>
      </div>
      <div class="flex gap-2 text-sm">
        <RouterLink to="/admin/products" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">Товары</RouterLink>
        <RouterLink to="/admin/news" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">Новости</RouterLink>
        <RouterLink to="/admin/users" class="rounded-md border bg-white px-3 py-1.5 hover:bg-slate-50">Пользователи</RouterLink>
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-lg border bg-white p-3 sm:flex-row sm:items-center">
      <input
        v-model="q"
        class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Поиск по email/имени..."
      />
      <select
        v-model="isActive"
        class="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
      >
        <option value="">Все</option>
        <option value="true">Активные</option>
        <option value="false">Заблокированные</option>
      </select>
    </div>

    <div v-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
    </div>
    <div v-if="loading" class="text-sm text-slate-600">Загрузка...</div>

    <div v-else class="space-y-2">
      <div
        v-for="u in data?.items || []"
        :key="u.id"
        class="flex items-center justify-between gap-3 rounded-lg border bg-white p-3"
      >
        <div class="min-w-0">
          <div class="truncate font-semibold">{{ u.email }}</div>
          <div class="truncate text-xs text-slate-500">{{ u.name || "—" }}</div>
          <div class="mt-1 flex flex-wrap gap-1 text-xs">
            <span
              v-for="r in u.roles"
              :key="r"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700"
            >
              {{ r }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 text-sm">
          <button
            class="rounded-md border px-3 py-1.5 hover:bg-slate-50"
            @click="toggleAdmin(u)"
          >
            {{ u.roles.includes("admin") ? "Снять admin" : "Сделать admin" }}
          </button>
          <button
            class="rounded-md border px-3 py-1.5 hover:bg-slate-50"
            :class="u.isActive ? '' : 'border-red-200 bg-red-50 text-red-700'"
            @click="toggleActive(u)"
          >
            {{ u.isActive ? "Заблокировать" : "Разблокировать" }}
          </button>
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
  </div>
</template>


