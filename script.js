window.onload = function () {
  const socket = io();

  const menu = document.getElementById("menu");
  const stageContainer = document.getElementById("stageContainer");
  const shopContainer = document.getElementById("shopContainer");
  const gameContainer = document.getElementById("gameContainer");
//==멀티==
  //시작ID입력
  const playerIdText = document.getElementById("playerIdText");
  

  let playerId = localStorage.getItem("playerId");
  let currentRoomId = null;

  let enemyBoard = null;
  let enemyScore = 0;
  let enemyPlayerId = "";
  let enemyBoardDiv = null;
  let enemyScoreText = null;
  let enemyPreviewText = null;
  let enemyTurnText = null;
  let enemyTimerBar = null;
  let enemySlotDivs_M = [];

  if (!playerId) {
  playerId = prompt("사용할 ID를 입력하세요");

  if (!playerId || playerId.trim() === "") {
    playerId = "Player" + Math.floor(Math.random() * 10000);
    }

    localStorage.setItem("playerId", playerId);
  }
  socket.emit("setPlayerId", playerId);

  let idReady = false;

socket.on("idAccepted", id => {
  playerId = id;
  idReady = true;

  localStorage.setItem("playerId", playerId);
  updatePlayerIdUI();

  console.log("ID 설정 완료:", playerId);
});

socket.on("idRejected", message => {
  idReady = false;
  alert(message || "ID 설정 실패");
});

  function updatePlayerIdUI() {
  const playerIdText = document.getElementById("playerIdText");

  if (playerIdText) {
    playerIdText.textContent = "Player ID: " + playerId;
  }
}
  //백버튼
  const multiContainer = document.getElementById("multiContainer");
  const multiBackBtn = document.getElementById("multiBackBtn");

  

//==ID입력버튼
  const idBtn = document.getElementById("idBtn");

  

socket.on("idAccepted", id => {

  playerId = id;

  localStorage.setItem("playerId", playerId);

  updatePlayerIdUI();

  alert("ID 설정 완료!");
});

socket.on("idRejected", () => {
  alert("이미 사용중인 ID입니다");
});

//==매칭==
const matchingBtn = document.getElementById("matchingBtn");

function showMatchingUI() {

  // 기존 UI 제거
  multiContainer.innerHTML = "";

  // 매칭중 텍스트
  const matchingText = document.createElement("div");

  matchingText.textContent = "매칭중...";

  matchingText.style.position = "fixed";
  matchingText.style.top = "100px";
  matchingText.style.left = "50%";
  matchingText.style.transform = "translateX(-50%)";

  matchingText.style.fontSize = "40px";
  matchingText.style.fontWeight = "bold";
  matchingText.style.color = "#1b5e20";

  // 취소 버튼
  const cancelBtn = document.createElement("div");

  cancelBtn.textContent = "취소";

  cancelBtn.className = "block";

  cancelBtn.style.position = "fixed";
  cancelBtn.style.top = "220px";
  cancelBtn.style.left = "50%";
  cancelBtn.style.transform = "translateX(-50%)";

  cancelBtn.onclick = () => {
  socket.emit("cancelMatching");
  resetMultiUI();
};

  multiContainer.appendChild(matchingText);
  multiContainer.appendChild(cancelBtn);
}

function resetMultiUI() {

  multiContainer.innerHTML = `
    <div class="stage" id="matchingBtn">매칭하기</div>
    <div class="stage" id="createRoomBtn">방 만들기</div>
    <div class="stage" id="friendBtn">친구 초대</div>
    <div class="stage" id="idBtn">ID 입력</div>

    <div id="playerIdText" class="player-id"></div>
    <div id="roomList" class="room-list"></div>

    <div class="multi-back-btn" id="multiBackBtn">뒤로가기</div>
  `;

  // 다시 연결
  setupMultiButtons();

  updatePlayerIdUI();
}

function setupMultiButtons() {
  const matchingBtn = document.getElementById("matchingBtn");
  const createRoomBtn = document.getElementById("createRoomBtn");
  const friendBtn = document.getElementById("friendBtn");
  const idBtn = document.getElementById("idBtn");
  const multiBackBtn = document.getElementById("multiBackBtn");

  matchingBtn.onclick = () => {
    console.log("매칭 버튼 클릭됨");
    showMatchingUI();
    socket.emit("startMatching");
  };

  createRoomBtn.onclick = () => {
    const roomTitle = prompt("방 제목을 입력하세요");

    if (!roomTitle || roomTitle.trim() === "") {
      return;
    }

    socket.emit("createRoom", roomTitle);
  };

  friendBtn.onclick = () => {
  const targetId = prompt("초대할 상대 ID를 입력하세요");

  if (!targetId || targetId.trim() === "") {
    return;
  }

  socket.emit("leaveRoom");
  socket.emit("invitePlayer", targetId.trim());
};

  idBtn.onclick = () => {
    let newId = prompt("새로운 ID를 입력하세요");

    if (!newId || newId.trim() === "") {
      return;
    }

    socket.emit("setPlayerId", newId);
  };

  multiBackBtn.onclick = () => {
    socket.emit("leaveMulti", playerId);
    multiContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  };
}

setupMultiButtons();

socket.on("matchingWaiting", () => {
  console.log("상대 기다리는 중...");
});

socket.on("matchingCanceled", () => {
  resetMultiUI();
});

socket.on("matchError", message => {
  alert(message);
  resetMultiUI();
});

socket.on("matchFound", data => {
  alert(data.players[0] + " VS " + data.players[1]);

  multiContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");

  currentRoomId = data.roomId;

  initGame_M();
});


function renderRoomList(rooms) {
  const roomList = document.getElementById("roomList");
  if (!roomList) return;

  roomList.innerHTML = "";

  rooms.forEach(room => {
    const div = document.createElement("div");
    div.className = "room";

    div.innerHTML = `
      <strong>${room.title}</strong><br>
      방장: ${room.hostName}<br>
      상태: ${room.status === "waiting" ? "대기중" : "게임중"}
    `;

    div.onclick = () => {
      socket.emit("joinRoomById", room.roomId);
    };

    roomList.appendChild(div);
  });
}

socket.on("roomListUpdate", rooms => {
  renderRoomList(rooms);
});

socket.on("enterWaitingRoom", room => {
  showWaitingRoom(room);
});

socket.on("roomError", message => {
  alert(message);
});

//==멀티==
  let unlocked = JSON.parse(localStorage.getItem("unlocked")) || ["1-1"];

  let coin = Number(localStorage.getItem("coin")) || 1000000;
  let board = [];
  let score = 0;
 

  // ================= 메뉴 =================
  const items = ["시작하기", "멀티", "상점", "옵션"];

  menu.innerHTML = "";
  items.forEach(text => {
    const div = document.createElement("div");
    div.className = "block";
    div.textContent = text;


    div.onclick = () => {
      if (text === "시작하기") {
        menu.classList.add("hidden");
        stageContainer.classList.remove("hidden");
        showMainStages();
      } else if (text === "상점") {
        menu.classList.add("hidden");
        showShop();
      } else if (text === "멀티") {

        menu.classList.add("hidden");
        multiContainer.classList.remove("hidden");
        socket.emit("enterMulti", playerId);
        updatePlayerIdUI();
        socket.emit("requestRoomList");
      } else if (text === "옵션") {
        menu.classList.add("hidden");
        showOptions();
      }
    };

    menu.appendChild(div);
  });

  function showWaitingRoom(room) {
  multiContainer.innerHTML = "";

  // 대기실 이름: 왼쪽 위
  const title = document.createElement("div");
  title.textContent = "대기실: " + room.title;
  title.style.position = "fixed";
  title.style.top = "30px";
  title.style.left = "30px";
  title.style.color = "#1b5e20";
  title.style.fontSize = "26px";
  title.style.fontWeight = "bold";

  // 가운데 버튼/정보 박스
  const centerBox = document.createElement("div");
  centerBox.style.position = "fixed";
  centerBox.style.top = "50%";
  centerBox.style.left = "50%";
  centerBox.style.transform = "translate(-50%, -50%)";
  centerBox.style.display = "flex";
  centerBox.style.flexDirection = "column";
  centerBox.style.gap = "15px";
  centerBox.style.alignItems = "center";

  const hostText = document.createElement("div");
  hostText.className = "block";
  hostText.textContent = "방장: " + room.hostName;

  const guestText = document.createElement("div");
  guestText.className = "block";
  guestText.textContent = "상대: " + (room.guestName || "대기중...");

  const startBtn = document.createElement("div");
  startBtn.className = "block";
  startBtn.textContent = "게임 시작";

  startBtn.onclick = () => {
    socket.emit("startRoomGame");
  };

  // 나가기: 왼쪽 아래
  const backBtn = document.createElement("div");
  backBtn.className = "multi-back-btn";
  backBtn.textContent = "나가기";

  backBtn.onclick = () => {
  socket.emit("leaveRoom");
  currentRoomId = null;
  resetMultiUI();
  socket.emit("requestRoomList");
};

  centerBox.appendChild(hostText);
  centerBox.appendChild(guestText);
  centerBox.appendChild(startBtn);

  multiContainer.appendChild(title);
  multiContainer.appendChild(centerBox);
  multiContainer.appendChild(backBtn);
}

socket.on("receiveInvite", data => {
  if (localStorage.getItem("inviteBlock") === "true") {
    socket.emit("rejectInvite", {
      roomId: data.roomId
    });
    return;
  }


  multiContainer.classList.remove("hidden");
  menu.classList.add("hidden");

  multiContainer.innerHTML = "";

  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.top = "50%";
  box.style.left = "50%";
  box.style.transform = "translate(-50%, -50%)";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.gap = "15px";
  box.style.alignItems = "center";

  const text = document.createElement("div");
  text.className = "block";
  text.textContent = data.fromId + "님이 초대했습니다";

  const acceptBtn = document.createElement("div");
  acceptBtn.className = "block";
  acceptBtn.textContent = "수락";

  const rejectBtn = document.createElement("div");
  rejectBtn.className = "block";
  rejectBtn.textContent = "거절";

  acceptBtn.onclick = () => {
    socket.emit("acceptInvite", data.roomId);
  };

  rejectBtn.onclick = () => {
    socket.emit("rejectInvite", {
      roomId: data.roomId
    });
    resetMultiUI();
  };

  box.appendChild(text);
  box.appendChild(acceptBtn);
  box.appendChild(rejectBtn);

  multiContainer.appendChild(box);
});

socket.on("inviteAccepted", room => {
  showWaitingRoom(room);
});

socket.on("inviteRejected", data => {
  alert(data.targetId + "님이 초대를 거절했습니다");

  currentRoomId = null;

  multiContainer.classList.remove("hidden");
  gameContainer.classList.add("hidden");

  resetMultiUI();
  socket.emit("requestRoomList");
});


  // ================= 스테이지 =================
  function showMainStages() {
    stageContainer.innerHTML = "";

    createBackButton(() => {
      stageContainer.classList.add("hidden");
      menu.classList.remove("hidden");
    }, stageContainer);

    const grid = document.createElement("div");
  grid.className = "stage-grid";
  stageContainer.appendChild(grid);

  // ⭐ 1~8 스테이지 생성
  for (let i = 1; i <= 8; i++) {
    const stage = document.createElement("div");
    stage.className = "stage";
    stage.textContent = i;

    // 👉 클릭하면 서브 스테이지로 이동
    stage.onclick = () => showSubStages(i);

    grid.appendChild(stage);
  }
}

function showSubStages(stageNum) {
  stageContainer.innerHTML = "";

  createBackButton(() => {
    showMainStages();
  }, stageContainer);

  const grid = document.createElement("div");
  grid.className = "stage-grid";
  stageContainer.appendChild(grid);

  let unlocked = JSON.parse(localStorage.getItem("unlocked")) || ["1-1"];

  // ⭐ 스테이지별 서브스테이지 개수
  let subCount = 4;

  if (stageNum === 5 || stageNum === 6) {
    subCount = 2;
  } else if (stageNum === 7 || stageNum === 8) {
    subCount = 1;
  }

  for (let i = 1; i <= subCount; i++) {
    const sub = document.createElement("div");
    sub.className = "stage";

    let stageKey = `${stageNum}-${i}`;
    sub.textContent = stageKey;

    if (unlocked.includes(stageKey)) {
      sub.onclick = () => startGame(stageNum, i);
    } else {
      sub.style.background = "#ccc";
      sub.style.cursor = "not-allowed";
      sub.textContent += " 🔒";
    }

    grid.appendChild(sub);
  }
}

  function createBackButton(callback, container) {
    const back = document.createElement("div");
    back.className = "back-btn";
    back.textContent = "Back";
    back.onclick = callback;
    container.appendChild(back);
  }

  function unlockNextStage() {
  let unlocked = JSON.parse(localStorage.getItem("unlocked")) || ["1-1"];

  let main = currentStage.main;
  let sub = currentStage.sub;

  let maxSub = 4;

  // ⭐ 스테이지별 서브 개수
  if (main === 5 || main === 6) {
    maxSub = 2;
  } else if (main === 7 || main === 8) {
    maxSub = 1;
  }

  let next;

  if (sub < maxSub) {
    next = `${main}-${sub + 1}`;
  } else {
    next = `${main + 1}-1`;
  }

  // ⭐ 8-1 클리어하면 더 이상 해금 안 함
  if (main === 8 && sub === 1) return;

  if (!unlocked.includes(next)) {
    unlocked.push(next);
    localStorage.setItem("unlocked", JSON.stringify(unlocked));
  }
}


 function showOptions() {
  const optionContainer = document.getElementById("optionContainer");

  optionContainer.classList.remove("hidden");
  optionContainer.innerHTML = "";

  // ⭐ 기존 container CSS 영향 제거
  optionContainer.removeAttribute("class");
  optionContainer.id = "optionContainer";

  optionContainer.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    transform: none;
    background: #e8f5e9;
    z-index: 9999;
    overflow: hidden;
  `;

  // 제목
  const title = document.createElement("div");
  title.textContent = "옵션";
  title.style.cssText = `
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 48px;
    font-weight: bold;
    color: #1b5e20;
  `;
  optionContainer.appendChild(title);

  const inviteBlock = localStorage.getItem("inviteBlock") === "true";

  // 중앙 버튼
  const inviteBtn = document.createElement("div");
  inviteBtn.textContent = inviteBlock
    ? "초대 차단: ON"
    : "초대 차단: OFF";

  inviteBtn.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    height: 80px;
    background: #4caf50;
    color: white;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  `;

  inviteBtn.onclick = () => {
    const current = localStorage.getItem("inviteBlock") === "true";
    localStorage.setItem("inviteBlock", !current);
    showOptions();
  };

  optionContainer.appendChild(inviteBtn);

  // 백버튼
  const backBtn = document.createElement("div");
  backBtn.textContent = "Back";

  backBtn.style.cssText = `
    position: absolute;
    left: 40px;
    bottom: 40px;
    width: 130px;
    height: 60px;
    background: #f44336;
    color: white;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
  `;

  backBtn.onclick = () => {
    optionContainer.className = "container hidden";
    menu.classList.remove("hidden");
  };

  optionContainer.appendChild(backBtn);
}



  // ================= 상점 =================
  function showShop() {

    function setShopState(item, enabled) {
  if (enabled) {
    item.style.background = "#a5d6a7";
    item.style.color = "#1b5e20";
    item.style.opacity = "1";
    item.style.pointerEvents = "auto";
    item.style.cursor = "pointer";
  } else {
    item.style.background = "#ccc";
    item.style.color = "#666";
    item.style.opacity = "1";
    item.style.pointerEvents = "none";
    item.style.cursor = "not-allowed";
  }
}


    shopContainer.classList.remove("hidden");
    shopContainer.innerHTML = "";

    const coinText = document.createElement("div");
    coinText.className = "coin-display";
    coinText.textContent = "Coin: " + coin;
    shopContainer.appendChild(coinText);

    const resetBtn = document.createElement("div");
resetBtn.className = "shop-item";
resetBtn.textContent = "상점 초기화";

resetBtn.onclick = () => {
  if (!confirm("상점 구매 내역을 초기화할까요?")) return;

  const keys = [
    "item1Count",
    "item2Count",
    "item3",
    "item4",
    "item5Count",
    "item6Count",
    "item7",
    "item8",
    "item9Count",
    "item10Count",
    "item11",
    "item12",
    "item13Count",
    "item14Count",
    "item15",
    "item16Count"
  ];

  keys.forEach(key => localStorage.removeItem(key));
  coin = 1000000;
localStorage.setItem("coin", coin);

  showShop();
};

shopContainer.appendChild(resetBtn);

    createBackButton(() => {
      shopContainer.classList.add("hidden");
      menu.classList.remove("hidden");
    }, shopContainer);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(4, 120px)";
    grid.style.gridTemplateRows = "repeat(4, 80px)"; // ⭐ 추가
    grid.style.gap = "10px";
    shopContainer.appendChild(grid);

    // ================= 공통 함수 =================
function setShopState(item, enabled) {
  if (enabled) {
    item.style.background = "#a5d6a7";
    item.style.color = "#1b5e20";
    item.style.opacity = "1";
    item.style.pointerEvents = "auto";
    item.style.cursor = "pointer";
  } else {
    item.style.background = "#ccc";
    item.style.color = "#666";
    item.style.opacity = "1";
    item.style.pointerEvents = "none";
    item.style.cursor = "not-allowed";
  }
}

function hasStage(stageKey) {
  const unlocked = JSON.parse(localStorage.getItem("unlocked")) || ["1-1"];
  return unlocked.includes(stageKey);
}

function updateCoin() {
  localStorage.setItem("coin", coin);
  coinText.textContent = "Coin: " + coin;
}

function buyLevelItem(key, price, max, onBuy) {
  let count = Number(localStorage.getItem(key)) || 0;
  if (count >= max) return false;
  if (coin < price) {
    alert("코인이 부족합니다");
    return false;
  }

  coin -= price;
  count++;
  localStorage.setItem(key, count);
  updateCoin();

  if (onBuy) onBuy(count);
  updateAllShopItems();
  return true;
}

function buyOnceItem(key, price) {
  if (localStorage.getItem(key)) return false;
  if (coin < price) {
    alert("코인이 부족합니다");
    return false;
  }

  coin -= price;
  localStorage.setItem(key, "true");
  updateCoin();
  updateAllShopItems();
  return true;
}

// ================= 아이템 생성 =================
const item1 = document.createElement("div");
const item2 = document.createElement("div");
const item3 = document.createElement("div");
const item4 = document.createElement("div");
const item5 = document.createElement("div");
const item6 = document.createElement("div");
const item7 = document.createElement("div");
const item8 = document.createElement("div");
const item9 = document.createElement("div");
const item10 = document.createElement("div");
const item11 = document.createElement("div");
const item12 = document.createElement("div");
const item13 = document.createElement("div");
const item14 = document.createElement("div");
const item15 = document.createElement("div");
const item16 = document.createElement("div");

[
  item1, item2, item3, item4,
  item5, item6, item7, item8,
  item9, item10, item11, item12,
  item13, item14, item15, item16
].forEach(item => {
  item.className = "shop-item";
  grid.appendChild(item);
});

// ================= 아이템16 구매 개수 =================
let item16BuyAmount = 1;

item16.oncontextmenu = e => {
  e.preventDefault();

  if (item16BuyAmount === 1) {
    item16BuyAmount = 10;
  } else if (item16BuyAmount === 10) {
    item16BuyAmount = 100;
  } else {
    item16BuyAmount = 1;
  }

  updateAllShopItems();
};

// ================= 업데이트 함수들 =================
function updateItem1() {
  let count = Number(localStorage.getItem("item1Count")) || 0;
  let price = 10 * Math.pow(2, count);

  item1.textContent =
    count >= 5 ? "아이템1 (MAX)" : `아이템1 Lv.${count}\n${price}`;

  setShopState(item1, count < 5);
}

function updateItem2() {
  let count = Number(localStorage.getItem("item2Count")) || 0;
  let price = 2 * Math.pow(4, count);

  item2.textContent =
    count >= 10 ? "아이템2 (MAX)" : `아이템2 Lv.${count}\n${price}`;

  setShopState(item2, count < 10);
}

function updateItem3() {
  let owned = localStorage.getItem("item3");

  item3.textContent = owned ? "아이템3 (구입함!)" : "아이템3\n500";
  setShopState(item3, !owned);
}

function updateItem4() {
  let owned = localStorage.getItem("item4");

  if (owned) {
    item4.textContent = "아이템4 (구입함!)";
    setShopState(item4, false);
    return;
  }

  if (!localStorage.getItem("item3")) {
    item4.textContent = "아이템4 (🔒 아이템3 필요)";
    setShopState(item4, false);
    return;
  }

  item4.textContent = "아이템4\n1";
  setShopState(item4, true);
}

function updateItem5() {
  let item1Count = Number(localStorage.getItem("item1Count")) || 0;
  let count = Number(localStorage.getItem("item5Count")) || 0;
  let price = 50 * Math.pow(2, count);

  if (item1Count < 5) {
    item5.textContent = "아이템5 (🔒 아이템1 Lv.5 필요)";
    setShopState(item5, false);
    return;
  }

  item5.textContent =
    count >= 10 ? "아이템5 (MAX)" : `아이템5 Lv.${count}\n${price}`;

  setShopState(item5, count < 10);
}

function updateItem6() {
  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let count = Number(localStorage.getItem("item6Count")) || 0;
  let price = 30 * Math.pow(2, count);

  if (item2Count < 10) {
    item6.textContent = "아이템6 (🔒 아이템2 Lv.10 필요)";
    setShopState(item6, false);
    return;
  }

  item6.textContent =
    count >= 10 ? "아이템6 (MAX)" : `아이템6 Lv.${count}\n${price}`;

  setShopState(item6, count < 10);
}

function updateItem7() {
  let owned = localStorage.getItem("item7");

  if (owned) {
    item7.textContent = "아이템7 (구입함!)";
    setShopState(item7, false);
    return;
  }

  if (!localStorage.getItem("item4")) {
    item7.textContent = "아이템7 (🔒 아이템4 필요)";
    setShopState(item7, false);
    return;
  }

  item7.textContent = "아이템7\n10";
  setShopState(item7, true);
}

function updateItem8() {
  let owned = localStorage.getItem("item8");

  if (owned) {
    item8.textContent = "아이템8 (구입함!)";
    setShopState(item8, false);
    return;
  }

  if (!localStorage.getItem("item7")) {
    item8.textContent = "아이템8 (🔒 아이템7 필요)";
    setShopState(item8, false);
    return;
  }

  item8.textContent = "아이템8\n11";
  setShopState(item8, true);
}

function updateItem9() {
  let item5Count = Number(localStorage.getItem("item5Count")) || 0;
  let count = Number(localStorage.getItem("item9Count")) || 0;
  let price = 100 * Math.pow(10, count);

  if (item5Count < 10) {
    item9.textContent = "아이템9 (🔒 아이템5 Lv.10 필요)";
    setShopState(item9, false);
    return;
  }

  item9.textContent =
    count >= 2 ? "아이템9 (MAX)" : `아이템9 Lv.${count}\n${price}`;

  setShopState(item9, count < 2);
}

function updateItem10() {
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let count = Number(localStorage.getItem("item10Count")) || 0;
  let price = 50 * Math.pow(11, count);

  if (item6Count < 10) {
    item10.textContent = "아이템10 (🔒 아이템6 Lv.10 필요)";
    setShopState(item10, false);
    return;
  }

  item10.textContent =
    count >= 2 ? "아이템10 (MAX)" : `아이템10 Lv.${count}\n${price}`;

  setShopState(item10, count < 2);
}

function updateItem11() {
  let owned = localStorage.getItem("item11");
  item11.textContent = owned ? "💣 시작 지급 (구매 완료)" : "💣 시작 지급\n15";
  setShopState(item11, !owned);
}

function updateItem12() {
  let owned = localStorage.getItem("item12");
  item12.textContent = owned ? "🔫 시작 지급 (구매 완료)" : "🔫 시작 지급\n15";
  setShopState(item12, !owned);
}

function updateItem13() {
  let item9Count = Number(localStorage.getItem("item9Count")) || 0;
  let count = Number(localStorage.getItem("item13Count")) || 0;
  let price = 10000;

  if (item9Count < 2) {
    item13.textContent = "아이템13 (🔒 아이템9 Lv.2 필요)";
    setShopState(item13, false);
    return;
  }

  item13.textContent =
    count >= 1 ? "아이템13 (MAX)" : `아이템13 Lv.${count}\n${price}`;

  setShopState(item13, count < 1);
}

function updateItem14() {
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let count = Number(localStorage.getItem("item14Count")) || 0;
  let price = 11111;

  if (item10Count < 2) {
    item14.textContent = "아이템14 (🔒 아이템10 Lv.2 필요)";
    setShopState(item14, false);
    return;
  }

  item14.textContent =
    count >= 1 ? "아이템14 (MAX)" : `아이템14 Lv.${count}\n${price}`;

  setShopState(item14, count < 1);
}

function updateItem15() {
  let owned = localStorage.getItem("item15");
  item15.textContent = owned ? "🧱 시작 지급 (구매 완료)" : "🧱 시작 지급\n15";
  setShopState(item15, !owned);
}

function updateItem16() {
  let count = Number(localStorage.getItem("item16Count")) || 0;

  if (!hasStage("4-1")) {
    item16.textContent = "⏱️ 타이머강화 (🔒 3-4 클리어 필요)";
    setShopState(item16, false);
    return;
  }

  item16.textContent =
    count >= 10000
      ? "⏱️ 타이머강화 (MAX)"
      : `⏱️ 타이머강화 Lv.${count}\n50코인 x ${item16BuyAmount}개`;

  setShopState(item16, count < 10000);
}

function updateAllShopItems() {
  updateItem1();
  updateItem2();
  updateItem3();
  updateItem4();
  updateItem5();
  updateItem6();
  updateItem7();
  updateItem8();
  updateItem9();
  updateItem10();
  updateItem11();
  updateItem12();
  updateItem13();
  updateItem14();
  updateItem15();
  updateItem16();
}


// ================= 클릭 이벤트 =================
item1.onclick = () => {
  let count = Number(localStorage.getItem("item1Count")) || 0;
  let price = 10 * Math.pow(2, count);
  buyLevelItem("item1Count", price, 5);
};

item2.onclick = () => {
  let count = Number(localStorage.getItem("item2Count")) || 0;
  let price = 2 * Math.pow(4, count);
  buyLevelItem("item2Count", price, 10);
};

item3.onclick = () => {
  buyOnceItem("item3", 500);
};

item4.onclick = () => {
  if (!localStorage.getItem("item3")) return;
  buyOnceItem("item4", 1);
};

item5.onclick = () => {
  let item1Count = Number(localStorage.getItem("item1Count")) || 0;
  if (item1Count < 5) return;

  let count = Number(localStorage.getItem("item5Count")) || 0;
  let price = 50 * Math.pow(2, count);
  buyLevelItem("item5Count", price, 10);
};

item6.onclick = () => {
  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  if (item2Count < 10) return;

  let count = Number(localStorage.getItem("item6Count")) || 0;
  let price = 30 * Math.pow(2, count);
  buyLevelItem("item6Count", price, 10);
};

item7.onclick = () => {
  if (!localStorage.getItem("item4")) return;
  buyOnceItem("item7", 10);
};

item8.onclick = () => {
  if (!localStorage.getItem("item7")) return;
  buyOnceItem("item8", 11);
};

item9.onclick = () => {
  let item5Count = Number(localStorage.getItem("item5Count")) || 0;
  if (item5Count < 10) return;

  let count = Number(localStorage.getItem("item9Count")) || 0;
  let price = 100 * Math.pow(10, count);
  buyLevelItem("item9Count", price, 2);
};

item10.onclick = () => {
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  if (item6Count < 10) return;

  let count = Number(localStorage.getItem("item10Count")) || 0;
  let price = 50 * Math.pow(11, count);
  buyLevelItem("item10Count", price, 2);
};

item11.onclick = () => {
  buyOnceItem("item11", 15);
};

item12.onclick = () => {
  buyOnceItem("item12", 15);
};

item13.onclick = () => {
  let item9Count = Number(localStorage.getItem("item9Count")) || 0;
  if (item9Count < 2) return;

  buyLevelItem("item13Count", 10000, 1);
};

item14.onclick = () => {
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  if (item10Count < 2) return;

  buyLevelItem("item14Count", 11111, 1);
};

item15.onclick = () => {
  buyOnceItem("item15", 15);
};

item16.onclick = () => {
  if (!hasStage("4-1")) return;

  let count = Number(localStorage.getItem("item16Count")) || 0;
  if (count >= 10000) return;

  let canBuy = Math.min(item16BuyAmount, 10000 - count);
  let price = 50 * canBuy;

  if (coin < price) {
    alert("코인이 부족합니다");
    return;
  }

  coin -= price;
  count += canBuy;

  localStorage.setItem("item16Count", count);
  updateCoin();
  updateAllShopItems();
};

// 최초 표시
updateAllShopItems();

  }

 

  let currentStage = { main: 1, sub: 1 };
  // ================= 게임 =================
  function startGame(stage, subStage) {
  currentStage = { main: stage, sub: subStage };

  stageContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");

  // ⭐ 스테이지별 게임 분기
  if (stage === 1 && subStage === 1) {
    initGame();
  } else if (stage === 1 && subStage === 2) {
    initGame_1_2(); // ⭐ 새 게임
  } else if (stage === 1 && subStage === 3) {
    initGame_1_3(); // ⭐ 추가
  } else if (stage === 1 && subStage === 4) {
    initGame_1_4(); // ⭐ 추가
  } else if (stage === 2 && subStage === 1) {
    initGame_2_1(); // ⭐ 추가
  } else if (stage === 2 && subStage === 2) {
    initGame_2_2(); // ⭐ 추가
  } else if (stage === 2 && subStage === 3) {
    initGame_2_3(); // ⭐ 추가
  } else if (stage === 2 && subStage === 4) {
    initGame_2_4(); // ⭐ 추가
  } else if (stage === 3 && subStage === 1) {
    initGame_3_1(); // ⭐ 추가
  } else if (stage === 3 && subStage === 2) {
    initGame_3_2(); // ⭐ 추가
  } else if (stage === 3 && subStage === 3) {
    initGame_3_3(); // ⭐ 추가
  } else if (stage === 3 && subStage === 4) {
    initGame_3_4(); // ⭐ 추가
  } else if (stage === 4 && subStage === 1) {
    initGame_4_1(); // ⭐ 추가
  } else if (stage === 4 && subStage === 2) {
    initGame_4_2(); // ⭐ 추가
  } else if (stage === 4 && subStage === 3) {
    initGame_4_3(); // ⭐ 추가
  } else if (stage === 4 && subStage === 4) {
    initGame_4_4(); // ⭐ 추가
  } else if (stage === 5 && subStage === 1) {
    initGame_5_1(); // ⭐ 추가
  } else if (stage === 5 && subStage === 2) {
    initGame_5_2(); // ⭐ 추가
  } else if (stage === 6 && subStage === 1) {
    initGame_6_1(); // ⭐ 추가
  } else if (stage === 6 && subStage === 2) {
    initGame_6_2(); // ⭐ 추가
  } else if (stage === 7 && subStage === 1) {
    initGame_7_1(); // ⭐ 추가
  }
}

function getBonus() {
  let b1 = Number(localStorage.getItem("item1Count")) || 0;
  let b5 = Number(localStorage.getItem("item5Count")) || 0;
  let b9 = Number(localStorage.getItem("item9Count")) || 0;
  let b13 = Number(localStorage.getItem("item13Count")) || 0;

  return b1 + (b5*10) + (b9*100) + (b13*1000);
}


  function initGame(stage, subStage) {
    document.onkeydown = null;
  console.log("게임 시작:", stage, subStage);
    gameContainer.innerHTML = "";
    score = 0;
    window.cleared = false;

    const scoreText = document.createElement("div");
    scoreText.className = "score";
    scoreText.id = "scoreText";
    scoreText.textContent = "Score: 0";
    gameContainer.appendChild(scoreText);

    const targetText = document.createElement("div");
    targetText.className = "score"; // 같은 스타일 재사용
    targetText.style.top = "60px";  // 점수 아래로 내림
    targetText.textContent = "목표: 16";
    gameContainer.appendChild(targetText);

    // ⭐ CLEAR TEXT 추가
    const clearText = document.createElement("div");
    clearText.id = "clearText";
    clearText.style.position = "fixed";
    clearText.style.top = "50%";
    clearText.style.left = "50%";
    clearText.style.transform = "translate(-50%, -50%)";
    clearText.style.fontSize = "40px";
    clearText.style.fontWeight = "bold";
    clearText.style.color = "#2e7d32";
    clearText.style.display = "none";
    clearText.textContent = "CLEAR!";
    gameContainer.appendChild(clearText);

    const boardDiv = document.createElement("div");
    boardDiv.className = "board";
    gameContainer.appendChild(boardDiv);

    createBackButton(() => {
      gameContainer.classList.add("hidden");
      menu.classList.remove("hidden");
    }, gameContainer);

    board = [[0, 0],[0, 0]];

    addRandom();
    addRandom();
    draw(boardDiv);

    document.onkeydown = handleKey;
  }

  

  function addRandom() {
    let empty = [];

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        if (board[i][j] === 0) empty.push([i, j]);
      }
    }

    if (empty.length === 0) return;

    const [x, y] = empty[Math.floor(Math.random() * empty.length)];

    let value;

    if (localStorage.getItem("item8")) {
      value = Math.random() < 0.8 ? 32 : 64;
    } else if (localStorage.getItem("item7")) {
      value = Math.random() < 0.8 ? 16 : 32;
    } else if (localStorage.getItem("item4")) {
      value = Math.random() < 0.8 ? 8 : 16;
    } else if (localStorage.getItem("item3")) {
      value = Math.random() < 0.8 ? 4 : 8;
    } else {
      value = Math.random() < 0.8 ? 2 : 4;
    }

    board[x][y] = value;
  }

  function draw(boardDiv) {
    boardDiv.innerHTML = "";

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = board[i][j] || "";
        boardDiv.appendChild(cell);
      }
    }
  }

  function handleKey(e) {

    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    let moved = false;

    function merge(arr) {
  let original = [...arr];

  arr = arr.filter(v => v);

  if (arr[0] === arr[1] && arr[0]) {
    let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
    let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
    let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
    let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

    arr[0] *= 2;
    score += arr[0] + bonus1 + (bonus5 * 10) + (bonus9 * 100) + (bonus13 * 1000);
    arr[1] = 0;
  }

  arr = arr.filter(v => v);
  while (arr.length < 2) arr.push(0);

  if (arr.join() !== original.join()) moved = true;

  return arr;
}

    if (e.key === "ArrowLeft") {
      for (let i = 0; i < 2; i++) {
        board[i] = merge(board[i]);
      }
      
    }

    if (e.key === "ArrowRight") {
      for (let i = 0; i < 2; i++) {
        board[i] = merge([...board[i]].reverse()).reverse();
      }

    }

    if (e.key === "ArrowUp") {
      for (let j = 0; j < 2; j++) {
        let col = merge([board[0][j], board[1][j]]);
        board[0][j] = col[0];
        board[1][j] = col[1];
      }
     
    }

    if (e.key === "ArrowDown") {
      for (let j = 0; j < 2; j++) {
        let col = merge([board[1][j], board[0][j]]).reverse();
        board[0][j] = col[0];
        board[1][j] = col[1];
      }
      
    }

    if (moved) {
      addRandom();
      draw(document.querySelector(".board"));
      document.getElementById("scoreText").textContent = "Score: " + score;
    }

    // ⭐ 클리어 처리
    if (score >= 16 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 1 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지 가져오기
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}
  }





















