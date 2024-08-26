<script setup lang="ts">
import { ref, onMounted } from "vue";
import { db } from "../../../firebaseConfig";
import {
  doc,
  addDoc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

/*
參考網站 https://ithelp.ithome.com.tw/articles/10317716
*/

const localStream = ref<HTMLVideoElement | null>(null);
const remoteStream = ref<HTMLVideoElement | null>(null);

// 開啟媒體
const openMedia = async () => {
  try {
    // 獲取 local 的 video&audio
    const constraints = { video: true, audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 若有 localStream  則更新至 video srcObject
    if (localStream.value) {
      localStream.value.srcObject = stream;
    }

    // 更新 remoteStream
    if (remoteStream.value) {
      remoteStream.value.srcObject = new MediaStream();
    }

    isDisabledVideoBtn.value = false;
  } catch (err) {
    console.log(err);
    console.log("請確認已開啟視訊及麥克風");
  }
};

const collectIceCandidates = async (
  roomRef: any,
  peerConnection: RTCPeerConnection,
  localName: string,
  remoteName: string
) => {
  // callerCandidates 存儲本地 ICE 候選者
  const candidatesCollection = collection(roomRef, localName);

  try {
    // 當收集到一個本地 ICE 候選者時，將觸發這個事件
    peerConnection.onicecandidate = async (event) => {
      // 如果事件中存在候選者，則將其轉換為 JSON 對象並添加到 candidatesCollection 中
      if (event.candidate) {
        console.log(event);
        await addDoc(candidatesCollection, event.candidate.toJSON());
      }
    };

    // 收集到一個本地 ICE 候選者時錯誤則觸發
    peerConnection.onicecandidateerror = (err: any) => {
      console.log("err", err);
    };

    // 監聽 calleeCandidates 裡的每個 doc
    const remoteCandidatesCollection = collection(roomRef, remoteName);
    onSnapshot(remoteCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          // 對於每個新增的遠程 ICE 候選者，將其轉換為 RTCIceCandidate
          const data = change.doc.data();
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

// RTCPeerConnection的設定
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};
const roomId = ref("");
const displayRoomId = ref("");
const pcCreateRoom = ref<RTCPeerConnection | null>(null);
// 創建房間
const createRoom = async () => {
  // 若沒有媒體則 return
  if (!localStream.value) {
    alert("請先開啟視訊及麥克風");
    return;
  }

  // 創建一個新的 RTCPeerConnection
  pcCreateRoom.value = new RTCPeerConnection(configuration);

  // 創建房間
  const roomRef = await addDoc(collection(db, "rooms"), {});
  roomId.value = roomRef.id;
  displayRoomId.value = roomRef.id;

  collectIceCandidates(
    roomRef,
    pcCreateRoom.value,
    "calleeCandidates",
    "callerCandidates"
  );

  // 將 localStream 中的媒體加入至 pc 中
  if (localStream.value && localStream.value.srcObject) {
    (localStream.value.srcObject as MediaStream)
      .getTracks()
      .forEach((track) => {
        pcCreateRoom.value?.addTrack(
          track,
          localStream.value?.srcObject as MediaStream
        );
      });
  }

  // 從事件中取得 streams
  // 檢查是否已經存在 remoteStream，如果存在，將媒體軌道添加到其中
  pcCreateRoom.value.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      (remoteStream.value?.srcObject as MediaStream).addTrack(track);
    });
  };

  // 1. 建立 offer
  const offer = await pcCreateRoom.value.createOffer();
  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    },
  };

  // 2. offer 設定 setLocalDescription，放在 db 中交換
  await pcCreateRoom.value?.setLocalDescription(offer);
  await setDoc(roomRef, roomWithOffer);

  // 7. 監聽並收到 Answer
  // 8. Answer 設定 RemoteDescription
  onSnapshot(roomRef, async (snapshot) => {
    const data = snapshot.data();

    if (data?.answer && !pcCreateRoom.value?.currentLocalDescription) {
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await pcCreateRoom.value?.setRemoteDescription(rtcSessionDescription);
    }
  });
};

