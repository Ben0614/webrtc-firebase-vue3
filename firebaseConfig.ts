import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_APP_FIREBASE_APIKEY,
  authDomain: import.meta.env.VITE_APP_FIREBASE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_APP_FIREBASE_PROJECTID,
  storageBucket: import.meta.env.VITE_APP_FIREBASE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_APP_FIREBASE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APP_FIREBASE_APPID,
};

// 使用 SDK 初始化 Firebase app
// 初始化 Firestore 數據庫，建立對集合、文檔等的參照
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

/*
Firebase Cloud Firestore

1.到https://firebase.google.com/?hl=zh-cn
2.註冊登入後 點擊Go to console
3.建立專案 -> 是否開啟 Google Analytics (選否) -> 進入專案 -> 點擊新增應用程式 -> 點擊</> (網頁) -> 新增Firebase SDK -> 底下會有一串"SDK 設定和配置"是等等要放到本地專案裡面的 (之後還可以在專案設定裡面看)
4.到本機的專案 yarn add firebase ; yarn add -D firebase-tools
5.初始化專案，若為第一次使用需登入 yarn firebase init
(1)Are you ready to proceed? 選擇:Y
(2)Which Firebase features do you want to set up for this directory? Press Space to select features, then Enter to confirm your choices. 按空白鍵移動選項 選擇:Hosting: Configure files for Firebase Hosting and (optionally) set up Github Action deploys
(3)Please select an option 選擇:Use an existing project
(4)What do you want to use as your public directory? 輸入:build
(5)Configure as a single-page app (rewrite all urls to /index.html)? 輸入:Yes
(6)Set up autoatic builds and deploys Github? 選擇:n
6.打包專案 yarn build
7.yarn firebase deploy
8.點擊 Hosting URL 就可以看到部署的網站
9.回到https://firebase.google.com/?hl=zh-cn -> 進入這個專案 -> 點擊應用程式 -> 專案設定 -> 一般設定 -> 底下有"SDK 設定和配置"
10.做最上面的設定
*/
