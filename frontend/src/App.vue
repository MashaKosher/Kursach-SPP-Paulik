<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter, RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "./stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const nextAfterLogin = computed(() => (typeof route.fullPath === "string" ? route.fullPath : "/"));

function onUnauthorized(e: Event) {
  const detail = (e as CustomEvent)?.detail as { next?: string } | undefined;
  const next = detail?.next || route.fullPath || "/";
  // Prevent loops on auth pages
  if (route.name === "login" || route.name === "register") return;
  void auth.logout();
  void router.replace({ name: "login", query: { next } });
}

onMounted(() => {
  window.addEventListener("auth:unauthorized", onUnauthorized as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener("auth:unauthorized", onUnauthorized as EventListener);
});
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="font-semibold tracking-tight">VisitCard</RouterLink>

        <nav class="flex items-center gap-4 text-sm">
          <RouterLink to="/catalog" class="hover:underline">Каталог</RouterLink>
          <RouterLink to="/news" class="hover:underline">Новости</RouterLink>
          <RouterLink v-if="auth.isAuthed" to="/admin/products" class="hover:underline">Админ</RouterLink>
        </nav>

        <div class="flex items-center gap-3 text-sm">
          <div v-if="auth.user" class="hidden sm:block text-slate-600">
            {{ auth.user.email }}
          </div>
          <template v-if="!auth.isAuthed">
            <RouterLink to="/register" class="rounded-md border px-3 py-1.5 hover:bg-slate-50">
              Регистрация
            </RouterLink>
            <RouterLink
              :to="{ name: 'login', query: { next: nextAfterLogin } }"
              class="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
            >
              Войти
            </RouterLink>
          </template>
          <button
            v-else
            class="rounded-md border px-3 py-1.5 hover:bg-slate-50"
            @click="auth.logout()"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <footer class="border-t bg-white">
      <div class="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
        © {{ new Date().getFullYear() }} VisitCard — каталог и новости
      </div>
    </footer>
  </div>
</template>
