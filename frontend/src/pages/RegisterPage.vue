<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { z } from "zod";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(100).optional(),
  email: z.string().email("Некорректный email").toLowerCase(),
  password: z.string().min(8, "Минимум 8 символов").max(72)
});

async function onSubmit() {
  error.value = null;
  const parsed = RegisterSchema.safeParse({
    name: name.value.trim() ? name.value.trim() : undefined,
    email: email.value,
    password: password.value
  });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Ошибка валидации";
    return;
  }

  loading.value = true;
  try {
    await auth.register(parsed.data.email, parsed.data.password, parsed.data.name);
    await router.replace("/admin/products");
  } catch (e: any) {
    error.value = e?.message || "Не удалось зарегистрироваться";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-4">
    <h1 class="text-xl font-semibold">Регистрация</h1>

    <form class="space-y-3 rounded-lg border bg-white p-4" @submit.prevent="onSubmit">
      <div class="space-y-1">
        <label class="text-sm font-medium">Имя</label>
        <input
          v-model="name"
          type="text"
          class="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Иван"
          autocomplete="name"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">Email</label>
        <input
          v-model="email"
          type="email"
          class="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="you@example.com"
          autocomplete="email"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium">Пароль</label>
        <input
          v-model="password"
          type="password"
          class="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="минимум 8 символов"
          autocomplete="new-password"
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
        {{ loading ? "Создаём..." : "Создать аккаунт" }}
      </button>
    </form>

    <RouterLink to="/login" class="text-sm text-slate-700 hover:underline">
      Уже есть аккаунт? Войти
    </RouterLink>
  </div>
</template>


