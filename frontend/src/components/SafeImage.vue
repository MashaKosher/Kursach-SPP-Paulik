<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    class?: string;
  }>(),
  { src: null, alt: "" }
);

const emit = defineEmits<{ (e: "error"): void }>();

const FALLBACK =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <rect width="100%" height="100%" fill="#e2e8f0"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="24" fill="#64748b">
        No image
      </text>
    </svg>`
  );

const currentSrc = ref<string>(props.src || FALLBACK);
const hadError = ref(false);

watch(
  () => props.src,
  (s) => {
    hadError.value = false;
    currentSrc.value = s || FALLBACK;
  }
);

function onError() {
  if (hadError.value) return;
  hadError.value = true;
  currentSrc.value = FALLBACK;
  emit("error");
}

const imgAlt = computed(() => props.alt || "");
</script>

<template>
  <img :src="currentSrc" :alt="imgAlt" :class="props.class" @error="onError" />
</template>


