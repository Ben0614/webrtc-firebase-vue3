<script setup lang="ts">
import { ref, onMounted } from "vue";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

// 數據通道選項
const dataChannelOptions = ref({
  ordered: false, // 數據通道是否應保證順序
  maxPacketLifeTime: 3000, // 嘗試重新傳輸失敗消息的最長時間

  // ordered：決定了數據是否需要按照順序接收
  // maxPacketLifeTime：嘗試重新傳輸失敗消息的最長時間。如果消息在這個時間內無法傳遞，則視為失敗
  // maxRetransmits：嘗試重新傳輸失敗消息的最大次數，如果傳輸消息超過次數，則視為失敗
  // protocol：允許使用子協定，可以提供額外的信息給應用程式
  // negotiated：如果設置為 true，需要手動在另一端創建一個具有相同 ID 的數據通道，才能連線
  // idnegotiatedtrue：提供 ID ，進行數據交換
});

const peerConnection = new RTCPeerConnection(configuration);
const dataChannel = ref<RTCDataChannel | null>(null);
const messageQueue = ref<any[]>([]);

// 處理 ICE 候選者
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    // 發送 ICE 候選者到遠端（通過您的信令服務器）
    console.log("新的 ICE 候選者:", event.candidate);
  }
};

// 處理連接狀態變化
peerConnection.onconnectionstatechange = (event) => {
  console.log("連接狀態變化:", peerConnection.connectionState);
};

// 創建 Offer
const createOffer = async () => {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    // 發送 offer 到遠端（通過您的信令服務器）
    console.log("Offer 已創建:", offer);
  } catch (error) {
    console.error("創建 Offer 時出錯:", error);
  }
};

// 處理遠端 Answer
const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  } catch (error) {
    console.error("設置遠端描述時出錯:", error);
  }
};

// 創建數據通道
const createDataChannel = () => {
  dataChannel.value = peerConnection.createDataChannel(
    "myDataChannel",
    dataChannelOptions.value
  );

  if (dataChannel.value) {
    setupDataChannelHandlers(dataChannel.value);
  }
};

// 設置數據通道事件處理器
const setupDataChannelHandlers = (channel: RTCDataChannel) => {
  channel.onopen = () => {
    console.log("數據通道已開啟");
    // 發送所有排隊的消息
    while (messageQueue.value.length > 0) {
      const message = messageQueue.value.shift();
      channel.send(message);
      console.log("已發送排隊消息:", message);
    }
  };

  channel.onmessage = (event) => {
    console.log("收到:", event.data);
  };

  channel.onerror = (error) => {
    console.error("數據通道錯誤:", error);
  };

  channel.onclose = () => {
    console.log("數據通道已關閉");
  };
};

// 發送消息
const sendMessage = (message: string) => {
  console.log("dataChannel.value", dataChannel.value);

  if (dataChannel.value && dataChannel.value.readyState === "open") {
    dataChannel.value.send(message);
    console.log("消息已發送:", message);
  } else {
    messageQueue.value.push(message);
    console.log("消息已加入隊列:", message);
  }
};

onMounted(() => {
  createDataChannel();
  createOffer();
});
</script>

<template>
  <div>
    <button @click="sendMessage('測試訊息')">發送訊息</button>
  </div>
</template>
