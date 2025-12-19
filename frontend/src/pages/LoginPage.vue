<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);
const googleReady = ref(false);

const LoginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль")
});

async function onSubmit() {
  error.value = null;
  const parsed = LoginSchema.safeParse({ email: email.value, password: password.value });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return;
  }
  loading.value = true;
  try {
    await auth.login(parsed.data.email, parsed.data.password);
    const next = typeof route.query.next === "string" ? route.query.next : "/admin/products";
    await router.replace(next);
  } catch (e: any) {
    error.value = e?.message || "Не удалось войти";
  } finally {
    loading.value = false;
  }
}

async function onGoogleCredential(idToken: string) {
  error.value = null;
  loading.value = true;
  try {
    await auth.loginWithGoogle(idToken);
    const next = typeof route.query.next === "string" ? route.query.next : "/admin/products";
    await router.replace(next);
  } catch (e: any) {
    error.value = e?.message || "Не удалось войти через Google";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const google = (window as any).google;
  if (!clientId || !google?.accounts?.id) return;

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (resp: any) => {
      if (resp?.credential) void onGoogleCredential(resp.credential);
    }
  });

  google.accounts.id.renderButton(document.getElementById("googleBtn"), {
    theme: "outline",
    size: "large",
    width: 360
  });

  googleReady.value = true;
});
</script>

<template>
  <div class="mx-auto max-w-md space-y-4">
    <h1 class="text-xl font-semibold">Вход</h1>

    <form class="space-y-3 rounded-lg border bg-white p-4" @submit.prevent="onSubmit">
      <div class="space-y-1">
        <label class="text-sm font-medium">Email</label>
        <input
          v-model="email"
          type="email"
          class="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="admin@example.com"
          autocomplete="email"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">Пароль</label>
        <input
          v-model="password"
          type="password"
          class="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="admin12345"
          autocomplete="current-password"
        />
      </div>

      <div v-if="error" class="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
        {{ error }}
      </div>

      <button
        type="submit"
        class="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? "Входим..." : "Войти" }}
      </button>

      <div class="pt-2">
        <div v-if="!googleReady" class="text-xs text-slate-500">
          Google-вход появится после установки <span class="font-mono">VITE_GOOGLE_CLIENT_ID</span>.
        </div>
        <div id="googleBtn" class="flex justify-center"></div>
      </div>
    </form>

    <p class="text-xs text-slate-500">
      Демо: <span class="font-mono">admin@example.com</span> / <span class="font-mono">admin12345</span>
    </p>
  </div>
</template>