// 加入房間 (輸入roomId就可以加入)
const pcJoinRoom = ref<RTCPeerConnection | null>(null);
const roomInput = ref("");
const joinRoom = async (roomId: string) => {
  if (!localStream.value) {
    alert("請先開啟視訊及麥克風");
    return;
  }

  // 取得輸入id的room
  const roomRef = doc(db, "rooms", roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists() === false) {
    alert("您輸入的聊天室 id 不存在");
    return;
  }

  // 創建一個新的 RTCPeerConnection
  pcJoinRoom.value = new RTCPeerConnection(configuration);
  collectIceCandidates(
    roomRef,
    pcJoinRoom.value,
    "callerCandidates",
    "calleeCandidates"
  );

  // 將 localStream 中的媒體加入至 pcJoinRoom.value 中
  if (localStream.value && localStream.value.srcObject) {
    (localStream.value.srcObject as MediaStream)
      .getTracks()
      .forEach((track) => {
        pcJoinRoom.value?.addTrack(
          track,
          localStream.value?.srcObject as MediaStream
        );
      });
  }

  // 從事件中取得 streams
  // 檢查是否已經存在 remoteStream，如果存在，將媒體軌道添加到其中
  pcJoinRoom.value.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      (remoteStream.value?.srcObject as MediaStream).addTrack(track);
    });
  };

  // 3. 尋找 db 中的 offer
  // 4. offer 設定 RemoteDescription
  const offer = roomSnapshot.data().offer;
  await pcJoinRoom.value.setRemoteDescription(new RTCSessionDescription(offer));

  // 5. 建立 Answer
  // 6. Answer 設定 LocalDescription，放在 db 中交換
  const answer = await pcJoinRoom.value.createAnswer();
  await pcJoinRoom.value.setLocalDescription(answer);

  const roomWithAnswer = {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    },
  };
  await updateDoc(roomRef, roomWithAnswer);
};

// 控制視訊的聲音和畫面
const videoState = ref({
  isMuted: false,
  isVideoDisabled: false,
});
const isDisabledVideoBtn = ref(true);

const toggleMute = () => {
  if (!localStream.value?.srcObject) {
    return;
  }

  // 獲取本地音訊軌道
  const audioTracks = (
    localStream.value.srcObject as MediaStream
  ).getAudioTracks();

  console.log("audioTracks", audioTracks);

  if (audioTracks.length > 0) {
    // 切換音訊軌道的靜音狀態
    audioTracks[0].enabled = !audioTracks[0].enabled;

    // 更新狀態
    videoState.value = {
      ...videoState.value,
      isMuted: !audioTracks[0].enabled,
    };
  }
};

const toggleVideo = () => {
  if (!localStream.value?.srcObject) {
    return;
  }

  // 獲取本地視訊軌道
  const videoTracks = (
    localStream.value.srcObject as MediaStream
  ).getVideoTracks();

  console.log("videoTracks", videoTracks);

  if (videoTracks.length > 0) {
    // 切換音訊軌道的靜音狀態
    videoTracks[0].enabled = !videoTracks[0].enabled;

    // 更新狀態
    videoState.value = {
      ...videoState.value,
      isVideoDisabled: !videoTracks[0].enabled,
    };
  }
};

// 結束通話
const hangUp = async () => {
  // 發送結束通話信號給對方
  // if (roomId.value) {
  //   const roomRef = doc(db, "rooms", roomId.value);
  //   await updateDoc(roomRef, { callEnded: true });
  // }
  if (roomId.value) {
    const roomRef = doc(db, "rooms", roomId.value);
    console.log("roomSnapshot.exists()");
    await updateDoc(roomRef, { callEnded: true });
    const calleeCandidatesRef = collection(roomRef, "calleeCandidates");
    const callerCandidatesRef = collection(roomRef, "callerCandidates");

    // 刪除 calleeCandidates 集合中的文件
    const calleeCandidatesQuery = await getDocs(calleeCandidatesRef);
    calleeCandidatesQuery.forEach(async (candidate) => {
      await deleteDoc(candidate.ref);
    });
    // 刪除 callerCandidates 集合中的文件
    const callerCandidatesQuery = await getDocs(callerCandidatesRef);
    callerCandidatesQuery.forEach(async (candidate) => {
      await deleteDoc(candidate.ref);
    });
    // 刪除 rooms 集合中的文件
    await deleteDoc(roomRef);
  }
  // 停止本地流和遠端流中的所有媒體軌道
  (localStream.value?.srcObject as MediaStream).getTracks().forEach((track) => {
    track.stop();
    (localStream.value?.srcObject as MediaStream).removeTrack(track);
  });
  (remoteStream.value?.srcObject as MediaStream)
    .getTracks()
    .forEach((track) => {
      track.stop();
      (remoteStream.value?.srcObject as MediaStream).removeTrack(track);
    });

  // 關閉 RTCPeerConnection
  pcCreateRoom.value?.close();
  pcJoinRoom.value?.close();
  // 還原RTCPeerConnection
  pcCreateRoom.value = null;
  pcJoinRoom.value = null;

  // 重置相關狀態和視訊元素
  videoState.value = {
    isMuted: false,
    isVideoDisabled: false,
  };

  // 還原video
  if (localStream.value) {
    localStream.value.srcObject = null;
  }
  if (remoteStream.value) {
    remoteStream.value.srcObject = null;
  }
  localStream.value = null;
  remoteStream.value = null;

  roomId.value = "";
  isDisabledVideoBtn.value = true;
  window.alert("通話已結束");
};
</script>

