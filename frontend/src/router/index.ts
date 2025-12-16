import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const HomePage = () => import("../pages/HomePage.vue");
const CatalogPage = () => import("../pages/CatalogPage.vue");
const ProductPage = () => import("../pages/ProductPage.vue");
const NewsPage = () => import("../pages/NewsPage.vue");
const NewsItemPage = () => import("../pages/NewsItemPage.vue");
const LoginPage = () => import("../pages/LoginPage.vue");
const RegisterPage = () => import("../pages/RegisterPage.vue");
const AdminProductsPage = () => import("../pages/admin/AdminProductsPage.vue");
const AdminNewsPage = () => import("../pages/admin/AdminNewsPage.vue");

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    { path: "/catalog", name: "catalog", component: CatalogPage },
    { path: "/catalog/:slug", name: "product", component: ProductPage, props: true },
    { path: "/news", name: "news", component: NewsPage },
    { path: "/news/:slug", name: "newsItem", component: NewsItemPage, props: true },
    { path: "/login", name: "login", component: LoginPage },
    { path: "/register", name: "register", component: RegisterPage },
    { path: "/admin/products", name: "adminProducts", component: AdminProductsPage, meta: { requiresAuth: true } },
    { path: "/admin/news", name: "adminNews", component: AdminNewsPage, meta: { requiresAuth: true } }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.isAuthed && !auth.user) {
    // after refresh
    try {
      await auth.refreshMe();
    } catch {
      await auth.logout();
    }
  }
  if (to.meta.requiresAuth && !auth.isAuthed) {
    return { name: "login", query: { next: to.fullPath } };
  }
});


