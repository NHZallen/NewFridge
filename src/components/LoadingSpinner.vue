<template>
  <div class="loading-container d-flex flex-column align-items-center justify-content-center">
    <div class="spinner-border text-primary mb-3" role="status"></div>
    <p class="text-muted fw-bold">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: '載入中...'
  }
})
</script>

<style scoped>
.loading-container {
  height: 100vh;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 2000;
}
</style>