function initGame_1_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 250";
gameContainer.appendChild(targetText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  addRandom_1_4();
  addRandom_1_4();
  draw_1_4(boardDiv);

  document.onkeydown = handleKey_1_2;
}

function handleKey_1_2(e) {

  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  let moved = false;

  function merge(arr) {
  let original = [...arr];

  arr = arr.filter(v => v);

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
      let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
      let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
      let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

      arr[i] *= 2;
      score += arr[i] + bonus1 + (bonus5 * 10) + (bonus9 * 100) + (bonus13 * 1000);

      arr[i + 1] = 0;
      i++;
    }
  }

  arr = arr.filter(v => v);
  while (arr.length < 4) arr.push(0);

  if (arr.join() !== original.join()) moved = true;

  return arr;
}

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (moved) {
    addRandom_1_4();
    draw_1_4(document.querySelector(".board"));
    document.getElementById("scoreText").textContent = "Score: " + score;
  }

  // ⭐ 클리어 조건 (250점)
  if (score >= 250 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 10 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

  
}

function initGame_1_3() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 500";
gameContainer.appendChild(targetText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_1_4();
  addRandom_1_4();
  addRandom_1_4();

  draw_1_4(boardDiv);

  document.onkeydown = handleKey_1_3;
}

function handleKey_1_3(e) {

  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  let moved = false;

  function merge(arr) {
  let original = [...arr];

  arr = arr.filter(v => v);

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
      let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
      let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
      let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

      arr[i] *= 2;
      score += arr[i] + bonus1 + (bonus5 * 10) + (bonus9 * 100) + (bonus13 * 1000);

      arr[i + 1] = 0;
      i++;
    }
  }

  arr = arr.filter(v => v);
  while (arr.length < 4) arr.push(0);

  if (arr.join() !== original.join()) moved = true;

  return arr;
}

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (moved) {
  addRandom_1_4();
  addRandom_1_4();
  addRandom_1_4();
    draw_1_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}
    

  // ⭐ 클리어 조건 (500점)
  if (score >= 500 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

function initGame_1_4() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 1000";
gameContainer.appendChild(targetText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_1_4();
  addRandom_1_4();
  addRandom_1_4();
  addRandom_1_4();
  addRandom_1_4();

  draw_1_4(boardDiv);

  document.onkeydown = handleKey_1_4;
}

function addRandom_1_4() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_1_4(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = board[i][j] || "";
      boardDiv.appendChild(cell);
    }
  }
}

function handleKey_1_4(e) {

  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  let moved = false;

 function merge(arr) {
  let original = [...arr];

  arr = arr.filter(v => v);

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
      let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
      let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
      let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

      arr[i] *= 2;
      score += arr[i] + bonus1 + (bonus5 * 10) + (bonus9 * 100) + (bonus13 * 1000);

      arr[i + 1] = 0;
      i++;
    }
  }

  arr = arr.filter(v => v);
  while (arr.length < 4) arr.push(0);

  if (arr.join() !== original.join()) moved = true;

  return arr;
}

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
  }

  if (moved) {
    
    addRandom_1_4();
    addRandom_1_4();
    addRandom_1_4();
    addRandom_1_4();
    addRandom_1_4();
  
  
    draw_1_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}
    

  // ⭐ 클리어 조건 (1000점)
  if (score >= 1000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 50 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}
}

//==================== 2-1  ====================
//==================== 2-1  ====================
//==================== 2-1  ====================
//==================== 2-1  ====================
//==================== 2-1  ====================
//==================== 2-1  ====================