<template>
  <div class="page-wrap">
    <p class="desc">
      一、創建房間者
      <br />
      1.先點擊Open Media，獲取視訊和音訊權限。
      <br />
      2.點擊Create Room，創建Room並產生RoomID。
      <br />
      3.把RoomID給要連線進來的客人。
      <br />
      二、連線的客人
      <br />
      1.先點擊Open Media，獲取視訊和音訊權限。
      <br />
      2.輸入RoomID並點擊Join Room。
    </p>
    <div class="room-wrap">
      <button class="big-btn-style" @click="openMedia">Open Media</button>
      <div :style="{ display: 'flex', justifyContent: 'center' }">
        <div class="room">
          <p>Create Room & Share ID</p>
          <p>{{ `RoomID: ${displayRoomId}` }}</p>
          <button class="big-btn-style" @click="createRoom">Create Room</button>
        </div>
        <div class="room">
          <p>Join Room by Entering ID</p>
          <input v-model="roomInput" class="mb-10" />
          <br />
          <button class="big-btn-style" @click="joinRoom(roomInput)">
            Join Room
          </button>
        </div>
      </div>
    </div>

    <div>
      <div>
        <button
          class="small-btn-style"
          @click="toggleMute"
          :disabled="isDisabledVideoBtn"
        >
          <span v-if="videoState.isMuted">開音訊</span>
          <span v-else>關音訊</span>
        </button>
        <button
          class="small-btn-style"
          @click="toggleVideo"
          :disabled="isDisabledVideoBtn"
        >
          <span v-if="videoState.isVideoDisabled">開視訊</span>
          <span v-else>關視訊</span>
        </button>
        <button
          class="small-btn-style"
          @click="hangUp"
          :disabled="isDisabledVideoBtn"
        >
          <span>結束通話</span>
        </button>
      </div>
      <div class="video-wrap">
        <div class="video">
          <h3>自己</h3>
          <!-- local 需要 muted -->
          <video
            v-show="localStream"
            class="w100"
            ref="localStream"
            autoPlay
            muted
            playsInline
          />
        </div>
        <div class="video">
          <h3>對方</h3>
          <video
            v-show="remoteStream"
            class="w100"
            ref="remoteStream"
            autoPlay
            playsInline
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style>
p,
button {
  margin: 10px 0;
}
.page-wrap {
  width: 1000px;
  max-width: 100%;
}
.desc {
  width: 500px;
  text-align: left;
  margin: 10px auto;
}
.big-btn-style,
.small-btn-style {
  border: 1px solid #000;
}
.small-btn-style {
  padding: 5px;
  margin: 10px 5px;
}
.room-wrap {
  width: 100%;
  margin-bottom: 15px;
}
.room {
  width: 300px;
  border: 2px solid #000;
  padding: 10px;
  margin: 10px 0;
}
.video-wrap {
  display: flex;
  justify-content: space-between;
}
.video {
  width: 48%;
  border: 2px solid #000;
  padding: 5px;
}

.mb-10 {
  margin-bottom: 10px;
}
.w100 {
  width: 100%;
}
</style>
