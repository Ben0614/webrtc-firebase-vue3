<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
const goToPage = (name: string) => {
  router.push({ name });
};
</script>

<template>
  <!-- <h2 class="menu" @click="goToPage('constraints')">
    Constraints - 獲取用戶權限同意
  </h2>
  <h2 class="menu" @click="goToPage('RTCDataChannel')">
    RTCDataChannel - 發送和接收數據
  </h2> -->
  <h2 class="menu" @click="goToPage('videoTelephony-oneVsOne')">
    1vs1 Video-Telephony - 1對1視訊通話
  </h2>
</template>

<style scoped>
.menu {
  margin-bottom: 10px;
  cursor: pointer;
}
</style>