function initGame_2_1() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_2_4(boardDiv);

  document.onkeydown = handleKey_2_1;
  updateSlotUI_2_4();
}

function giveRandomItem2_1() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_2_4();
}

function handleKey_2_1(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
    moveBombs(0, -1);
    moveLasers(0, -1);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
     moveBombs(0, 1);
    moveLasers(0, 1);
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(-1, 0);
    moveLasers(-1, 0);
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(1, 0);
    moveLasers(1, 0);
  }

  if (moved) {
    turnCount--;

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem2_1(); // ⭐ 여기 추가
  }

  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

    draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}



//==2-2==
function initGame_2_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_2_4(boardDiv);

  document.onkeydown = handleKey_2_2;
  updateSlotUI_2_4();
}

function giveRandomItem2_2() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["laser"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_2_4();
}



function handleKey_2_2(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
    moveBombs(0, -1);
    moveLasers(0, -1);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
     moveBombs(0, 1);
    moveLasers(0, 1);
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(-1, 0);
    moveLasers(-1, 0);
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(1, 0);
    moveLasers(1, 0);
  }

  if (moved) {
    turnCount--;

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem2_2(); // ⭐ 여기 추가
  }

  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

    draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

//===2-3===

function initGame_2_3() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_2_4(boardDiv);

  document.onkeydown = handleKey_2_3;
  updateSlotUI_2_4();
}

function giveRandomItem2_3() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_2_4();
}

function handleKey_2_3(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
    moveBombs(0, -1);
    moveLasers(0, -1);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
     moveBombs(0, 1);
    moveLasers(0, 1);
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(-1, 0);
    moveLasers(-1, 0);
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(1, 0);
    moveLasers(1, 0);
  }

  if (moved) {
    turnCount--;

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem2_3(); // ⭐ 여기 추가
  }

  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

    draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}


//=====2-4=====

function initGame_2_4() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_2_4(boardDiv);

  document.onkeydown = handleKey_2_4;
  updateSlotUI_2_4();
}

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_2_4() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem2_4() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_2_4();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb();
  if (type === "laser") spawnLaser();
  if (type === "block") useBlockItem();

  itemSlots[index] = null;

  updateSlotUI_2_4();
  draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= 4 ||
      ny < 0 || ny >= 4 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < 4 && j >= 0 && j < 4) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= 4 ||
      ny < 0 || ny >= 4 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < 4; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < 4; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_2_4() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_2_4(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);

      if (bombHere) {
        cell.textContent = "💣";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_2_4(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[i] *= 2;
        score += arr[i] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
    for (let i = 0; i < 4; i++) board[i] = merge(board[i]);
    moveBombs(0, -1);
    moveLasers(0, -1);
  }

  if (e.key === "ArrowRight") {
    for (let i = 0; i < 4; i++) {
      board[i] = merge([...board[i]].reverse()).reverse();
    }
     moveBombs(0, 1);
    moveLasers(0, 1);
  }

  if (e.key === "ArrowUp") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[0][j], board[1][j], board[2][j], board[3][j]]);
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(-1, 0);
    moveLasers(-1, 0);
  }

  if (e.key === "ArrowDown") {
    for (let j = 0; j < 4; j++) {
      let col = merge([board[3][j], board[2][j], board[1][j], board[0][j]]).reverse();
      for (let i = 0; i < 4; i++) board[i][j] = col[i];
    }
    moveBombs(1, 0);
    moveLasers(1, 0);
  }

  if (moved) {
    turnCount--;

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem2_4(); // ⭐ 여기 추가
  }

  addRandom_2_4();
  addRandom_2_4();
  addRandom_2_4();

    draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

//===================3-1=====================
//===================3-1=====================
//===================3-1=====================

function initGame_3_1() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = []; // {x, y, turn}
  window.shields = []; // {x, y, turn}
  window.curseBombs = []; // {x, y}

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_3_4(boardDiv);

  document.onkeydown = handleKey_3_1;
  updateSlotUI_3_4();
}
//  방 해 요 소

