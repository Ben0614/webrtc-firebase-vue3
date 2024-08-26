<script setup lang="ts">
import { ref } from "vue";

interface IConstraints {
  audio: boolean;
  video: boolean;
}

const constraints = ref<IConstraints>({
  audio: true,
  video: true,
});

async function getMedia(constraints: IConstraints) {
  try {
    const stream: MediaStream = await navigator.mediaDevices.getUserMedia(
      constraints
    );
    console.log("MediaStream:", stream);

    // 使用 getTracks() 方法獲取所有軌道
    const tracks = stream.getTracks();
    console.log("tracks", tracks);
  } catch (err) {
    console.log(err);
  }
}

getMedia(constraints.value);
</script>

<template></template>
