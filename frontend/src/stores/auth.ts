import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { z } from "zod";
import { apiFetch } from "../api/http";

const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  roles: z.array(z.string())
});

type AuthUser = z.infer<typeof AuthUserSchema>;

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<AuthUser | null>(token.value ? safeLoadUser() : null);

  // Treat expired JWT as not authenticated (so guards/menus react instantly).
  const isAuthed = computed(() => !!token.value && !isJwtExpired(token.value!));

  // If app reloads with an expired token in localStorage, clear it.
  if (token.value && isJwtExpired(token.value)) {
    token.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function register(email: string, password: string, name?: string) {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    });
    token.value = res.token;
    user.value = AuthUserSchema.parse(res.user);
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(user.value));
  }

  async function login(email: string, password: string) {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    token.value = res.token;
    user.value = AuthUserSchema.parse(res.user);
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify(user.value));
  }

  async function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async function refreshMe() {
    if (!token.value) return;
    const me = await apiFetch<AuthUser>("/auth/me", { token: token.value });
    user.value = AuthUserSchema.parse(me);
    localStorage.setItem("user", JSON.stringify(user.value));
  }

  return { token, user, isAuthed, register, login, logout, refreshMe };
});

function isJwtExpired(token: string) {
  const exp = getJwtExpMs(token);
  if (!exp) return false; // can't parse -> let backend decide
  return Date.now() >= exp;
}

function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    if (typeof payload?.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const decoded = atob(base64);
  // handle unicode
  return decodeURIComponent(
    Array.from(decoded, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
}

function safeLoadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return AuthUserSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}