function triggerRandomObstacle_3_1() {
  const types = ["lock"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks();
  
}



function handleKey_3_1(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[i] *= 2;
        score += arr[i] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 0; // 채워질 위치

    for (let j = 0; j < 4; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, -1);
  moveCurseBombs(0, -1); // Left
  moveBombs(0, -1);
  moveLasers(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 3; // 오른쪽부터

    for (let j = 3; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < 3 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, 1);
  moveCurseBombs(0, 1); // Right
  moveBombs(0, 1);
  moveLasers(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 0;

    for (let i = 0; i < 4; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(-1, 0);
  moveCurseBombs(-1, 0); // Up
  moveBombs(-1, 0);
  moveLasers(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 3;

    for (let i = 3; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < 3 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(1, 0);
  moveCurseBombs(1, 0);
  moveBombs(1, 0);
  moveLasers(1, 0);
}

  if (moved) {
    turnCount--;

    updateLocks();
    updateShields();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem3_4(); // ⭐ 여기 추가
    triggerRandomObstacle_3_1();
  }

  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

    draw_3_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

function initGame_3_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = []; // {x, y, turn}
  window.shields = []; // {x, y, turn}
  window.curseBombs = []; // {x, y}

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_3_4(boardDiv);

  document.onkeydown = handleKey_3_2;
  updateSlotUI_3_4();
}
//  방 해 요 소


function triggerRandomObstacle_3_2() {
  const types = ["shield"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "shield") spawnShields();
}



function handleKey_3_2(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[i] *= 2;
        score += arr[i] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 0; // 채워질 위치

    for (let j = 0; j < 4; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, -1);
  moveCurseBombs(0, -1); // Left
  moveBombs(0, -1);
  moveLasers(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 3; // 오른쪽부터

    for (let j = 3; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < 3 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, 1);
  moveCurseBombs(0, 1); // Right
  moveBombs(0, 1);
  moveLasers(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 0;

    for (let i = 0; i < 4; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(-1, 0);
  moveCurseBombs(-1, 0); // Up
  moveBombs(-1, 0);
  moveLasers(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 3;

    for (let i = 3; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < 3 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(1, 0);
  moveCurseBombs(1, 0);
  moveBombs(1, 0);
  moveLasers(1, 0);
}

  if (moved) {
    turnCount--;

    updateLocks();
    updateShields();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem3_4(); // ⭐ 여기 추가
    triggerRandomObstacle_3_2();
  }

  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

    draw_3_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

function initGame_3_3() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = []; // {x, y, turn}
  window.shields = []; // {x, y, turn}
  window.curseBombs = []; // {x, y}

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_3_4(boardDiv);

  document.onkeydown = handleKey_3_3;
  updateSlotUI_3_4();
}
//  방 해 요 소


function triggerRandomObstacle_3_3() {
  const types = ["curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "curseBomb") spawnCurseBomb();
}



function handleKey_3_3(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[i] *= 2;
        score += arr[i] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 0; // 채워질 위치

    for (let j = 0; j < 4; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, -1);
  moveCurseBombs(0, -1); // Left
  moveBombs(0, -1);
  moveLasers(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 3; // 오른쪽부터

    for (let j = 3; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < 3 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, 1);
  moveCurseBombs(0, 1); // Right
  moveBombs(0, 1);
  moveLasers(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 0;

    for (let i = 0; i < 4; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(-1, 0);
  moveCurseBombs(-1, 0); // Up
  moveBombs(-1, 0);
  moveLasers(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 3;

    for (let i = 3; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < 3 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(1, 0);
  moveCurseBombs(1, 0);
  moveBombs(1, 0);
  moveLasers(1, 0);
}

  if (moved) {
    turnCount--;

    updateLocks();
    updateShields();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem3_4(); // ⭐ 여기 추가
    triggerRandomObstacle_3_3();
  }

  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

    draw_3_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}


function initGame_3_4() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = []; // {x, y, turn}
  window.shields = []; // {x, y, turn}
  window.curseBombs = []; // {x, y}

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
targetText.className = "score"; // 같은 스타일 재사용
targetText.style.top = "60px";  // 점수 아래로 내림
targetText.textContent = "목표: 3000";
gameContainer.appendChild(targetText);

const turnText = document.createElement("div");
turnText.className = "score";
turnText.style.top = "100px";
turnText.id = "turnText";
gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = "repeat(4, 80px)";
  boardDiv.style.gridTemplateRows = "repeat(4, 80px)";
  gameContainer.appendChild(boardDiv);

  const itemPanel = document.createElement("div");
itemPanel.style.position = "absolute";
itemPanel.style.right = "50px";
itemPanel.style.top = "150px";
itemPanel.style.display = "flex";
itemPanel.style.flexDirection = "column";
itemPanel.style.gap = "10px";
gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 4x4 보드
  board = Array.from({ length: 4 }, () => Array(4).fill(0));

  
  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

  giveStartItems(); // ⭐ 시작 아이템 지급

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_3_4(boardDiv);

  document.onkeydown = handleKey_3_4;
  updateSlotUI_3_4();
}
//  방 해 요 소

function spawnLocks() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= 4 ||
      ny < 0 || ny >= 4 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb(x, y) {
  for (let j = 0; j < 4; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks();
  if (type === "shield") spawnShields();
  if (type === "curseBomb") spawnCurseBomb();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_3_4() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem3_4() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_3_4();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb();
  if (type === "laser") spawnLaser();
  if (type === "block") useBlockItem();

  itemSlots[index] = null;

  updateSlotUI_3_4();
  draw_2_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= 4 ||
      ny < 0 || ny >= 4 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < 4 && j >= 0 && j < 4) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= 4 ||
        ny < 0 || ny >= 4 ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= 4 ||
      ny < 0 || ny >= 4 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < 4; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < 4; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_3_4() {
  let empty = [];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_3_4(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_3_4(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[i] *= 2;
        score += arr[i] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < 4) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 0; // 채워질 위치

    for (let j = 0; j < 4; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, -1);
  moveCurseBombs(0, -1); // Left
  moveBombs(0, -1);
  moveLasers(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < 4; i++) {

    let newRow = [0, 0, 0, 0];
    let target = 3; // 오른쪽부터

    for (let j = 3; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < 3 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields(0, 1);
  moveCurseBombs(0, 1); // Right
  moveBombs(0, 1);
  moveLasers(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 0;

    for (let i = 0; i < 4; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(-1, 0);
  moveCurseBombs(-1, 0); // Up
  moveBombs(-1, 0);
  moveLasers(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < 4; j++) {

    let newCol = [0, 0, 0, 0];
    let target = 3;

    for (let i = 3; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < 3 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < 4; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields(1, 0);
  moveCurseBombs(1, 0);
  moveBombs(1, 0);
  moveLasers(1, 0);
}

  if (moved) {
    turnCount--;

    updateLocks();
    updateShields();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem3_4(); // ⭐ 여기 추가
    triggerRandomObstacle();
  }

  addRandom_3_4();
  addRandom_3_4();
  addRandom_3_4();

    draw_3_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared) {
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}

























const SIZE = 5;

let timer = 30;
let timerInterval_4_1 = null;
let isTimeOut = false;



function initGame_4_1() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_4_1";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  addRandom_4_1();
  addRandom_4_1();
  addRandom_4_1();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_4_1(boardDiv);

  document.onkeydown = handleKey_4_1;
  updateSlotUI_4_1();
  startTimer();
}

//타이머

function getMaxTimer_4_1() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return 30 + (item16Count * 0.1);
}

function startTimer() {
  clearInterval(timerInterval_4_1);
  timer = getMaxTimer_4_1();
  isTimeOut = false;

  updateTimerUI();

  timerInterval_4_1 = setInterval(() => {
    timer--;

    updateTimerUI();

    if (timer <= 0) {
      clearInterval(timerInterval_4_1);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI() {
  const bar = document.getElementById("timerBar_4_1");
  if (!bar) return;

  let percent =
    (timer / getMaxTimer_4_1()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_4_1() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_4_1() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_4_1(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_4_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_4_1() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_4_1(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_4_1(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_4_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_4_1(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_4_1(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_4_1(x, y) {
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_4_1() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_4_1();
  if (type === "shield") spawnShields_4_1();
  if (type === "curseBomb") spawnCurseBomb_4_1();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_4_1() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem4_1() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_4_1();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_4_1(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_4_1();
  if (type === "laser") spawnLaser_4_1();
  if (type === "block") useBlockItem_4_1();

  itemSlots[index] = null;

  updateSlotUI_4_1();
  draw_4_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_4_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_4_1(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_4_1(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_4_1(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_4_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_4_1(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_4_1(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_4_1(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_4_1() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_4_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_4_1(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_4_1(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_4_1(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_4_1(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_4_1(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = 0; // 채워질 위치

    for (let j = 0; j < SIZE; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_1(0, -1);
  moveCurseBombs_4_1(0, -1); // Left
  moveBombs_4_1(0, -1);
  moveLasers_4_1(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = SIZE - 1; // 오른쪽부터

    for (let j = SIZE - 1; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < SIZE - 1 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_1(0, 1);
  moveCurseBombs_4_1(0, 1); // Right
  moveBombs_4_1(0, 1);
  moveLasers_4_1(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_1(-1, 0);
  moveCurseBombs_4_1(-1, 0); // Up
  moveBombs_4_1(-1, 0);
  moveLasers_4_1(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = SIZE - 1;

    for (let i = SIZE - 1; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < SIZE - 1 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_1(1, 0);
  moveCurseBombs_4_1(1, 0);
  moveBombs_4_1(1, 0);
  moveLasers_4_1(1, 0);
}

  if (moved) {
    timer = getMaxTimer_4_1(); // ⭐ 타이머 풀충전
    updateTimerUI();
    turnCount--;

    updateLocks_4_1();
    updateShields_4_1();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem4_1(); // ⭐ 여기 추가
    triggerRandomObstacle_4_1();
  }

  addRandom_4_1();
  addRandom_4_1();
  addRandom_4_1();

    draw_4_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_4_1);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}











//=======4-2======






let timer_4_2 = 10;
let timerInterval_4_2 = null;




function initGame_4_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_4_2";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  addRandom_4_2();
  addRandom_4_2();
  addRandom_4_2();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_4_2(boardDiv);

  document.onkeydown = handleKey_4_2;
  updateSlotUI_4_2();
  startTimer_4_2();
}

//타이머

function getMaxTimer_4_2() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return 10 + (item16Count * 0.1);
}

function startTimer_4_2() {
  clearInterval(timerInterval_4_2);
  timer_4_2 = getMaxTimer_4_2();
  isTimeOut = false;

  updateTimerUI_4_2();

  timerInterval_4_2 = setInterval(() => {
    timer_4_2--;

    updateTimerUI_4_2();

    if (timer_4_2 <= 0) {
      clearInterval(timerInterval_4_2);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_4_2() {
  const bar = document.getElementById("timerBar_4_2");
  if (!bar) return;

  let percent =
    (timer_4_2 / getMaxTimer_4_2()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_4_2() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_4_2() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_4_2(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_4_2() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_4_2() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_4_2(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_4_2(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_4_2() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_4_2(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_4_2(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_4_2(x, y) {
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_4_2() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_4_2();
  if (type === "shield") spawnShields_4_2();
  if (type === "curseBomb") spawnCurseBomb_4_2();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_4_2() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem4_2() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_4_2();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_4_2(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_4_2();
  if (type === "laser") spawnLaser_4_2();
  if (type === "block") useBlockItem_4_2();

  itemSlots[index] = null;

  updateSlotUI_4_2();
  draw_4_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_4_2() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_4_2(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_4_2(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_4_2(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_4_2() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_4_2(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_4_2(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_4_2(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_4_2() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_4_2() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_4_2(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_4_2(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_4_2(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_4_2(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_4_2(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = 0; // 채워질 위치

    for (let j = 0; j < SIZE; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_2(0, -1);
  moveCurseBombs_4_2(0, -1); // Left
  moveBombs_4_2(0, -1);
  moveLasers_4_2(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = SIZE - 1; // 오른쪽부터

    for (let j = SIZE - 1; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < SIZE - 1 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_2(0, 1);
  moveCurseBombs_4_2(0, 1); // Right
  moveBombs_4_2(0, 1);
  moveLasers_4_2(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_2(-1, 0);
  moveCurseBombs_4_2(-1, 0); // Up
  moveBombs_4_2(-1, 0);
  moveLasers_4_2(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = SIZE - 1;

    for (let i = SIZE - 1; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < SIZE - 1 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_2(1, 0);
  moveCurseBombs_4_2(1, 0);
  moveBombs_4_2(1, 0);
  moveLasers_4_2(1, 0);
}

  if (moved) {
    timer_4_2 = getMaxTimer_4_2(); // ⭐ 타이머 풀충전
    updateTimerUI_4_2();
    turnCount--;

    updateLocks_4_2();
    updateShields_4_2();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem4_2(); // ⭐ 여기 추가
    triggerRandomObstacle_4_2();
  }

  addRandom_4_2();
  addRandom_4_2();
  addRandom_4_2();

    draw_4_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_4_2);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}













//==========4-3============










let timer4_3 = 0;
let timerInterval_4_3 = null;




function initGame_4_3() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_4_3";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  addRandom_4_3();
  addRandom_4_3();
  addRandom_4_3();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_4_3(boardDiv);

  document.onkeydown = handleKey_4_3;
  updateSlotUI_4_3();
  startTimer4_3();
}

//타이머

function getMaxTimer_4_3() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return 0 + (item16Count * 0.1);
}

function startTimer4_3() {
  clearInterval(timerInterval_4_3);
  timer4_3 = getMaxTimer_4_3();
  isTimeOut = false;

  updateTimerUI4_3();

  timerInterval_4_3 = setInterval(() => {
    timer4_3--;

    updateTimerUI4_3();

    if (timer4_3 <= 0) {
      clearInterval(timerInterval_4_3);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI4_3() {
  const bar = document.getElementById("timerBar_4_3");
  if (!bar) return;

  let percent =
    (timer4_3 / getMaxTimer_4_3()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_4_3() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_4_3() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_4_3(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_4_3() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_4_3() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_4_3(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_4_3(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_4_3() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_4_3(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_4_3(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_4_3(x, y) {
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_4_3() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_4_3();
  if (type === "shield") spawnShields_4_3();
  if (type === "curseBomb") spawnCurseBomb_4_3();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_4_3() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem4_3() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_4_3();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_4_3(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_4_3();
  if (type === "laser") spawnLaser_4_3();
  if (type === "block") useBlockItem_4_3();

  itemSlots[index] = null;

  updateSlotUI_4_3();
  draw_4_3(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_4_3() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_4_3(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_4_3(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_4_3(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_4_3() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_4_3(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_4_3(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_4_3(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_4_3() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_4_3() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_4_3(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_4_3(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_4_3(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_4_3(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_4_3(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = 0; // 채워질 위치

    for (let j = 0; j < SIZE; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_3(0, -1);
  moveCurseBombs_4_3(0, -1); // Left
  moveBombs_4_3(0, -1);
  moveLasers_4_3(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = SIZE - 1; // 오른쪽부터

    for (let j = SIZE - 1; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < SIZE - 1 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_3(0, 1);
  moveCurseBombs_4_3(0, 1); // Right
  moveBombs_4_3(0, 1);
  moveLasers_4_3(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_3(-1, 0);
  moveCurseBombs_4_3(-1, 0); // Up
  moveBombs_4_3(-1, 0);
  moveLasers_4_3(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = SIZE - 1;

    for (let i = SIZE - 1; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < SIZE - 1 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_3(1, 0);
  moveCurseBombs_4_3(1, 0);
  moveBombs_4_3(1, 0);
  moveLasers_4_3(1, 0);
}

  if (moved) {
    timer4_3 = getMaxTimer_4_3(); // ⭐ 타이머 풀충전
    updateTimerUI4_3();
    turnCount--;

    updateLocks_4_3();
    updateShields_4_3();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem4_3(); // ⭐ 여기 추가
    triggerRandomObstacle_4_3();
  }

  addRandom_4_3();
  addRandom_4_3();
  addRandom_4_3();

    draw_4_3(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_4_3);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}










//=========4-4==========









let timer4_4 = -5;
let timerInterval_4_4 = null;




function initGame_4_4() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_4_4";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  addRandom_4_4();
  addRandom_4_4();
  addRandom_4_4();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_4_4(boardDiv);

  document.onkeydown = handleKey_4_4;
  updateSlotUI_4_4();
  startTimer_4_4();
}

//타이머

function getMaxTimer_4_4() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return -5 + (item16Count * 0.1);
}

function startTimer_4_4() {
  clearInterval(timerInterval_4_4);
  timer4_4 = getMaxTimer_4_4();
  isTimeOut = false;

  updateTimerUI_4_4();

  timerInterval_4_4 = setInterval(() => {
    timer4_4--;

    updateTimerUI_4_4();

    if (timer4_4 <= 0) {
      clearInterval(timerInterval_4_4);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_4_4() {
  const bar = document.getElementById("timerBar_4_4");
  if (!bar) return;

  let percent =
    (timer4_4 / getMaxTimer_4_4()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_4_4() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_4_4() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_4_4(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_4_4() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_4_4() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_4_4(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_4_4(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_4_4() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_4_4(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_4_4(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_4_4(x, y) {
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_4_4() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_4_4();
  if (type === "shield") spawnShields_4_4();
  if (type === "curseBomb") spawnCurseBomb_4_4();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_4_4() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem4_4() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_4_4();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_4_4(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_4_4();
  if (type === "laser") spawnLaser_4_4();
  if (type === "block") useBlockItem_4_4();

  itemSlots[index] = null;

  updateSlotUI_4_4();
  draw_4_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_4_4() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_4_4(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_4_4(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_4_4(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_4_4() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_4_4(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_4_4(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_4_4(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_4_4() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_4_4() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_4_4(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_4_4(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_4_4(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_4_4(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_4_4(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = 0; // 채워질 위치

    for (let j = 0; j < SIZE; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_4(0, -1);
  moveCurseBombs_4_4(0, -1); // Left
  moveBombs_4_4(0, -1);
  moveLasers_4_4(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE; i++) {

    let newRow = Array(SIZE).fill(0);
    let target = SIZE - 1; // 오른쪽부터

    for (let j = SIZE - 1; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < SIZE - 1 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields_4_4(0, 1);
  moveCurseBombs_4_4(0, 1); // Right
  moveBombs_4_4(0, 1);
  moveLasers_4_4(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = 0;

    for (let i = 0; i < SIZE; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_4(-1, 0);
  moveCurseBombs_4_4(-1, 0); // Up
  moveBombs_4_4(-1, 0);
  moveLasers_4_4(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE; j++) {

    let newCol = Array(SIZE).fill(0);
    let target = SIZE - 1;

    for (let i = SIZE - 1; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < SIZE - 1 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1] + getBonus();
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < SIZE; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_4_4(1, 0);
  moveCurseBombs_4_4(1, 0);
  moveBombs_4_4(1, 0);
  moveLasers_4_4(1, 0);
}

  if (moved) {
    timer4_4 = getMaxTimer_4_4(); // ⭐ 타이머 풀충전
    updateTimerUI_4_4();
    turnCount--;

    updateLocks_4_4();
    updateShields_4_4();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem4_4(); // ⭐ 여기 추가
    triggerRandomObstacle_4_4();
  }

  addRandom_4_4();
  addRandom_4_4();
  addRandom_4_4();

    draw_4_4(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_4_4);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}






//==========5-1===========



let timer5_1 = -20;
let timerInterval_5_1 = null;




function initGame_5_1() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_5_1";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  window.holeLocks = [];
  createHoleLocks_5_1();

  addRandom_5_1();
  addRandom_5_1();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_5_1(boardDiv);

  document.onkeydown = handleKey_5_1;
  updateSlotUI_5_1();
  startTimer_5_1();
}


function isBlocked_5_1(x, y) {
  return isHole_5_1(x, y) || isLocked_5_1(x, y);
}


function createHoleLocks_5_1() {
  holeLocks.push(
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 1 },
    { x: 2, y: 3 }
  );
}

function isHole_5_1(x, y) {
  return holeLocks.some(h => h.x === x && h.y === y);
}

//타이머

function getMaxTimer_5_1() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return -20 + (item16Count * 0.1);
}

function startTimer_5_1() {
  clearInterval(timerInterval_5_1);
  timer5_1 = getMaxTimer_5_1();
  isTimeOut = false;

  updateTimerUI_5_1();

  timerInterval_5_1 = setInterval(() => {
    timer5_1--;

    updateTimerUI_5_1();

    if (timer5_1 <= 0) {
      clearInterval(timerInterval_5_1);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_5_1() {
  const bar = document.getElementById("timerBar_5_1");
  if (!bar) return;

  let percent =
    (timer5_1 / getMaxTimer_5_1()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_5_1() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_5_1() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_5_1(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_5_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_5_1() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_5_1(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_5_1(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_5_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_5_1(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_5_1(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_5_1(x, y) {
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_5_1() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_5_1();
  if (type === "shield") spawnShields_5_1();
  if (type === "curseBomb") spawnCurseBomb_5_1();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_5_1() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem5_1() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_5_1();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_5_1(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_5_1();
  if (type === "laser") spawnLaser_5_1();
  if (type === "block") useBlockItem_5_1();

  itemSlots[index] = null;

  updateSlotUI_5_1();
  draw_5_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_5_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_5_1(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_5_1(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_5_1(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_5_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_5_1(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE ||
        ny < 0 || ny >= SIZE ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE ||
      ny < 0 || ny >= SIZE ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_5_1(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_5_1(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_5_1() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_5_1() {
  let empty = [];

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0 && !isHole_5_1(i, j)) {
      empty.push([i, j]);
      }
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_5_1(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);
      let holeHere = isHole_5_1(i, j);

      if (holeHere) {  
        cell.textContent = "";
        cell.style.background = "#81d4fa";
      } else if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      } 

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_5_1(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_5_1(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_5_1(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_5_1(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  function slideAndMergeLine(line, blockCheck) {
  let result = [...line];
  const SIZE = line.length;

  function processSegment(start, end) {
    let values = [];

    for (let i = start; i <= end; i++) {
      if (result[i] !== 0) values.push(result[i]);
      result[i] = 0;
    }

    let merged = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        let newValue = values[i] * 2;
        merged.push(newValue);
        score += newValue + getBonus();
        i++;
      } else {
        merged.push(values[i]);
      }
    }

    for (let i = 0; i < merged.length; i++) {
      result[start + i] = merged[i];
    }
  }

  let start = 0;

  for (let i = 0; i <= SIZE; i++) {
    if (i === SIZE || blockCheck(i)) {
      if (start <= i - 1) {
        processSegment(start, i - 1);
      }
      start = i + 1;
    }
  }

  return result;
}

function changedLine(a, b) {
  return a.join() !== b.join();
}

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE; i++) {
    let oldRow = [...board[i]];

    let newRow = slideAndMergeLine(oldRow, index => {
      return isHole_5_1(i, index) ||
             isLocked_5_1(i, index);
    });

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_5_1(0, -1);
  moveCurseBombs_5_1(0, -1);
  moveBombs_5_1(0, -1);
  moveLasers_5_1(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE; i++) {
    let oldRow = [...board[i]];
    let reversed = [...oldRow].reverse();

    let newRow = slideAndMergeLine(reversed, index => {
      return isHole_5_1(i, SIZE - 1 - index) ||
             isLocked_5_1(i, SIZE - 1 - index);
    }).reverse();

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_5_1(0, 1);
  moveCurseBombs_5_1(0, 1);
  moveBombs_5_1(0, 1);
  moveLasers_5_1(0, 1);
}

 if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE; j++) {
    let col = [];

    for (let i = 0; i < SIZE; i++) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_5_1(index, j) ||
             isLocked_5_1(index, j);
    });

    for (let i = 0; i < SIZE; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_5_1(-1, 0);
  moveCurseBombs_5_1(-1, 0);
  moveBombs_5_1(-1, 0);
  moveLasers_5_1(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE; j++) {
    let col = [];

    for (let i = SIZE - 1; i >= 0; i--) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_5_1(SIZE - 1 - index, j) ||
             isLocked_5_1(SIZE - 1 - index, j);
    });

    newCol.reverse();

    for (let i = 0; i < SIZE; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_5_1(1, 0);
  moveCurseBombs_5_1(1, 0);
  moveBombs_5_1(1, 0);
  moveLasers_5_1(1, 0);
}

  if (moved) {
    timer5_1 = getMaxTimer_5_1(); // ⭐ 타이머 풀충전
    updateTimerUI_5_1();
    turnCount--;

    updateLocks_5_1();
    updateShields_5_1();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem5_1(); // ⭐ 여기 추가
    triggerRandomObstacle_5_1();
  }

  addRandom_5_1();
  addRandom_5_1();

    draw_5_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_5_1);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}










//==========5-2===========


const SIZE_5_2 = 6;
let timer5_2 = -20;
let timerInterval_5_2 = null;




function initGame_5_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${SIZE_5_2}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${SIZE_5_2}, 80px)`;

  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${SIZE_5_2 * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_5_2";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE_5_2 }, () => Array(SIZE_5_2).fill(0));

  window.holeLocks = [];
  createHoleLocks_5_2();

  addRandom_5_2();
  addRandom_5_2();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_5_2(boardDiv);

  document.onkeydown = handleKey_5_2;
  updateSlotUI_5_2();
  startTimer_5_2();
}


function createHoleLocks_5_2() {
  holeLocks.push(
    { x: 0, y: 0 },
    { x: 1, y: 1 },

    { x: 0, y: 5 },
    { x: 1, y: 4 },

    { x: 5, y: 0 },
    { x: 4, y: 1 },

    { x: 5, y: 5 },
    { x: 4, y: 4 }
  );
}

function isHole_5_2(x, y) {
  return holeLocks.some(h => h.x === x && h.y === y);
}

//타이머

function getMaxTimer_5_2() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return -20 + (item16Count * 0.1);
}

function startTimer_5_2() {
  clearInterval(timerInterval_5_2);
  timer5_2 = getMaxTimer_5_2();
  isTimeOut = false;

  updateTimerUI_5_2();

  timerInterval_5_2 = setInterval(() => {
    timer5_2--;

    updateTimerUI_5_2();

    if (timer5_2 <= 0) {
      clearInterval(timerInterval_5_2);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_5_2() {
  const bar = document.getElementById("timerBar_5_2");
  if (!bar) return;

  let percent =
    (timer5_2 / getMaxTimer_5_2()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_5_2() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_5_2() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_5_2(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_5_2() {
  let empty = [];

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_5_2() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_5_2(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_5_2(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_5_2 ||
        ny < 0 || ny >= SIZE_5_2 ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_5_2() {
  let empty = [];

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_5_2(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_5_2 ||
        ny < 0 || ny >= SIZE_5_2 ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_5_2 ||
      ny < 0 || ny >= SIZE_5_2 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_5_2(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_5_2(x, y) {
  for (let j = 0; j < SIZE_5_2; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_5_2() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_5_2();
  if (type === "shield") spawnShields_5_2();
  if (type === "curseBomb") spawnCurseBomb_5_2();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_5_2() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem5_2() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_5_2();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_5_2(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_5_2();
  if (type === "laser") spawnLaser_5_2();
  if (type === "block") useBlockItem_5_2();

  itemSlots[index] = null;

  updateSlotUI_5_2();
  draw_5_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_5_2() {
  let empty = [];

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_5_2(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_5_2 ||
        ny < 0 || ny >= SIZE_5_2 ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_5_2 ||
      ny < 0 || ny >= SIZE_5_2 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_5_2(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_5_2(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE_5_2 && j >= 0 && j < SIZE_5_2) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_5_2() {
  let empty = [];

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_5_2(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_5_2 ||
        ny < 0 || ny >= SIZE_5_2 ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_5_2 ||
      ny < 0 || ny >= SIZE_5_2 ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_5_2(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_5_2(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE_5_2; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE_5_2; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_5_2() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_5_2() {
  let empty = [];

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      if (board[i][j] === 0 && !isHole_5_2(i, j)) {
      empty.push([i, j]);
      }
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  // ⭐ 아이템 효과 그대로 적용
  if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }
  if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } 
  if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } 
  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } 

  board[x][y] = value;
}

function draw_5_2(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE_5_2; i++) {
    for (let j = 0; j < SIZE_5_2; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);
      let holeHere = isHole_5_2(i, j);

      if (holeHere) {  
        cell.textContent = "";
        cell.style.background = "#81d4fa";
      } else if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      } 

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function handleKey_5_2(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_5_2(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_5_2(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_5_2(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE_5_2) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  function slideAndMergeLine(line, blockCheck) {
  let result = [...line];
  const SIZE = line.length;

  function processSegment(start, end) {
    let values = [];

    for (let i = start; i <= end; i++) {
      if (result[i] !== 0) values.push(result[i]);
      result[i] = 0;
    }

    let merged = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        let newValue = values[i] * 2;
        merged.push(newValue);
        score += newValue + getBonus();
        i++;
      } else {
        merged.push(values[i]);
      }
    }

    for (let i = 0; i < merged.length; i++) {
      result[start + i] = merged[i];
    }
  }

  let start = 0;

  for (let i = 0; i <= SIZE; i++) {
    if (i === SIZE || blockCheck(i)) {
      if (start <= i - 1) {
        processSegment(start, i - 1);
      }
      start = i + 1;
    }
  }

  return result;
}

function changedLine(a, b) {
  return a.join() !== b.join();
}

 if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE_5_2; i++) {
    let oldRow = [...board[i]];

    let newRow = slideAndMergeLine(oldRow, index => {
      return isHole_5_2(i, index) ||
             isLocked_5_2(i, index);
    });

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_5_2(0, -1);
  moveCurseBombs_5_2(0, -1);
  moveBombs_5_2(0, -1);
  moveLasers_5_2(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE_5_2; i++) {
    let oldRow = [...board[i]];
    let reversed = [...oldRow].reverse();

    let newRow = slideAndMergeLine(reversed, index => {
      return isHole_5_2(i, SIZE_5_2 - 1 - index) ||
             isLocked_5_2(i, SIZE_5_2 - 1 - index);
    }).reverse();

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_5_2(0, 1);
  moveCurseBombs_5_2(0, 1);
  moveBombs_5_2(0, 1);
  moveLasers_5_2(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE_5_2; j++) {
    let col = [];

    for (let i = 0; i < SIZE_5_2; i++) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_5_2(index, j) ||
             isLocked_5_2(index, j);
    });

    for (let i = 0; i < SIZE_5_2; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_5_2(-1, 0);
  moveCurseBombs_5_2(-1, 0);
  moveBombs_5_2(-1, 0);
  moveLasers_5_2(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE_5_2; j++) {
    let col = [];

    for (let i = SIZE_5_2 - 1; i >= 0; i--) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_5_2(SIZE_5_2 - 1 - index, j) ||
             isLocked_5_2(SIZE_5_2 - 1 - index, j);
    });

    newCol.reverse();

    for (let i = 0; i < SIZE_5_2; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_5_2(1, 0);
  moveCurseBombs_5_2(1, 0);
  moveBombs_5_2(1, 0);
  moveLasers_5_2(1, 0);
}

  if (moved) {
    timer5_2 = getMaxTimer_5_2(); // ⭐ 타이머 풀충전
    updateTimerUI_5_2();
    turnCount--;

    updateLocks_5_2();
    updateShields_5_2();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem5_2(); // ⭐ 여기 추가
    triggerRandomObstacle_5_2();
  }

  addRandom_5_2();
  addRandom_5_2();

    draw_5_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_5_2);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}










//==========6-1===========


const ROWS_6_1 = 7;
const COLS_6_1 = 11;
let timer6_1 = -50;
let timerInterval_6_1 = null;




function initGame_6_1() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${COLS_6_1}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${ROWS_6_1}, 80px)`;


  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${COLS_6_1 * 80}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_6_1";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  
board = Array.from({ length: ROWS_6_1 }, () =>
  Array(COLS_6_1).fill(0)
);
  window.holeLocks = [];
 

  addRandom_6_1();
  addRandom_6_1();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_6_1(boardDiv);

  document.onkeydown = handleKey_6_1;
  updateSlotUI_6_1();
  startTimer_6_1();
}


function isHole_6_1(x, y) {
  // 7x11 기준 중앙은 (3, 5)

  // 가운데 5x5 범위
  const inCenter5x5 =
    x >= 1 && x <= 5 &&
    y >= 3 && y <= 7;

  // 가운데 3x3 범위
  const inCenter3x3 =
    x >= 2 && x <= 4 &&
    y >= 4 && y <= 6;

  // 5x5 안에 있으면서 3x3 밖이면 구멍
  return inCenter5x5 && !inCenter3x3;
}

let board_6_1 = [];

function createBoard_6_1() {
  board_6_1 = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    board_6_1[i] = [];

    for (let j = 0; j < COLS_6_1; j++) {
      board_6_1[i][j] = 0;
    }
  }
}

//타이머

function getMaxTimer_6_1() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return -50 + (item16Count * 0.1);
}

function startTimer_6_1() {
  clearInterval(timerInterval_6_1);
  timer6_1 = getMaxTimer_6_1();
  isTimeOut = false;

  updateTimerUI_6_1();

  timerInterval_6_1 = setInterval(() => {
    timer6_1--;

    updateTimerUI_6_1();

    if (timer6_1 <= 0) {
      clearInterval(timerInterval_6_1);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_6_1() {
  const bar = document.getElementById("timerBar_6_1");
  if (!bar) return;

  let percent =
    (timer6_1 / getMaxTimer_6_1()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_6_1() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (
        board[i][j] > 0 &&
         !isHole_6_1(i, j) &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_6_1() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_6_1(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_6_1() {
  let empty = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_1(i, j) &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_6_1() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_6_1(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_6_1(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_1 ||
        ny < 0 || ny >= COLS_6_1 ||
        isHole_6_1(nx, ny) ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_6_1() {
  let empty = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (
        board[i][j] === 0 &&
         !isHole_6_1(i, j) &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_6_1(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_1 ||
        ny < 0 || ny >= COLS_6_1 ||
         isHole_6_1(nx, ny) ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_1 ||
      ny < 0 || ny >= COLS_6_1 ||
       isHole_6_1(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_6_1(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_6_1(x, y) {
  for (let j = 0; j < COLS_6_1; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_6_1() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_6_1();
  if (type === "shield") spawnShields_6_1();
  if (type === "curseBomb") spawnCurseBomb_6_1();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_6_1() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem6_1() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_6_1();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_6_1(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_6_1();
  if (type === "laser") spawnLaser_6_1();
  if (type === "block") useBlockItem_6_1();

  itemSlots[index] = null;

  updateSlotUI_6_1();
  draw_6_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_6_1() {
  let empty = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_1(i, j) &&
        !bombs.some(b => b.x === i && b.y === j)
        ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_6_1(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_1 ||
        ny < 0 || ny >= COLS_6_1 ||
         isHole_6_1(nx, ny) ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_1 ||
      ny < 0 || ny >= COLS_6_1 ||
       isHole_6_1(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_6_1(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_6_1(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < ROWS_6_1 && j >= 0 && j < COLS_6_1) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_6_1() {
  let empty = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_1(i, j) &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_6_1(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_1 ||
        ny < 0 || ny >= COLS_6_1 ||
         isHole_6_1(nx, ny) ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_1 ||
      ny < 0 || ny >= COLS_6_1 ||
       isHole_6_1(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_6_1(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_6_1(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < COLS_6_1; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < ROWS_6_1; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_6_1() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_6_1() {
  let empty = [];

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      if (board[i][j] === 0 && !isHole_6_1(i, j)) {
        empty.push([i, j]);
      }
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } else if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } else if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } else if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }

  board[x][y] = value;
}

function draw_6_1(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < ROWS_6_1; i++) {
    for (let j = 0; j < COLS_6_1; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j);
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);
      let holeHere = isHole_6_1(i, j);

      if (holeHere) {
        cell.textContent = "";
        cell.style.background = "#81d4fa";
      } else if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }

  updateTurnUI();
}

function handleKey_6_1(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_6_1(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_6_1(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_6_1(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < COLS_6_1) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  function slideAndMergeLine(line, blockCheck) {
  let result = [...line];
  const SIZE = line.length;

  function processSegment(start, end) {
    let values = [];

    for (let i = start; i <= end; i++) {
      if (result[i] !== 0) values.push(result[i]);
      result[i] = 0;
    }

    let merged = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        let newValue = values[i] * 2;
        merged.push(newValue);
        score += newValue + getBonus();
        i++;
      } else {
        merged.push(values[i]);
      }
    }

    for (let i = 0; i < merged.length; i++) {
      result[start + i] = merged[i];
    }
  }

  let start = 0;

  for (let i = 0; i <= SIZE; i++) {
    if (i === SIZE || blockCheck(i)) {
      if (start <= i - 1) {
        processSegment(start, i - 1);
      }
      start = i + 1;
    }
  }

  return result;
}

function changedLine(a, b) {
  return a.join() !== b.join();
}

 if (e.key === "ArrowLeft") {
  for (let i = 0; i < ROWS_6_1; i++) {
    let oldRow = [...board[i]];

    let newRow = slideAndMergeLine(oldRow, index => {
      return isHole_6_1(i, index) ||
             isLocked_6_1(i, index);
    });

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_6_1(0, -1);
  moveCurseBombs_6_1(0, -1);
  moveBombs_6_1(0, -1);
  moveLasers_6_1(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < ROWS_6_1; i++) {
    let oldRow = [...board[i]];
    let reversed = [...oldRow].reverse();

    let newRow = slideAndMergeLine(reversed, index => {
      return isHole_6_1(i, COLS_6_1 - 1 - index) ||
             isLocked_6_1(i, COLS_6_1 - 1 - index);
    }).reverse();

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_6_1(0, 1);
  moveCurseBombs_6_1(0, 1);
  moveBombs_6_1(0, 1);
  moveLasers_6_1(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < COLS_6_1; j++) {
    let col = [];

    for (let i = 0; i < ROWS_6_1; i++) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_6_1(index, j) ||
             isLocked_6_1(index, j);
    });

    for (let i = 0; i < ROWS_6_1; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_6_1(-1, 0);
  moveCurseBombs_6_1(-1, 0);
  moveBombs_6_1(-1, 0);
  moveLasers_6_1(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < COLS_6_1; j++) {
    let col = [];

    for (let i = ROWS_6_1 - 1; i >= 0; i--) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_6_1(ROWS_6_1 - 1 - index, j) ||
             isLocked_6_1(ROWS_6_1 - 1 - index, j);
    });

    newCol.reverse();

    for (let i = 0; i < ROWS_6_1; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_6_1(1, 0);
  moveCurseBombs_6_1(1, 0);
  moveBombs_6_1(1, 0);
  moveLasers_6_1(1, 0);
}

  if (moved) {
    timer6_1 = getMaxTimer_6_1(); // ⭐ 타이머 풀충전
    updateTimerUI_6_1();
    turnCount--;

    updateLocks_6_1();
    updateShields_6_1();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem6_1(); // ⭐ 여기 추가
    triggerRandomObstacle_6_1();
  }

  addRandom_6_1();
  addRandom_6_1();

    draw_6_1(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_6_1);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}














//==========6-2===========

const CELL_6_2 = 70;
const ROWS_6_2 = 9;
const COLS_6_2 = 8;
let timer6_2 = -50;
let timerInterval_6_2 = null;

const MAP_6_2 = [
  [0,0,0,0,1,1,0,0],
  [0,0,1,1,1,0,0,0],
  [0,1,1,1,0,0,0,0],
  [0,1,1,0,0,0,1,1],
  [1,1,1,0,0,0,1,1],
  [0,1,1,0,0,0,0,0],
  [0,1,1,1,0,0,0,1],
  [0,0,1,1,1,1,1,1],
  [0,0,0,0,1,1,0,0]
];


function initGame_6_2() {
  document.onkeydown = null;

  gameContainer.innerHTML = "";
  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs = [createSlot(), createSlot(), createSlot()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.className = "score";
  scoreText.id = "scoreText";
  scoreText.textContent = "Score: 0";
  gameContainer.appendChild(scoreText);

  const targetText = document.createElement("div");
  targetText.className = "score";
  targetText.style.top = "60px";
  targetText.textContent = "목표: 3000";
  gameContainer.appendChild(targetText);

  const turnText = document.createElement("div");
  turnText.className = "score";
  turnText.style.top = "100px";
  turnText.id = "turnText";
  gameContainer.appendChild(turnText);

  const clearText = document.createElement("div");
  clearText.id = "clearText";
  clearText.style.cssText = `
    position:fixed;
    top:50%; left:50%;
    transform:translate(-50%,-50%);
    font-size:40px;
    font-weight:bold;
    color:#2e7d32;
    display:none;
  `;
  gameContainer.appendChild(clearText);

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
  const boardWrapper = document.createElement("div");
  boardWrapper.style.display = "flex";
  boardWrapper.style.flexDirection = "column"; // ⭐ 세로 정렬 핵심
  boardWrapper.style.alignItems = "center";
  boardWrapper.style.marginTop = "150px";

  gameContainer.appendChild(boardWrapper);

  // ⭐ 보드
  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${COLS_6_2}, ${CELL_6_2}px)`;
  boardDiv.style.gridTemplateRows = `repeat(${ROWS_6_2}, ${CELL_6_2}px)`;
  boardDiv.style.gap = "1px";


  // ⭐ 타이머 바
  const timerBarContainer = document.createElement("div");
  timerBarContainer.style.width = `${COLS_6_2 * CELL_6_2}px`;
  timerBarContainer.style.height = "20px";
  timerBarContainer.style.background = "#ccc";
  timerBarContainer.style.marginTop = "50px";

  const timerBar = document.createElement("div");
timerBar.id = "timerBar_6_2";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 1s linear";

timerBarContainer.appendChild(timerBar);

  // ✅ ⭐ 여기 핵심 (wrapper 안에 넣기)
  boardWrapper.appendChild(boardDiv);
  boardWrapper.appendChild(timerBarContainer);

  // ⭐ 아이템 패널
  const itemPanel = document.createElement("div");
  itemPanel.style.position = "absolute";
  itemPanel.style.right = "50px";
  itemPanel.style.top = "150px";
  itemPanel.style.display = "flex";
  itemPanel.style.flexDirection = "column";
  itemPanel.style.gap = "10px";
  gameContainer.appendChild(itemPanel);

  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);

  // ⭐ 보드 생성
  
board = Array.from({ length: ROWS_6_2 }, () =>
  Array(COLS_6_2).fill(0)
);
  window.holeLocks = [];
 

  addRandom_6_2();
  addRandom_6_2();

  giveStartItems();

  slotDivs.forEach(d => itemPanel.appendChild(d));

  draw_6_2(boardDiv);

  document.onkeydown = handleKey_6_2;
  updateSlotUI_6_2();
  startTimer_6_2();
}


function isHole_6_2(x, y) {
  return MAP_6_2[x][y] === 0;
}

let board_6_2 = [];

function createBoard_6_2() {
  board_6_2 = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    board_6_2[i] = [];

    for (let j = 0; j < COLS_6_2; j++) {
      board_6_2[i][j] = 0;
    }
  }
}

//타이머

function getMaxTimer_6_2() {
  let item16Count =
      Number(localStorage.getItem("item16Count")) || 0;

  return -50 + (item16Count * 0.1);
}

function startTimer_6_2() {
  clearInterval(timerInterval_6_2);
  timer6_2 = getMaxTimer_6_2();
  isTimeOut = false;

  updateTimerUI_6_2();

  timerInterval_6_2 = setInterval(() => {
    timer6_2--;

    updateTimerUI_6_2();

    if (timer6_2 <= 0) {
      clearInterval(timerInterval_6_2);
      isTimeOut = true;
      handleTimeOut();
    }
  }, 1000);
}


function updateTimerUI_6_2() {
  const bar = document.getElementById("timerBar_6_2");
  if (!bar) return;

  let percent =
    (timer6_2 / getMaxTimer_6_2()) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut() {
  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null; // 입력 막기
}


//  방 해 요 소

function spawnLocks_6_2() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (
        board[i][j] > 0 &&
         !isHole_6_2(i, j) &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks_6_2() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked_6_2(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_6_2() {
  let empty = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_2(i, j) &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields_6_2() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield_6_2(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_6_2(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_2 ||
        ny < 0 || ny >= COLS_6_2 ||
        isHole_6_2(nx, ny) ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_6_2() {
  let empty = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (
        board[i][j] === 0 &&
         !isHole_6_2(i, j) &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_6_2(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_2 ||
        ny < 0 || ny >= COLS_6_2 ||
         isHole_6_2(nx, ny) ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_2 ||
      ny < 0 || ny >= COLS_6_2 ||
       isHole_6_2(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_6_2(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_6_2(x, y) {
  for (let j = 0; j < COLS_6_2; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_6_2() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_6_2();
  if (type === "shield") spawnShields_6_2();
  if (type === "curseBomb") spawnCurseBomb_6_2();
}



// 아 이 템

function giveStartItems() {
  if (localStorage.getItem("item11")) addItemToSlot("bomb");
  if (localStorage.getItem("item12")) addItemToSlot("laser");
  if (localStorage.getItem("item15")) addItemToSlot("block");
}

function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_6_2() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem6_2() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_6_2();
}

function createSlot() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_6_2(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_6_2();
  if (type === "laser") spawnLaser_6_2();
  if (type === "block") useBlockItem_6_2();

  itemSlots[index] = null;

  updateSlotUI_6_2();
  draw_6_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
}

function spawnBomb_6_2() {
  let empty = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_2(i, j) &&
        !bombs.some(b => b.x === i && b.y === j)
        ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_6_2(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_2 ||
        ny < 0 || ny >= COLS_6_2 ||
         isHole_6_2(nx, ny) ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_2 ||
      ny < 0 || ny >= COLS_6_2 ||
       isHole_6_2(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_6_2(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_6_2(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < ROWS_6_2 && j >= 0 && j < COLS_6_2) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_6_2() {
  let empty = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (
        board[i][j] === 0 &&
        !isHole_6_2(i, j) &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_6_2(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= ROWS_6_2 ||
        ny < 0 || ny >= COLS_6_2 ||
         isHole_6_2(nx, ny) ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= ROWS_6_2 ||
      ny < 0 || ny >= COLS_6_2 ||
       isHole_6_2(nx, ny) ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_6_2(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_6_2(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < COLS_6_2; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < ROWS_6_2; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_6_2() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_6_2() {
  let empty = [];

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      if (board[i][j] === 0 && !isHole_6_2(i, j)) {
        empty.push([i, j]);
      }
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;

  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } else if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } else if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } else if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }

  board[x][y] = value;
}

function draw_6_2(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < ROWS_6_2; i++) {
    for (let j = 0; j < COLS_6_2; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.style.width = `${CELL_6_2}px`;
      cell.style.height = `${CELL_6_2}px`;
      cell.style.fontSize = "24px";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j);
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);
      let holeHere = isHole_6_2(i, j);

      if (holeHere) {
        cell.textContent = "";
        cell.style.background = "#81d4fa";
      } else if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }

  updateTurnUI();
}

function handleKey_6_2(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_6_2(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_6_2(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_6_2(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        let bonus1 = Number(localStorage.getItem("item1Count")) || 0;
        let bonus5 = Number(localStorage.getItem("item5Count")) || 0;
        let bonus9 = Number(localStorage.getItem("item9Count")) || 0;
        let bonus13 = Number(localStorage.getItem("item13Count")) || 0;

        arr[0] *= 2;
        score += arr[0] + bonus1 + (bonus5*10) + (bonus9*100) + (bonus13*1000);
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < COLS_6_2) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  function slideAndMergeLine(line, blockCheck) {
  let result = [...line];
  const SIZE = line.length;

  function processSegment(start, end) {
    let values = [];

    for (let i = start; i <= end; i++) {
      if (result[i] !== 0) values.push(result[i]);
      result[i] = 0;
    }

    let merged = [];

    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        let newValue = values[i] * 2;
        merged.push(newValue);
        score += newValue + getBonus();
        i++;
      } else {
        merged.push(values[i]);
      }
    }

    for (let i = 0; i < merged.length; i++) {
      result[start + i] = merged[i];
    }
  }

  let start = 0;

  for (let i = 0; i <= SIZE; i++) {
    if (i === SIZE || blockCheck(i)) {
      if (start <= i - 1) {
        processSegment(start, i - 1);
      }
      start = i + 1;
    }
  }

  return result;
}

function changedLine(a, b) {
  return a.join() !== b.join();
}

 if (e.key === "ArrowLeft") {
  for (let i = 0; i < ROWS_6_2; i++) {
    let oldRow = [...board[i]];

    let newRow = slideAndMergeLine(oldRow, index => {
      return isHole_6_2(i, index) ||
             isLocked_6_2(i, index);
    });

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_6_2(0, -1);
  moveCurseBombs_6_2(0, -1);
  moveBombs_6_2(0, -1);
  moveLasers_6_2(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < ROWS_6_2; i++) {
    let oldRow = [...board[i]];
    let reversed = [...oldRow].reverse();

    let newRow = slideAndMergeLine(reversed, index => {
      return isHole_6_2(i, COLS_6_2 - 1 - index) ||
             isLocked_6_2(i, COLS_6_2 - 1 - index);
    }).reverse();

    if (changedLine(oldRow, newRow)) moved = true;
    board[i] = newRow;
  }

  moveShields_6_2(0, 1);
  moveCurseBombs_6_2(0, 1);
  moveBombs_6_2(0, 1);
  moveLasers_6_2(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < COLS_6_2; j++) {
    let col = [];

    for (let i = 0; i < ROWS_6_2; i++) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_6_2(index, j) ||
             isLocked_6_2(index, j);
    });

    for (let i = 0; i < ROWS_6_2; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_6_2(-1, 0);
  moveCurseBombs_6_2(-1, 0);
  moveBombs_6_2(-1, 0);
  moveLasers_6_2(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < COLS_6_2; j++) {
    let col = [];

    for (let i = ROWS_6_2 - 1; i >= 0; i--) {
      col.push(board[i][j]);
    }

    let newCol = slideAndMergeLine(col, index => {
      return isHole_6_2(ROWS_6_2 - 1 - index, j) ||
             isLocked_6_2(ROWS_6_2 - 1 - index, j);
    });

    newCol.reverse();

    for (let i = 0; i < ROWS_6_2; i++) {
      if (board[i][j] !== newCol[i]) moved = true;
      board[i][j] = newCol[i];
    }
  }

  moveShields_6_2(1, 0);
  moveCurseBombs_6_2(1, 0);
  moveBombs_6_2(1, 0);
  moveLasers_6_2(1, 0);
}

  if (moved) {
    timer6_2 = getMaxTimer_6_2(); // ⭐ 타이머 풀충전
    updateTimerUI_6_2();
    turnCount--;

    updateLocks_6_2();
    updateShields_6_2();

  if (turnCount < 0) {
    turnCount = 5;
    giveRandomItem6_2(); // ⭐ 여기 추가
    triggerRandomObstacle_6_2();
  }

  addRandom_6_2();
  addRandom_6_2();

    draw_6_2(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = "Score: " + score;
  updateTurnUI();
}
    

  // ⭐ 클리어 조건 (3000점)
  if (score >= 3000 && !window.cleared && !isTimeOut) {
  clearInterval(timerInterval_6_2);
  window.cleared = true;

  let item2Count = Number(localStorage.getItem("item2Count")) || 0;
  let item6Count = Number(localStorage.getItem("item6Count")) || 0;
  let item10Count = Number(localStorage.getItem("item10Count")) || 0;
  let item14Count = Number(localStorage.getItem("item14Count")) || 0;
  let reward = 30 + item2Count + (item6Count * 5) + (item10Count * 100) + (item14Count * 2000);

  coin += reward;
  localStorage.setItem("coin", coin);

  // ⭐ 현재 스테이지
  let current = `${currentStage.main}-${currentStage.sub}`;

  // ⭐ 다음 스테이지 계산
  unlockNextStage();

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR! +${reward} Coin`;
  clearText.style.display = "block";
}

}


























// ===============================
// 7-1 AI 대결 전용 코드
// 멀티 코드와 충돌 방지용: AI7 객체 안에 전부 분리
// ===============================

const AI7 = {
  SIZE: 5,
  TARGET: 30000000,
  TIMER_MAX: 10,

  player: null,
  ai: null,

  timerInterval: null,
  aiInterval: null,
  ended: false,

  playerBoardDiv: null,
  aiBoardDiv: null,
  playerScoreText: null,
  aiScoreText: null,
  playerTimerBar: null,
  aiTimerBar: null,
  resultText: null
};

function initGame_7_1() {
  const item16Count = Number(localStorage.getItem("item16Count")) || 0;

  if (item16Count < 600) {
    alert(
      `7-1 플레이 조건\n\n` +
      `아이템16 필요 수량 : 600개\n` +
      `현재 수량 : ${item16Count}개`
    );

    return;
  }
  document.onkeydown = null;
  clearInterval(AI7.timerInterval);
  clearInterval(AI7.aiInterval);

  gameContainer.innerHTML = "";
  AI7.ended = false;

  AI7.player = createAI7Side("플레이어");
  AI7.ai = createAI7Side("AI");

  addRandom_AI7(AI7.player);
  addRandom_AI7(AI7.player);
  addRandom_AI7(AI7.ai);
  addRandom_AI7(AI7.ai);

  applyStartItems_AI7(AI7.player);
applyStartItems_AI7(AI7.ai);

  createAI7Layout();

  drawAI7();
  resetTimer_AI7(AI7.player);
  resetTimer_AI7(AI7.ai);

  document.onkeydown = handleKey_7_1;

  AI7.timerInterval = setInterval(() => {
    if (AI7.ended) return;

    AI7.player.timer--;
    AI7.ai.timer--;

    updateTimerUI_AI7();

    if (AI7.player.timer <= 0) finishAI7("LOSE!", "TIME OUT!");
    if (AI7.ai.timer <= 0) finishAI7("WIN!", "AI TIME OUT!");
  }, 1000);

  AI7.aiInterval = setInterval(() => {
    if (AI7.ended) return;
    aiMove_AI7();
  }, 700);
}

function getScoreBonus_AI7() {
  const bonus1 = Number(localStorage.getItem("item1Count")) || 0;
  const bonus5 = Number(localStorage.getItem("item5Count")) || 0;
  const bonus9 = Number(localStorage.getItem("item9Count")) || 0;
  const bonus13 = Number(localStorage.getItem("item13Count")) || 0;

  return bonus1 + bonus5 * 10 + bonus9 * 100 + bonus13 * 1000;
}

function getSpawnValue_AI7() {
  let value;

  if (localStorage.getItem("item8")) {
    const r = Math.random();
    if (r < 0.5) value = 32;
    else if (r < 0.8) value = 64;
    else value = 128;
  } else if (localStorage.getItem("item7")) {
    const r = Math.random();
    if (r < 0.5) value = 16;
    else if (r < 0.8) value = 32;
    else value = 64;
  } else if (localStorage.getItem("item4")) {
    const r = Math.random();
    if (r < 0.5) value = 8;
    else if (r < 0.8) value = 16;
    else value = 32;
  } else if (localStorage.getItem("item3")) {
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  } else {
    value = Math.random() < 0.9 ? 2 : 4;
  }

  return value;
}

function applyStartItems_AI7(side) {
  // item16은 일부러 적용 안 함. 타이머는 무조건 10초.

  if (localStorage.getItem("item11")) {
    useItemImmediately_AI7(side, "bomb");
  }

  if (localStorage.getItem("item12")) {
    useItemImmediately_AI7(side, "laser");
  }

  if (localStorage.getItem("item15")) {
    useItemImmediately_AI7(side, "block");
  }
}

function createAI7Side(name) {
  return {
    name,
    board: Array.from({ length: AI7.SIZE }, () => Array(AI7.SIZE).fill(0)),
    score: 0,
    timer: AI7.TIMER_MAX,
    turnCount: 3,
    bombs: [],
    lasers: [],
    locks: [],
    shields: [],
    curseBombs: [],
    itemSlots: [null, null, null],
    slotDivs: []
  };
}

function createAI7Layout() {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.width = "100%";
  wrapper.style.height = "100%";

  const left = createAI7Panel("내 화면");
  const right = createAI7Panel("상대 화면");

  AI7.playerScoreText = left.scoreText;
  AI7.aiScoreText = right.scoreText;
  AI7.playerBoardDiv = left.boardDiv;
  AI7.aiBoardDiv = right.boardDiv;
  AI7.playerTimerBar = left.timerBar;
  AI7.aiTimerBar = right.timerBar;

  wrapper.appendChild(left.panel);
  wrapper.appendChild(right.panel);
  gameContainer.appendChild(wrapper);

  AI7.resultText = document.createElement("div");
  AI7.resultText.style.position = "fixed";
  AI7.resultText.style.top = "50%";
  AI7.resultText.style.left = "50%";
  AI7.resultText.style.transform = "translate(-50%, -50%)";
  AI7.resultText.style.fontSize = "55px";
  AI7.resultText.style.fontWeight = "bold";
  AI7.resultText.style.display = "none";
  gameContainer.appendChild(AI7.resultText);

  createBackButton(() => {
    clearInterval(AI7.timerInterval);
    clearInterval(AI7.aiInterval);
    document.onkeydown = null;

    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, gameContainer);
}

function createAI7Panel(titleText) {
  const panel = document.createElement("div");
  panel.style.width = "50%";
  panel.style.height = "100%";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.alignItems = "center";
  panel.style.justifyContent = "center";
  panel.style.gap = "10px";
  panel.style.borderRight = titleText === "내 화면" ? "4px solid #81c784" : "none";

  const title = document.createElement("div");
  title.textContent = titleText;
  title.style.color = "#1b5e20";
  title.style.fontSize = "26px";
  title.style.fontWeight = "bold";

  const scoreText = document.createElement("div");
  scoreText.style.color = "#1b5e20";
  scoreText.style.fontSize = "22px";
  scoreText.style.fontWeight = "bold";

  const targetText = document.createElement("div");
  targetText.textContent = "목표: " + AI7.TARGET;
  targetText.style.color = "#1b5e20";
  targetText.style.fontSize = "18px";
  targetText.style.fontWeight = "bold";

  const boardDiv = document.createElement("div");
  boardDiv.className = "board board-4";
  boardDiv.style.gridTemplateColumns = `repeat(${AI7.SIZE}, 80px)`;
  boardDiv.style.gridTemplateRows = `repeat(${AI7.SIZE}, 80px)`;

  const timerBox = document.createElement("div");
  timerBox.style.width = `${AI7.SIZE * 80}px`;
  timerBox.style.height = "20px";
  timerBox.style.background = "#ccc";
  timerBox.style.marginTop = "10px";

  const timerBar = document.createElement("div");
  timerBar.style.height = "100%";
  timerBar.style.width = "100%";
  timerBar.style.background = "#4caf50";
  timerBar.style.transition = "width 0.2s linear";

  timerBox.appendChild(timerBar);
  const itemPanel = document.createElement("div");
itemPanel.style.display = "flex";
itemPanel.style.gap = "10px";
itemPanel.style.marginTop = "15px";

if (titleText === "내 화면") {
  AI7.player.slotDivs = [
    createSlot_AI7(),
    createSlot_AI7(),
    createSlot_AI7()
  ];

  AI7.player.slotDivs.forEach(slot => itemPanel.appendChild(slot));
}

  panel.appendChild(title);
  panel.appendChild(scoreText);
  panel.appendChild(targetText);
  panel.appendChild(boardDiv);
  panel.appendChild(timerBox);

  if (titleText === "내 화면") {
  panel.appendChild(itemPanel);
}

  return { panel, scoreText, boardDiv, timerBar };
}

function handleKey_7_1(e) {
  if (AI7.ended) return;

  if (e.key === "a" || e.key === "A") {
    usePlayerItem_AI7(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    usePlayerItem_AI7(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    usePlayerItem_AI7(2);
    return;
  }

  const dirMap = {
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0]
  };

  if (!dirMap[e.key]) return;

  const moved = moveSide_AI7(AI7.player, dirMap[e.key]);

  if (moved) {
    afterMove_AI7(AI7.player);
    resetTimer_AI7(AI7.player);
    drawAI7();
    checkResult_AI7();
  }
}

function usePlayerItem_AI7(index) {
  const item = AI7.player.itemSlots[index];

  if (!item) return;

  useItemImmediately_AI7(AI7.player, item);

  AI7.player.itemSlots[index] = null;

  updateSlotUI_AI7();
  drawAI7();
  checkResult_AI7();
}

function createSlot_AI7() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  div.style.fontSize = "35px";
  return div;
}

function updateSlotUI_AI7() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  if (!AI7.player.slotDivs) return;

  for (let i = 0; i < 3; i++) {
    AI7.player.slotDivs[i].textContent =
      AI7.player.itemSlots[i] ? icons[AI7.player.itemSlots[i]] : "";
  }
}

function aiMove_AI7() {
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0]
  ];

  let bestDir = null;
  let bestScore = -1;

  for (const dir of dirs) {
    const test = cloneSide_AI7(AI7.ai);
    const moved = moveSide_AI7(test, dir);

    if (!moved) continue;

    const emptyCount = countEmpty_AI7(test.board);
    const maxTile = Math.max(...test.board.flat());
    const value = emptyCount * 100 + maxTile + test.score;

    if (value > bestScore) {
      bestScore = value;
      bestDir = dir;
    }
  }

  if (!bestDir) {
    finishAI7("WIN!", " 상대 이동 불가!");
    return;
  }

  const moved = moveSide_AI7(AI7.ai, bestDir);

  if (moved) {
    afterMove_AI7(AI7.ai);
    resetTimer_AI7(AI7.ai);
    drawAI7();
    checkResult_AI7();
  }
}
function cloneSide_AI7(side) {
  return {
    name: side.name,
    board: side.board.map(row => [...row]),
    score: side.score,
    timer: side.timer,
    turnCount: side.turnCount,

    bombs: side.bombs.map(v => ({ ...v })),
    lasers: side.lasers.map(v => ({ ...v })),
    locks: side.locks.map(v => ({ ...v })),
    shields: side.shields.map(v => ({ ...v })),
    curseBombs: side.curseBombs.map(v => ({ ...v })),

    itemSlots: side.itemSlots ? [...side.itemSlots] : [null, null, null],
    slotDivs: []
  };
}

function moveSide_AI7(side, dir) {
  const before = JSON.stringify({
    board: side.board,
    bombs: side.bombs,
    lasers: side.lasers,
    locks: side.locks,
    shields: side.shields,
    curseBombs: side.curseBombs
  });

  moveBoardWithObstacles_AI7(side, dir);

  moveBombs_AI7(side, dir);
  moveLasers_AI7(side, dir);
  moveCurseBombs_AI7(side, dir);

  return before !== JSON.stringify({
    board: side.board,
    bombs: side.bombs,
    lasers: side.lasers,
    locks: side.locks,
    shields: side.shields,
    curseBombs: side.curseBombs
  });
}

function moveBoardWithObstacles_AI7(side, dir) {
  if (dir[0] === 0 && dir[1] === -1) moveLeft_AI7(side);
  if (dir[0] === 0 && dir[1] === 1) moveRight_AI7(side);
  if (dir[0] === -1 && dir[1] === 0) moveUp_AI7(side);
  if (dir[0] === 1 && dir[1] === 0) moveDown_AI7(side);
}



function moveCurseBombs_AI7(side, dir) {
  if (!side.curseBombs) return;

  const exploded = [];

  side.curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      const nx = x + dir[0];
      const ny = y + dir[1];

      if (
        nx < 0 || nx >= AI7.SIZE ||
        ny < 0 || ny >= AI7.SIZE ||
        side.board[nx][ny] !== 0 ||
        side.shields.some(s => s.x === nx && s.y === ny) ||
        side.locks.some(l => l.x === nx && l.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    const nextX = x + dir[0];
    const nextY = y + dir[1];

    if (
      nextX < 0 || nextX >= AI7.SIZE ||
      nextY < 0 || nextY >= AI7.SIZE ||
      side.board[nextX][nextY] !== 0 ||
      side.shields.some(s => s.x === nextX && s.y === nextY) ||
      side.locks.some(l => l.x === nextX && l.y === nextY)
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_AI7(side, pos.x, pos.y));

  side.curseBombs = side.curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_AI7(side, x, y) {
  for (let j = 0; j < AI7.SIZE; j++) {
    const locked = side.locks.some(l => l.x === x && l.y === j);

    if (locked) continue;

    if (side.board[x][j] > 0) {
      const before = side.board[x][j];
      const after = Math.floor(before / 2);

      side.board[x][j] = after;

      side.score -= before - after;
      if (side.score < 0) side.score = 0;
    }
  }
}

function mergeLine_AI7(side, line) {
  const arr = line.filter(v => v !== 0);
  const result = [];

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === arr[i + 1]) {
      const merged = arr[i] * 2;
      result.push(merged);

      side.score += merged + getScoreBonus_AI7();

      i++;
    } else {
      result.push(arr[i]);
    }
  }

  while (result.length < AI7.SIZE) result.push(0);
  return result;
}
function mergeEntries_AI7(side, entries) {
  const arr = entries.filter(e => e.value !== 0 || e.shield);
  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i];
    const next = arr[i + 1];

    if (
      cur.value > 0 &&
      next &&
      next.value > 0 &&
      cur.value === next.value &&
      !cur.shield &&
      !next.shield
    ) {
      const merged = cur.value * 2;

      result.push({
        value: merged,
        shield: false,
        oldX: cur.oldX,
        oldY: cur.oldY
      });

      side.score += merged + getScoreBonus_AI7();
      i++;
    } else {
      result.push(cur);
    }
  }

  while (result.length < AI7.SIZE) {
    result.push({
      value: 0,
      shield: false
    });
  }

  return result;
}

function hasShield_AI7(side, x, y) {
  if (!side.shields) return false;
  return side.shields.some(s => s.x === x && s.y === y);
}

function setShieldsFromGrid_AI7(side, shieldGrid) {
  const oldShields = side.shields || [];
  const newShields = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      if (shieldGrid[i][j]) {
        const old = oldShields.find(
          s => s.x === shieldGrid[i][j].oldX && s.y === shieldGrid[i][j].oldY
        );

        newShields.push({
          x: i,
          y: j,
          turn: old ? old.turn : 3
        });
      }
    }
  }

  side.shields = newShields;
}

function moveLeft_AI7(side) {
  const shieldGrid = Array.from({ length: AI7.SIZE }, () => Array(AI7.SIZE).fill(null));

  for (let i = 0; i < AI7.SIZE; i++) {
    const line = [];

    for (let j = 0; j < AI7.SIZE; j++) {
      line.push({
        value: side.board[i][j],
        shield: hasShield_AI7(side, i, j),
        oldX: i,
        oldY: j
      });
    }

    const merged = mergeEntries_AI7(side, line);

    for (let j = 0; j < AI7.SIZE; j++) {
      side.board[i][j] = merged[j].value;

      if (merged[j].shield) {
        shieldGrid[i][j] = {
          oldX: merged[j].oldX,
          oldY: merged[j].oldY
        };
      }
    }
  }

  setShieldsFromGrid_AI7(side, shieldGrid);
}

function moveRight_AI7(side) {
  const shieldGrid = Array.from({ length: AI7.SIZE }, () => Array(AI7.SIZE).fill(null));

  for (let i = 0; i < AI7.SIZE; i++) {
    const line = [];

    for (let j = AI7.SIZE - 1; j >= 0; j--) {
      line.push({
        value: side.board[i][j],
        shield: hasShield_AI7(side, i, j),
        oldX: i,
        oldY: j
      });
    }

    const merged = mergeEntries_AI7(side, line);

    for (let k = 0; k < AI7.SIZE; k++) {
      const j = AI7.SIZE - 1 - k;

      side.board[i][j] = merged[k].value;

      if (merged[k].shield) {
        shieldGrid[i][j] = {
          oldX: merged[k].oldX,
          oldY: merged[k].oldY
        };
      }
    }
  }

  setShieldsFromGrid_AI7(side, shieldGrid);
}

function moveUp_AI7(side) {
  const shieldGrid = Array.from({ length: AI7.SIZE }, () => Array(AI7.SIZE).fill(null));

  for (let j = 0; j < AI7.SIZE; j++) {
    const line = [];

    for (let i = 0; i < AI7.SIZE; i++) {
      line.push({
        value: side.board[i][j],
        shield: hasShield_AI7(side, i, j),
        oldX: i,
        oldY: j
      });
    }

    const merged = mergeEntries_AI7(side, line);

    for (let i = 0; i < AI7.SIZE; i++) {
      side.board[i][j] = merged[i].value;

      if (merged[i].shield) {
        shieldGrid[i][j] = {
          oldX: merged[i].oldX,
          oldY: merged[i].oldY
        };
      }
    }
  }

  setShieldsFromGrid_AI7(side, shieldGrid);
}

function moveDown_AI7(side) {
  const shieldGrid = Array.from({ length: AI7.SIZE }, () => Array(AI7.SIZE).fill(null));

  for (let j = 0; j < AI7.SIZE; j++) {
    const line = [];

    for (let i = AI7.SIZE - 1; i >= 0; i--) {
      line.push({
        value: side.board[i][j],
        shield: hasShield_AI7(side, i, j),
        oldX: i,
        oldY: j
      });
    }

    const merged = mergeEntries_AI7(side, line);

    for (let k = 0; k < AI7.SIZE; k++) {
      const i = AI7.SIZE - 1 - k;

      side.board[i][j] = merged[k].value;

      if (merged[k].shield) {
        shieldGrid[i][j] = {
          oldX: merged[k].oldX,
          oldY: merged[k].oldY
        };
      }
    }
  }

  setShieldsFromGrid_AI7(side, shieldGrid);
}


function spawnObstacleToEnemy_AI7(enemySide) {
  const obstacle = getRandomObstacle_AI7(enemySide);

  if (obstacle === "lock") spawnLocks_AI7(enemySide);
  if (obstacle === "shield") spawnShield_AI7(enemySide);
  if (obstacle === "curseBomb") spawnCurseBomb_AI7(enemySide);
}

function getRandomObstacle_AI7(enemySide) {
  let types = ["shield", "curseBomb"];

  // 잠금은 처음부터 나오면 너무 불리하니까,
  // 상대 보드에 숫자가 5개 이상 있을 때부터 등장
  const tileCount = enemySide.board.flat().filter(v => v > 0).length;

  if (tileCount >= 5) {
    types.push("lock");
  }

  return types[Math.floor(Math.random() * types.length)];
}

function spawnLocks_AI7(side) {
  const cells = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      const hasLock = side.locks.some(l => l.x === i && l.y === j);
      const hasShield = side.shields.some(s => s.x === i && s.y === j);

      if (side.board[i][j] > 0 && !hasLock && !hasShield) {
        cells.push({ x: i, y: j });
      }
    }
  }

  shuffle_AI7(cells);

  const count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    side.locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3
    });
  }
}

function spawnShield_AI7(side) {
  if (!side.shields) side.shields = [];

  const empty = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      const hasShield = side.shields.some(s => s.x === i && s.y === j);
      const hasCurse = side.curseBombs.some(c => c.x === i && c.y === j);
      const hasBomb = side.bombs.some(b => b.x === i && b.y === j);
      const hasLaser = side.lasers.some(l => l.x === i && l.y === j);

      if (
        side.board[i][j] === 0 &&
        !hasShield &&
        !hasCurse &&
        !hasBomb &&
        !hasLaser
      ) {
        empty.push([i, j]);
      }
    }
  }

  shuffle_AI7(empty);

  const count = Math.min(4, empty.length);

  for (let i = 0; i < count; i++) {
    const [x, y] = empty[i];

    side.shields.push({
      x,
      y,
      turn: 4
    });
  }
}

function spawnCurseBomb_AI7(side) {
  if (!side.curseBombs) side.curseBombs = [];

  const empty = getEmptyCells_AI7(side);
  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  side.curseBombs.push({ x, y });
}

function addItemToSlot_AI7(item) {
  for (let i = 0; i < 3; i++) {
    if (AI7.player.itemSlots[i] === null) {
      AI7.player.itemSlots[i] = item;
      updateSlotUI_AI7();
      return;
    }
  }

  // 슬롯이 꽉 차면 새 아이템은 버림
}
function updateObstacles_AI7(side) {
  if (side.locks) {
    side.locks.forEach(l => l.turn--);
    side.locks = side.locks.filter(l => l.turn > 0);
  }

  if (side.shields) {
    side.shields.forEach(s => s.turn--);
    side.shields = side.shields.filter(s => s.turn > 0);
  }
}

function afterMove_AI7(side) {
  side.turnCount--;
  updateObstacles_AI7(side);
  addRandom_AI7(side);
  addRandom_AI7(side);


  if (side.turnCount <= 0) {
    side.turnCount = 5;

    const item = getRandomItem_AI7();

    if (side === AI7.player) {
      addItemToSlot_AI7(item);
    } else {
      useItemImmediately_AI7(side, item);
    }

    const enemy = side === AI7.player ? AI7.ai : AI7.player;
    spawnObstacleToEnemy_AI7(enemy);
  }
}

function addRandom_AI7(side) {
  const empty = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      if (side.board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  side.board[x][y] = getSpawnValue_AI7();
}
function getRandomItem_AI7() {
  const items = ["bomb", "laser", "block"];
  return items[Math.floor(Math.random() * items.length)];
}

function useItemImmediately_AI7(side, item) {
  if (item === "bomb") spawnBomb_AI7(side);
  if (item === "laser") spawnLaser_AI7(side);
  if (item === "block") useBlock_AI7(side);
}

function spawnBomb_AI7(side) {
  const empty = getEmptyCells_AI7(side);

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  side.bombs.push({ x: pos[0], y: pos[1] });
}

function spawnLaser_AI7(side) {
  const empty = getEmptyCells_AI7(side);

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  side.lasers.push({ x: pos[0], y: pos[1] });
}

function useBlock_AI7(side) {
  const cells = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      if (side.board[i][j] > 0) cells.push({ x: i, y: j });
    }
  }

  shuffle_AI7(cells);

  const count = Math.min(5, cells.length);

  for (let i = 0; i < count; i++) {
    const { x, y } = cells[i];
    const before = side.board[x][y];
    side.board[x][y] *= 2;
    side.score += before;
  }
}

function moveBombs_AI7(side, dir) {
  const exploded = [];

  side.bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    while (true) {
      const nx = x + dir[0];
      const ny = y + dir[1];

      if (
        nx < 0 || nx >= AI7.SIZE ||
        ny < 0 || ny >= AI7.SIZE ||
        side.board[nx][ny] !== 0
      ) break;

      x = nx;
      y = ny;
    }

    b.x = x;
    b.y = y;

    const nextX = x + dir[0];
    const nextY = y + dir[1];

    if (
      nextX < 0 || nextX >= AI7.SIZE ||
      nextY < 0 || nextY >= AI7.SIZE ||
      side.board[nextX][nextY] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(p => explodeBomb_AI7(side, p.x, p.y));

  side.bombs = side.bombs.filter(b =>
    !exploded.some(e => e.x === b.x && e.y === b.y)
  );
}

function explodeBomb_AI7(side, x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i < 0 || i >= AI7.SIZE || j < 0 || j >= AI7.SIZE) continue;

      if (side.board[i][j] > 0) {
        const before = side.board[i][j];
        side.board[i][j] *= 2;
        side.score += before;
      }
    }
  }
}

function moveLasers_AI7(side, dir) {
  const exploded = [];

  side.lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      const nx = x + dir[0];
      const ny = y + dir[1];

      if (
        nx < 0 || nx >= AI7.SIZE ||
        ny < 0 || ny >= AI7.SIZE ||
        side.board[nx][ny] !== 0
      ) break;

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    const nextX = x + dir[0];
    const nextY = y + dir[1];

    if (
      nextX < 0 || nextX >= AI7.SIZE ||
      nextY < 0 || nextY >= AI7.SIZE ||
      side.board[nextX][nextY] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(p => explodeLaser_AI7(side, p.x, p.y));

  side.lasers = side.lasers.filter(l =>
    !exploded.some(e => e.x === l.x && e.y === l.y)
  );
}

function explodeLaser_AI7(side, x, y) {
  for (let j = 0; j < AI7.SIZE; j++) {
    if (side.board[x][j] > 0) {
      const before = side.board[x][j];
      side.board[x][j] *= 2;
      side.score += before;
    }
  }

  for (let i = 0; i < AI7.SIZE; i++) {
    if (i === x) continue;

    if (side.board[i][y] > 0) {
      const before = side.board[i][y];
      side.board[i][y] *= 2;
      side.score += before;
    }
  }
}

function getEmptyCells_AI7(side) {
  const empty = [];

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      const hasBomb = side.bombs.some(b => b.x === i && b.y === j);
      const hasLaser = side.lasers.some(l => l.x === i && l.y === j);

      if (side.board[i][j] === 0 && !hasBomb && !hasLaser) {
        empty.push([i, j]);
      }
    }
  }

  return empty;
}

function drawAI7() {
  drawSide_AI7(AI7.player, AI7.playerBoardDiv);
  drawSide_AI7(AI7.ai, AI7.aiBoardDiv);

  AI7.playerScoreText.textContent =
    `플레이어 Score: ${AI7.player.score} / 턴: ${AI7.player.turnCount}`;

  AI7.aiScoreText.textContent =
    `AI Score: ${AI7.ai.score} / 턴: ${AI7.ai.turnCount}`;

  updateTimerUI_AI7();
  updateSlotUI_AI7();
}

function drawSide_AI7(side, boardDiv) {
  if (!boardDiv) return;

  boardDiv.innerHTML = "";

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const bombHere = side.bombs.some(b => b.x === i && b.y === j);
      const laserHere = side.lasers.some(l => l.x === i && l.y === j);
      const lockHere = side.locks?.some(l => l.x === i && l.y === j);
      const shieldHere = side.shields?.some(s => s.x === i && s.y === j);
      const curseHere = side.curseBombs?.some(c => c.x === i && c.y === j);

      if (lockHere) cell.textContent = "🔒";
else if (shieldHere) cell.textContent = "🛡️";
else if (curseHere) cell.textContent = "💀";
else if (laserHere) cell.textContent = "🔫";
else if (bombHere) cell.textContent = "💣";
else cell.textContent = side.board[i][j] || "";

      boardDiv.appendChild(cell);
    }
  }
}

function getMaxTimer_AI7(side) {
  if (side === AI7.player) {
    const item16Count = Number(localStorage.getItem("item16Count")) || 0;
    return 10 + item16Count * 0.1;
  }

  return 10;
}

function resetTimer_AI7(side) {
  side.timer = getMaxTimer_AI7(side);
  updateTimerUI_AI7();
}

function updateTimerUI_AI7() {
  updateOneTimer_AI7(AI7.player, AI7.playerTimerBar);
  updateOneTimer_AI7(AI7.ai, AI7.aiTimerBar);
}

function updateOneTimer_AI7(side, bar) {
  if (!bar) return;

  const maxTimer = getMaxTimer_AI7(side);
  const percent = Math.max(0, side.timer / maxTimer * 100);

  bar.style.width = percent + "%";

  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}

function checkResult_AI7() {
  if (AI7.player.score >= AI7.TARGET) {
    finishAI7("WIN!", "CLEAR!");
    return;
  }

  if (AI7.ai.score >= AI7.TARGET) {
    finishAI7("LOSE!", "AI CLEAR!");
    return;
  }

  if (!canMove_AI7(AI7.player)) {
    finishAI7("LOSE!", "이동 불가!");
    return;
  }

  if (!canMove_AI7(AI7.ai)) {
    finishAI7("WIN!", "상대 이동 불가!");
  }
}

function canMove_AI7(side) {
  if (countEmpty_AI7(side.board) > 0) return true;

  for (let i = 0; i < AI7.SIZE; i++) {
    for (let j = 0; j < AI7.SIZE; j++) {
      const v = side.board[i][j];

      if (i + 1 < AI7.SIZE && side.board[i + 1][j] === v) return true;
      if (j + 1 < AI7.SIZE && side.board[i][j + 1] === v) return true;
    }
  }

  return false;
}

function countEmpty_AI7(board) {
  return board.flat().filter(v => v === 0).length;
}

function finishAI7(result, reason) {
  if (AI7.ended) return;

  AI7.ended = true;

  clearInterval(AI7.timerInterval);
  clearInterval(AI7.aiInterval);
  document.onkeydown = null;

  AI7.resultText.textContent = `${result} ${reason}`;
  AI7.resultText.style.color = result === "WIN!" ? "#2e7d32" : "#d32f2f";
  AI7.resultText.style.display = "block";

  if (result === "WIN!") {
    let reward = 30;
    coin += reward;
    localStorage.setItem("coin", coin);

    if (typeof unlockNextStage === "function") {
      unlockNextStage();
    }
  }
}

function shuffle_AI7(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
}








































































































const SIZE_M = 5;

let timer_M = 10;
let timerInterval_M = null;


let nextRandomItem = null;
let nextObstacle = null;
let enemyTargetText = null;
let myResultText = null;
let enemyResultText = null;

let enemyBombs = [];
let enemyLasers = [];
let enemyLocks = [];
let enemyShields = [];
let enemyCurseBombs = [];

function initGame_M() {
  document.onkeydown = null;

  let parentContainer;

  if (currentRoomId) {
    parentContainer = createMultiBattleLayout();
  } else {
    gameContainer.innerHTML = "";
    parentContainer = gameContainer;
  }



  score = 0;
  window.cleared = false;

  window.turnCount = 3;
  window.bombs = [];
  window.lasers = [];
  window.itemSlots = [null, null, null];
  window.slotDivs_M = [createSlot_M(), createSlot_M(), createSlot_M()];

  window.locks = [];
  window.shields = [];
  window.curseBombs = [];

  const scoreText = document.createElement("div");
  scoreText.id = "scoreText"; // ⭐ 추가
  scoreText.className = "";
  scoreText.style.color = "#1b5e20";
  scoreText.style.fontSize = "22px";
  scoreText.style.fontWeight = "bold";
  scoreText.style.marginBottom = "8px";
  scoreText.textContent = playerId + " Score: 0";

  const nextPreview = document.createElement("div");
  nextPreview.id = "nextPreview"; // ⭐ 추가
  nextPreview.className = "";
  nextPreview.style.color = "#1b5e20";
  nextPreview.style.fontSize = "18px";
  nextPreview.style.fontWeight = "bold";
  nextPreview.style.marginBottom = "0";
  nextPreview.innerHTML = "다음 아이템: ?<br>다음 방해물: ?"; 
  

  const targetText = document.createElement("div");
  targetText.className = "";
  targetText.style.color = "#1b5e20";
  targetText.style.fontSize = "18px";
  targetText.style.fontWeight = "bold";
  targetText.style.marginBottom = "0";
  targetText.textContent = "목표: 30000";
  

  const turnText = document.createElement("div");
  turnText.className = "";
  turnText.style.color = "#1b5e20";
  turnText.style.fontSize = "18px";
  turnText.style.fontWeight = "bold";
  turnText.style.marginBottom = "0";
  turnText.id = "turnText";

  // ✅ ⭐ 보드 + 타이머 묶는 컨테이너
 
  const boardWrapper = document.createElement("div");
boardWrapper.style.display = "flex";
boardWrapper.style.flexDirection = "column";
boardWrapper.style.alignItems = "center";

const boardDiv = document.createElement("div");
boardDiv.className = "board board-4";
boardDiv.style.gridTemplateColumns = `repeat(${SIZE_M}, 80px)`;
boardDiv.style.gridTemplateRows = `repeat(${SIZE_M}, 80px)`;

const timerBarContainer = document.createElement("div");
timerBarContainer.style.width = `${SIZE_M * 80}px`;
timerBarContainer.style.height = "20px";
timerBarContainer.style.background = "#ccc";
timerBarContainer.style.marginTop = "20px";

const timerBar = document.createElement("div");
timerBar.id = "timerBar";
timerBar.style.height = "100%";
timerBar.style.width = "100%";
timerBar.style.background = "#4caf50";
timerBar.style.transition = "width 0.2s linear";

timerBarContainer.appendChild(timerBar);

const itemPanel = document.createElement("div");
itemPanel.style.display = "flex";
itemPanel.style.gap = "10px";
itemPanel.style.marginTop = "15px";

slotDivs_M.forEach(slot => itemPanel.appendChild(slot));

boardWrapper.appendChild(boardDiv);
boardWrapper.appendChild(timerBarContainer);
boardWrapper.appendChild(itemPanel);



  const myInfoBox = document.createElement("div");
  myInfoBox.style.display = "flex";
  myInfoBox.style.flexDirection = "column";
  myInfoBox.style.alignItems = "center";
  myInfoBox.style.gap = "8px";
  myInfoBox.style.marginBottom = "15px";

  myInfoBox.appendChild(scoreText);
  myInfoBox.appendChild(nextPreview);
  myInfoBox.appendChild(targetText);
  myInfoBox.appendChild(turnText);

  parentContainer.appendChild(myInfoBox);
  parentContainer.appendChild(boardWrapper);

  if (!currentRoomId) {
  createBackButton(() => {
    gameContainer.classList.add("hidden");
    menu.classList.remove("hidden");
  }, parentContainer);
}
  

  // ⭐ 보드 생성
  board = Array.from({ length: SIZE_M }, () => Array(SIZE_M).fill(0));

  addRandom_M();
  addRandom_M();
  

  draw_M(boardDiv);

  document.onkeydown = handleKey_M;
  updateSlotUI_M();
  setNextRandoms();
  startTimer_M();
  sendMyGameState();
}

//==미리==\
function setNextRandoms() {
  const itemTypes = ["bomb", "laser", "block"];
  const obstacleTypes = ["lock", "shield", "curseBomb"];

  nextRandomItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  nextObstacle = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

  updateNextPreviewUI();
}

function givePreviewItem() {
  if (itemSlots.every(v => v !== null)) return;

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = nextRandomItem;
      break;
    }
  }

  updateSlotUI_M();
  sendMyGameState();
}

function triggerPreviewObstacle() {
  // 멀티 중이면 상대에게 보냄
  if (currentRoomId) {
    socket.emit("sendObstacleToEnemy", {
      type: nextObstacle
    });
    return;
  }

  // 싱글플레이면 나에게 생성
  if (nextObstacle === "lock") spawnLocks_M();
  if (nextObstacle === "shield") spawnShields_M();
  if (nextObstacle === "curseBomb") spawnCurseBomb_M();
}

function updateNextPreviewUI() {
  const preview = document.getElementById("nextPreview");
  if (!preview) return;

  const itemIcons = {
    bomb: "💣 폭탄",
    laser: "🔫 레이저",
    block: "🧱 블록"
  };

  const obstacleIcons = {
    lock: "🔒 잠금",
    shield: "🛡️ 방패",
    curseBomb: "💀 저주폭탄"
  };

  preview.innerHTML = `
    다음 아이템: ${itemIcons[nextRandomItem] || "없음"}<br>
    다음 방해물: ${obstacleIcons[nextObstacle] || "없음"}
  `;
}

socket.on("receiveObstacle", data => {
  if (data.type === "lock") spawnLocks_M();
  if (data.type === "shield") spawnShields_M();
  if (data.type === "curseBomb") spawnCurseBomb_M();

  draw_M(document.querySelector(".board"));
});
//==화면분할==
function drawEnemyBoard() {
  if (!enemyBoardDiv || !enemyBoard) return;

  enemyBoardDiv.innerHTML = "";

  for (let i = 0; i < enemyBoard.length; i++) {
    for (let j = 0; j < enemyBoard[i].length; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = enemyBombs.some(b => b.x === i && b.y === j);
      let laserHere = enemyLasers.some(l => l.x === i && l.y === j);
      let lockHere = enemyLocks.some(l => l.x === i && l.y === j);
      let shieldHere = enemyShields.some(s => s.x === i && s.y === j);
      let curseHere = enemyCurseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = enemyBoard[i][j] || "";
      }

      enemyBoardDiv.appendChild(cell);
    }
  }

  if (enemyScoreText) {
    enemyScoreText.textContent = `${enemyPlayerId || "상대"} Score: ${enemyScore}`;
  }
}

socket.on("enemyGameResult", data => {
  if (data.result === "clear") {
    showBattleResult("LOSE!");
  }

  if (data.result === "timeout") {
    showBattleResult("WIN!");
  }
});

socket.on("receiveGameState", data => {
  enemyBoard = data.board;
  enemyScore = data.score;
  enemyPlayerId = data.playerId;

  enemyBombs = data.bombs || [];
  enemyLasers = data.lasers || [];
  enemyLocks = data.locks || [];
  enemyShields = data.shields || [];
  enemyCurseBombs = data.curseBombs || [];

  drawEnemyBoard();

  const itemIcons = {
    bomb: "💣 폭탄",
    laser: "🔫 레이저",
    block: "🧱 블록"
  };

  const obstacleIcons = {
    lock: "🔒 잠금",
    shield: "🛡️ 방패",
    curseBomb: "💀 저주폭탄"
  };

  if (enemyPreviewText) {
    enemyPreviewText.innerHTML =
      `다음 아이템: ${itemIcons[data.nextRandomItem] || "없음"}<br>
       다음 방해물: ${obstacleIcons[data.nextObstacle] || "없음"}`;
  }

  if (enemyTurnText) {
    enemyTurnText.textContent = "남은 턴: " + data.turnCount;
  }

  if (enemyTimerBar) {
    let percent = (data.timer_M / 10) * 100;
    enemyTimerBar.style.width = percent + "%";

    if (percent < 30) enemyTimerBar.style.background = "#f44336";
    else if (percent < 60) enemyTimerBar.style.background = "#ff9800";
    else enemyTimerBar.style.background = "#4caf50";
  }

  if (enemySlotDivs_M && data.itemSlots) {
    const icons = {
      bomb: "💣",
      laser: "🔫",
      block: "🧱"
    };

    for (let i = 0; i < 3; i++) {
      enemySlotDivs_M[i].textContent = data.itemSlots[i] ? icons[data.itemSlots[i]] : "";
    }
  }
});

function sendMyGameState() {
  if (!currentRoomId) return;

  socket.emit("sendGameState", {
    roomId: currentRoomId,
    playerId: playerId,
    board: board,
    score: score,
    nextRandomItem: nextRandomItem,
    nextObstacle: nextObstacle,
    turnCount: turnCount,
    itemSlots: itemSlots,
    timer_M: timer_M,

    bombs: bombs,
    lasers: lasers,
    locks: locks,
    shields: shields,
    curseBombs: curseBombs
  });
}

function createMultiBattleLayout() {
  gameContainer.innerHTML = "";

const battleWrapper = document.createElement("div");
battleWrapper.style.display = "flex";
battleWrapper.style.width = "100%";
battleWrapper.style.height = "100%";

const mySide = document.createElement("div");
mySide.style.width = "50%";
mySide.style.height = "100%";
mySide.style.display = "flex";
mySide.style.flexDirection = "column";
mySide.style.alignItems = "center";
mySide.style.justifyContent = "center";
mySide.style.borderRight = "4px solid #81c784";
mySide.style.position = "relative";

const enemySide = document.createElement("div");
enemySide.style.width = "50%";
enemySide.style.height = "100%";
enemySide.style.display = "flex";
enemySide.style.flexDirection = "column";
enemySide.style.alignItems = "center";
enemySide.style.justifyContent = "center";

const myTitle = document.createElement("div");
myTitle.textContent = "내 화면";
myTitle.style.color = "#1b5e20";
myTitle.style.fontSize = "24px";
myTitle.style.fontWeight = "bold";
myTitle.style.marginBottom = "20px";

const enemyTitle = document.createElement("div");
enemyTitle.textContent = "상대 화면";
enemyTitle.style.color = "#1b5e20";
enemyTitle.style.fontSize = "24px";
enemyTitle.style.fontWeight = "bold";
enemyTitle.style.marginBottom = "20px";

const myArea = document.createElement("div");
myArea.id = "myGameArea";
myArea.style.position = "relative";

myResultText = document.createElement("div");
myResultText.style.fontSize = "50px";
myResultText.style.fontWeight = "bold";
myResultText.style.marginTop = "20px";
myResultText.style.display = "none";

enemyScoreText = document.createElement("div");
enemyScoreText.style.color = "#1b5e20";
enemyScoreText.style.fontSize = "22px";
enemyScoreText.style.fontWeight = "bold";
enemyScoreText.style.marginBottom = "20px";
enemyScoreText.textContent = "상대 Score: 0";

enemyPreviewText = document.createElement("div");
enemyPreviewText.style.color = "#1b5e20";
enemyPreviewText.style.fontSize = "18px";
enemyPreviewText.style.fontWeight = "bold";
enemyPreviewText.style.marginBottom = "10px";
enemyPreviewText.innerHTML = "다음 아이템: ?<br>다음 방해물: ?";

enemyTargetText = document.createElement("div");
enemyTargetText.style.color = "#1b5e20";
enemyTargetText.style.fontSize = "18px";
enemyTargetText.style.fontWeight = "bold";
enemyTargetText.style.marginBottom = "10px";
enemyTargetText.textContent = "목표: 30000";

enemyTurnText = document.createElement("div");
enemyTurnText.style.color = "#1b5e20";
enemyTurnText.style.fontSize = "18px";
enemyTurnText.style.fontWeight = "bold";
enemyTurnText.style.marginBottom = "10px";
enemyTurnText.textContent = "남은 턴: ?";

const enemyTimerContainer = document.createElement("div");
enemyTimerContainer.style.width = `${SIZE_M * 80}px`;
enemyTimerContainer.style.height = "20px";
enemyTimerContainer.style.background = "#ccc";
enemyTimerContainer.style.marginTop = "20px";

enemyTimerBar = document.createElement("div");
enemyTimerBar.style.height = "100%";
enemyTimerBar.style.width = "100%";
enemyTimerBar.style.background = "#4caf50";
enemyTimerBar.style.transition = "width 0.2s linear";

enemyTimerContainer.appendChild(enemyTimerBar);

const enemyItemPanel = document.createElement("div");
enemyItemPanel.style.display = "flex";
enemyItemPanel.style.gap = "10px";
enemyItemPanel.style.marginTop = "15px";

enemySlotDivs_M = [createSlot_M(), createSlot_M(), createSlot_M()];
enemySlotDivs_M.forEach(slot => enemyItemPanel.appendChild(slot));

enemyBoardDiv = document.createElement("div");
enemyBoardDiv.className = "board board-4";
enemyBoardDiv.style.gridTemplateColumns = `repeat(${SIZE_M}, 80px)`;
enemyBoardDiv.style.gridTemplateRows = `repeat(${SIZE_M}, 80px)`;

enemyResultText = document.createElement("div");
enemyResultText.style.fontSize = "50px";
enemyResultText.style.fontWeight = "bold";
enemyResultText.style.marginTop = "20px";
enemyResultText.style.display = "none";

mySide.appendChild(myTitle);
mySide.appendChild(myArea);

enemySide.appendChild(enemyTitle);
enemySide.appendChild(enemyScoreText);
enemySide.appendChild(enemyPreviewText);
enemySide.appendChild(enemyTargetText);
enemySide.appendChild(enemyTurnText);
enemySide.appendChild(enemyBoardDiv);
enemySide.appendChild(enemyTimerContainer);
enemySide.appendChild(enemyItemPanel);

mySide.appendChild(myResultText);
enemySide.appendChild(enemyResultText);


battleWrapper.appendChild(mySide);
battleWrapper.appendChild(enemySide);

gameContainer.appendChild(battleWrapper);

return myArea;
}

//타이머

function startTimer_M() {
  clearInterval(timerInterval_M);
  timer_M = 10;
  isTimeOut = false;

  updateTimerUI_M();

  timerInterval_M = setInterval(() => {
    timer_M--;

    updateTimerUI_M();
    sendMyGameState();

    if (timer_M <= 0) {
      clearInterval(timerInterval_M);
      isTimeOut = true;
      handleTimeOut_M();
    }
  }, 1000);
}


function updateTimerUI_M() {
  const bar = document.getElementById("timerBar");
  if (!bar) return;

  let percent = (timer_M / 10) * 100;
  bar.style.width = percent + "%";

  // 색 변화 (선택)
  if (percent < 30) bar.style.background = "#f44336";
  else if (percent < 60) bar.style.background = "#ff9800";
  else bar.style.background = "#4caf50";
}


function handleTimeOut_M() {
  if (window.cleared) return;

  window.cleared = true;

  if (currentRoomId) {
  socket.emit("gameResult", {
    result: "timeout"
  });

  showBattleResult("LOSE!");
  return;
}

  const clearText = document.getElementById("clearText");
  clearText.textContent = "TIME OUT!";
  clearText.style.color = "#d32f2f";
  clearText.style.display = "block";

  document.onkeydown = null;
}

//==뒤로가기==

function showBattleBackButton() {
  if (document.getElementById("battleBackBtn")) return;

  const backBtn = document.createElement("div");
  backBtn.id = "battleBackBtn";
  backBtn.className = "back-btn";
  backBtn.textContent = "뒤로가기";

  backBtn.onclick = () => {
    clearInterval(timerInterval_M);

    currentRoomId = null;

    gameContainer.classList.add("hidden");
    multiContainer.classList.remove("hidden");

    resetMultiUI();
  };

  gameContainer.appendChild(backBtn);
}


//  방 해 요 소

function spawnLocks_M() {
  let cells = [];

  // 숫자 있는 칸만
  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (
        board[i][j] > 0 &&
        !locks.some(l => l.x === i && l.y === j)
      ) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 셔플
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  let count = Math.min(3, cells.length);

  for (let i = 0; i < count; i++) {
    locks.push({
      x: cells[i].x,
      y: cells[i].y,
      turn: 3 // ⭐ 3턴 지속
    });
  }
}

function updateLocks() {
  locks.forEach(l => l.turn--);
  locks = locks.filter(l => l.turn > 0);
}

function isLocked(i, j) {
  return locks.some(l => l.x === i && l.y === j);
}


function spawnShields_M() {
  let empty = [];

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (
        board[i][j] === 0 &&
        !shields.some(s => s.x === i && s.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  // 셔플
  for (let i = empty.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [empty[i], empty[r]] = [empty[r], empty[i]];
  }

  let count = Math.min(2, empty.length);

  for (let i = 0; i < count; i++) {
    shields.push({
      x: empty[i].x,
      y: empty[i].y,
      turn: 3
    });
  }
}

function updateShields() {
  shields.forEach(s => s.turn--);
  shields = shields.filter(s => s.turn > 0);
}

function isShield(x, y) {
  return shields.some(s => s.x === x && s.y === y);
}

function moveShields_M(dx, dy) {
  shields.forEach(s => {
    let x = s.x;
    let y = s.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_M ||
        ny < 0 || ny >= SIZE_M ||
        board[nx][ny] !== 0 ||
        shields.some(other => other !== s && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    s.x = x;
    s.y = y;
  });
}

function spawnCurseBomb_M() {
  let empty = [];

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j) &&
        !curseBombs.some(c => c.x === i && c.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  curseBombs.push(pos);
}

function moveCurseBombs_M(dx, dy) {
  let exploded = [];

  curseBombs.forEach(c => {
    let x = c.x;
    let y = c.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_M ||
        ny < 0 || ny >= SIZE_M ||
        board[nx][ny] !== 0 ||
        curseBombs.some(other => other !== c && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    c.x = x;
    c.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_M ||
      ny < 0 || ny >= SIZE_M ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeCurseBomb_M(pos.x, pos.y));

  curseBombs = curseBombs.filter(c =>
    !exploded.some(e => e.x === c.x && e.y === c.y)
  );
}

function explodeCurseBomb_M(x, y) {
  for (let j = 0; j < SIZE_M; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      let after = Math.floor(before / 2);

      board[x][j] = after;

      score -= (before - after); // ⭐ 감소량 만큼 점수 감소
      if (score < 0) score = 0; // 음수 방지 (선택)
    }
  }
}

function triggerRandomObstacle_M() {
  const types = ["lock", "shield", "curseBomb"];
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "lock") spawnLocks_M();
  if (type === "shield") spawnShields_M();
  if (type === "curseBomb") spawnCurseBomb_M();
}



// 아 이 템
function addItemToSlot(type) {
  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = type;
      break;
    }
  }
}

function updateSlotUI_M() {
  const icons = {
    bomb: "💣",
    laser: "🔫",
    block: "🧱"
  };

  for (let i = 0; i < 3; i++) {
    slotDivs_M[i].textContent = itemSlots[i] ? icons[itemSlots[i]] : "";
  }
}

function giveRandomItem() {
  if (itemSlots.every(v => v !== null)) return;

  const types = ["bomb", "laser", "block"];
  const newItem = types[Math.floor(Math.random() * types.length)];

  for (let i = 0; i < 3; i++) {
    if (itemSlots[i] === null) {
      itemSlots[i] = newItem;
      break;
    }
  }

  updateSlotUI_M();
}

function createSlot_M() {
  const div = document.createElement("div");
  div.style.width = "80px";
  div.style.height = "80px";
  div.style.border = "2px solid #333";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.background = "#eee";
  return div;
}

function updateTurnUI() {
  document.getElementById("turnText").textContent = `남은 턴: ${turnCount}`;
}

function useItem_M(index) {
  const type = itemSlots[index];
  if (!type) return;

  if (type === "bomb") spawnBomb_M();
  if (type === "laser") spawnLaser_M();
  if (type === "block") useBlockItem_M();

  itemSlots[index] = null;

  updateSlotUI_M();
  draw_M(document.querySelector(".board"));
  document.getElementById("scoreText").textContent = playerId + " Score: " + score;}

  sendMyGameState();

function spawnBomb_M() {
  let empty = [];

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (board[i][j] === 0 && !bombs.some(b => b.x === i && b.y === j)) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  bombs.push(pos);
}

function moveBombs_M(dx, dy) {
  let exploded = [];

  bombs.forEach(b => {
    let x = b.x;
    let y = b.y;

    // 계속 이동
    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_M ||
        ny < 0 || ny >= SIZE_M ||
        board[nx][ny] !== 0 ||
        bombs.some(other => other !== b && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    // 이동 완료 위치
    b.x = x;
    b.y = y;

    // 한 칸 더 가보면 막힘 → 폭발
    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_M ||
      ny < 0 || ny >= SIZE_M ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  // 폭발 처리
  exploded.forEach(pos => explodeBomb_M(pos.x, pos.y));

  // 제거
  bombs = bombs.filter(b => !exploded.some(e => e.x === b.x && e.y === b.y));
}

function explodeBomb_M(x, y) {
  for (let i = x - 1; i <= x + 1; i++) {
    for (let j = y - 1; j <= y + 1; j++) {
      if (i >= 0 && i < SIZE_M && j >= 0 && j < SIZE_M) {
        if (board[i][j] > 0) {
          let before = board[i][j];
          board[i][j] *= 2;
          score += before; // 증가량만 점수
        }
      }
    }
  }
}

function spawnLaser_M() {
  let empty = [];

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (
        board[i][j] === 0 &&
        !bombs.some(b => b.x === i && b.y === j) &&
        !lasers.some(l => l.x === i && l.y === j)
      ) {
        empty.push({ x: i, y: j });
      }
    }
  }

  if (empty.length === 0) return;

  const pos = empty[Math.floor(Math.random() * empty.length)];
  lasers.push(pos);
}

function moveLasers_M(dx, dy) {
  let exploded = [];

  lasers.forEach(l => {
    let x = l.x;
    let y = l.y;

    while (true) {
      let nx = x + dx;
      let ny = y + dy;

      if (
        nx < 0 || nx >= SIZE_M ||
        ny < 0 || ny >= SIZE_M ||
        board[nx][ny] !== 0 ||
        lasers.some(other => other !== l && other.x === nx && other.y === ny)
      ) {
        break;
      }

      x = nx;
      y = ny;
    }

    l.x = x;
    l.y = y;

    let nx = x + dx;
    let ny = y + dy;

    if (
      nx < 0 || nx >= SIZE_M ||
      ny < 0 || ny >= SIZE_M ||
      board[nx][ny] !== 0
    ) {
      exploded.push({ x, y });
    }
  });

  exploded.forEach(pos => explodeLaser_M(pos.x, pos.y));

  lasers = lasers.filter(l => !exploded.some(e => e.x === l.x && e.y === l.y));
}

function explodeLaser_M(x, y) {
  // 가로 (좌우)
  for (let j = 0; j < SIZE_M; j++) {
    if (board[x][j] > 0) {
      let before = board[x][j];
      board[x][j] *= 2;
      score += before;
    }
  }

  // 세로 (상하)
  for (let i = 0; i < SIZE_M; i++) {
    if (i === x) continue;

    if (board[i][y] > 0) {
      let before = board[i][y];
      board[i][y] *= 2;
      score += before;
    }
  }
}

function useBlockItem_M() {
  let cells = [];

  // 1. 숫자 있는 칸만 수집
  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (board[i][j] > 0) {
        cells.push({ x: i, y: j });
      }
    }
  }

  if (cells.length === 0) return;

  // 2. 섞기 (셔플)
  for (let i = cells.length - 1; i > 0; i--) {
    let r = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[r]] = [cells[r], cells[i]];
  }

  // 3. 최대 5개 선택
  let count = Math.min(5, cells.length);

  for (let k = 0; k < count; k++) {
    let { x, y } = cells[k];

    let before = board[x][y];
    board[x][y] *= 2;

    score += before; // 증가량만 점수
  }
}

function addRandom_M() {
  let empty = [];

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      if (board[i][j] === 0) empty.push([i, j]);
    }
  }

  if (empty.length === 0) return;

  const [x, y] = empty[Math.floor(Math.random() * empty.length)];

  let value;
    const r = Math.random();
    if (r < 0.5) value = 4;
    else if (r < 0.8) value = 8;
    else value = 16;
  
    
  

  board[x][y] = value;
}

function draw_M(boardDiv) {
  boardDiv.innerHTML = "";

  for (let i = 0; i < SIZE_M; i++) {
    for (let j = 0; j < SIZE_M; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      let bombHere = bombs.some(b => b.x === i && b.y === j);
      let laserHere = lasers.some(l => l.x === i && l.y === j);
      let lockHere = locks.some(l => l.x === i && l.y === j);
      let shieldHere = shields.some(s => s.x === i && s.y === j); // ⭐ 추가
      let curseHere = curseBombs.some(c => c.x === i && c.y === j);

      if (shieldHere) {
        cell.textContent = "🛡️";
      } else if (lockHere) {
        cell.textContent = "🔒";
      } else if (curseHere) {
        cell.textContent = "💀";
      } else if (laserHere) {
        cell.textContent = "🔫";
      } else if (bombHere) {
        cell.textContent = "💣";
      } else {
        cell.textContent = board[i][j] || "";
      }

      boardDiv.appendChild(cell);
    }
  }
  updateTurnUI();
}

function showBattleResult(myResult) {
  clearInterval(timerInterval_M);
  document.onkeydown = null;
  window.cleared = true;

  const enemyResult = myResult === "WIN!" ? "LOSE!" : "WIN!";

  if (myResultText) {
    myResultText.textContent = myResult;
    myResultText.style.color = myResult === "WIN!" ? "#2e7d32" : "#d32f2f";
    myResultText.style.display = "block";
  }

  if (enemyResultText) {
    enemyResultText.textContent = enemyResult;
    enemyResultText.style.color = enemyResult === "WIN!" ? "#2e7d32" : "#d32f2f";
    enemyResultText.style.display = "block";
  }

  showBattleBackButton();
}

function handleKey_M(e) {
  let moved = false;

  if (e.key === "a" || e.key === "A") {
    useItem_M(0);
    return;
  }

  if (e.key === "s" || e.key === "S") {
    useItem_M(1);
    return;
  }

  if (e.key === "d" || e.key === "D") {
    useItem_M(2);
    return;
  }

  function merge(arr) {
    let original = [...arr];

    arr = arr.filter(v => v);

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        

        arr[0] *= 2;
        score += arr[0];
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(v => v);
    while (arr.length < SIZE_M) arr.push(0);

    if (arr.join() !== original.join()) moved = true;

    return arr;
  }

  if (e.key === "ArrowLeft") {
  for (let i = 0; i < SIZE_M; i++) {

    let newRow = Array(SIZE_M).fill(0);
    let target = 0; // 채워질 위치

    for (let j = 0; j < SIZE_M; j++) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 현재 칸이 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j + 1;
        continue;
      }

      // 🔥 합치기 시도
      if (
        target > 0 &&
        newRow[target - 1] === val &&
        !isLocked(i, target - 1) &&// 🔒 합쳐질 자리도 잠금이면 안됨
        !isShield(i, target - 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target - 1] *= 2;
        score += newRow[target - 1];
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target++;
      }
    }

    board[i] = newRow;
  }
  moveShields_M(0, -1);
  moveCurseBombs_M(0, -1); // Left
  moveBombs_M(0, -1);
  moveLasers_M(0, -1);
}

  if (e.key === "ArrowRight") {
  for (let i = 0; i < SIZE_M; i++) {

    let newRow = Array(SIZE_M).fill(0);
    let target = SIZE_M - 1; // 오른쪽부터

    for (let j = SIZE_M - 1; j >= 0; j--) {
      let val = board[i][j];
      if (val === 0) continue;

      // 🔒 잠금이면 이동 금지
      if (isLocked(i, j)) {
        newRow[j] = val;
        target = j - 1;
        continue;
      }

      // 🔥 합치기
      if (
        target < SIZE_M - 1 &&
        newRow[target + 1] === val &&
        !isLocked(i, target + 1) &&
        !isShield(i, target + 1) && // ⭐ 추가
        !isShield(i, j)             // ⭐ 추가
      ) {
        newRow[target + 1] *= 2;
        score += newRow[target + 1];
        moved = true;
      } else {
        if (target !== j) moved = true;
        newRow[target] = val;
        target--;
      }
    }

    board[i] = newRow;
  }
  moveShields_M(0, 1);
  moveCurseBombs_M(0, 1); // Right
  moveBombs_M(0, 1);
  moveLasers_M(0, 1);
}

  if (e.key === "ArrowUp") {
  for (let j = 0; j < SIZE_M; j++) {

    let newCol = Array(SIZE_M).fill(0);
    let target = 0;

    for (let i = 0; i < SIZE_M; i++) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i + 1;
        continue;
      }

      if (
        target > 0 &&
        newCol[target - 1] === val &&
        !isLocked(target - 1, j) &&
        !isShield(target - 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target - 1] *= 2;
        score += newCol[target - 1];
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target++;
      }
    }

    for (let i = 0; i < SIZE_M; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_M(-1, 0);
  moveCurseBombs_M(-1, 0); // Up
  moveBombs_M(-1, 0);
  moveLasers_M(-1, 0);
}

 if (e.key === "ArrowDown") {
  for (let j = 0; j < SIZE_M; j++) {

    let newCol = Array(SIZE_M).fill(0);
    let target = SIZE_M - 1;

    for (let i = SIZE_M - 1; i >= 0; i--) {
      let val = board[i][j];
      if (val === 0) continue;

      if (isLocked(i, j)) {
        newCol[i] = val;
        target = i - 1;
        continue;
      }

      if (
        target < SIZE_M - 1 &&
        newCol[target + 1] === val &&
        !isLocked(target + 1, j) &&
        !isShield(target + 1, j) &&
        !isShield(i, j)

      ) {
        newCol[target + 1] *= 2;
        score += newCol[target + 1];
        moved = true;
      } else {
        if (target !== i) moved = true;
        newCol[target] = val;
        target--;
      }
    }

    for (let i = 0; i < SIZE_M; i++) {
      board[i][j] = newCol[i];
    }
  }
  moveShields_M(1, 0);
  moveCurseBombs_M(1, 0);
  moveBombs_M(1, 0);
  moveLasers_M(1, 0);
}

  if (moved) {
    timer_M = 10; // ⭐ 타이머 풀충전
    updateTimerUI_M();
    turnCount--;

    updateLocks();
    updateShields();

  if (turnCount < 0) {
  turnCount = 5;

  givePreviewItem();
  triggerPreviewObstacle();

  setNextRandoms();
  }

  addRandom_M();
  addRandom_M();
  

    draw_M(document.querySelector(".board"));
 document.getElementById("scoreText").textContent = playerId + " Score: " + score;
  updateTurnUI();
  sendMyGameState();
}
    

  // ⭐ 클리어 조건 (30000점)
  if (score >= 30000 && !window.cleared && !isTimeOut) {
  window.cleared = true;

  if (currentRoomId) {
    socket.emit("gameResult", {
    result: "clear"
  });

    showBattleResult("WIN!");
    return;
  }

  clearInterval(timerInterval_M);

  const clearText = document.getElementById("clearText");
  clearText.textContent = `CLEAR!`;
  clearText.style.display = "block";
}

}






  
};