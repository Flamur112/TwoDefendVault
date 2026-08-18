<script setup lang="ts">
import { confettiPieceStyle } from '~/utils/login-delight'

const props = defineProps<{
  userSeed: string
}>()

const pieceCount = 16
</script>

<template>
  <div class="confetti-layer" aria-hidden="true">
    <span
      v-for="index in pieceCount"
      :key="index"
      class="confetti-piece"
      :style="confettiPieceStyle(index, userSeed)"
    />
  </div>
</template>

<style scoped>
.confetti-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1200;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -10px;
  border-radius: 1px;
  opacity: 0;
  animation-name: confetti-fall;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes confetti-fall {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg);
    opacity: 0;
  }

  12% {
    opacity: 0.55;
  }

  100% {
    transform: translate3d(0, 42vh, 0) rotate(540deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .confetti-layer {
    display: none;
  }
}
</style>
