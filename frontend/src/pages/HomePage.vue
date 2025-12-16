<script setup lang="ts"></script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Сайт-визитка</h1>
    <p class="text-slate-700">
      Добро пожаловать! Здесь есть каталог услуг/товаров и лента новостей.
    </p>
    <div class="flex gap-3">
      <RouterLink
        to="/catalog"
        class="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
      >
        Перейти в каталог
      </RouterLink>
      <RouterLink to="/news" class="rounded-md border px-4 py-2 hover:bg-slate-50">
        Читать новости
      </RouterLink>
    </div>
  </div>
</template>


