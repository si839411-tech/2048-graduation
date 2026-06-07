const express = require("express");
const app = express();

const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const playersInMulti = new Set();

// 현재 폴더의 html, js, css 파일을 서버에서 보여줌
app.use(express.static(__dirname));

// 접속 중인 ID 저장
const usedIds = new Set();

let waitingPlayer = null;
const rooms = {};

const idToSocket = new Map();

io.on("connection", socket => {

  function leaveCurrentRoom(socket) {
  if (!socket.roomId) return;

  const oldRoomId = socket.roomId;
  const room = rooms[oldRoomId];

  socket.leave(oldRoomId);
  socket.roomId = null;

  if (room) {
    delete rooms[oldRoomId];
    io.emit("roomListUpdate", Object.values(rooms).filter(r => !r.private));
  }
}

socket.on("enterMulti", playerId => {
  const id = playerId || socket.playerId;

  if (!id) return;

  playersInMulti.add(id);
});

socket.on("leaveMulti", playerId => {
  const id = playerId || socket.playerId;

  if (!id) return;

  playersInMulti.delete(id);
});

  console.log("접속:", socket.id);
  socket.on("leaveRoom", () => {
  leaveCurrentRoom(socket);
});

  socket.on("invitePlayer", targetId => {
    leaveCurrentRoom(socket); // ⭐ 추가
  targetId = String(targetId).trim();

  if (!socket.playerId) {
    socket.emit("roomError", "ID를 먼저 설정하세요");
    return;
  }

  if (!targetId) {
    socket.emit("roomError", "초대할 ID를 입력하세요");
    return;
  }

  if (targetId === socket.playerId) {
    socket.emit("roomError", "자기 자신은 초대할 수 없습니다");
    return;
  }

  const targetSocketId = idToSocket.get(targetId);

  if (!targetSocketId) {
    socket.emit("roomError", "해당 ID가 접속 중이 아닙니다");
    return;
  }

  if (!playersInMulti.has(targetId)) {
  socket.emit("inviteRejected", {
    targetId: targetId
  });


  return;
}

  const roomId = "invite_" + Date.now();

  rooms[roomId] = {
    roomId,
    title: socket.playerId + "의 초대방",
    hostId: socket.id,
    hostName: socket.playerId,
    guestId: null,
    guestName: null,
    status: "private_waiting",
    private: true,
    invitedId: targetId
  };

  socket.join(roomId);
  socket.roomId = roomId;

  socket.emit("enterWaitingRoom", rooms[roomId]);

  io.to(targetSocketId).emit("receiveInvite", {
    roomId,
    fromId: socket.playerId,
    title: rooms[roomId].title
  });
});

socket.on("acceptInvite", roomId => {
  const room = rooms[roomId];

  if (!room) {
    socket.emit("roomError", "초대방이 사라졌습니다");
    return;
  }

  if (room.invitedId !== socket.playerId) {
    socket.emit("roomError", "초대받은 사람이 아닙니다");
    return;
  }

  room.guestId = socket.id;
  room.guestName = socket.playerId;
  room.status = "private_ready";

  socket.join(roomId);
  socket.roomId = roomId;

  io.to(roomId).emit("enterWaitingRoom", room);
  io.to(roomId).emit("inviteAccepted", room);
});

socket.on("rejectInvite", data => {
  if (!data || !data.roomId) return;

  const room = rooms[data.roomId];
  if (!room) return;

  if (room.invitedId !== socket.playerId) {
    socket.emit("roomError", "초대받은 사람이 아닙니다");
    return;
  }

  const hostSocketId = room.hostId;

  io.to(hostSocketId).emit("inviteRejected", {
    targetId: socket.playerId
  });

  const hostSocket = io.sockets.sockets.get(hostSocketId);
  if (hostSocket) {
    hostSocket.leave(data.roomId);
    hostSocket.roomId = null;
  }

  socket.leave(data.roomId);
  socket.roomId = null;

  delete rooms[data.roomId];
});

  socket.on("startRoomGame", () => {
  const roomId = socket.roomId;
  const room = rooms[roomId];

  if (!room) {
    socket.emit("roomError", "방이 없습니다");
    return;
  }

  if (room.hostId !== socket.id) {
    socket.emit("roomError", "방장만 시작할 수 있습니다");
    return;
  }

  if (!room.guestId) {
    socket.emit("roomError", "상대가 아직 없습니다");
    return;
  }

  room.status = "playing";

  io.to(roomId).emit("matchFound", {
    roomId: roomId,
    players: [room.hostName, room.guestName]
  });

  io.emit("roomListUpdate", Object.values(rooms));
});



  socket.on("createRoom", roomTitle => {
  leaveCurrentRoom(socket); // ⭐ 추가
  if (!socket.playerId) {
    socket.emit("roomError", "ID를 먼저 설정하세요");
    return;
  }

  roomTitle = String(roomTitle).trim();

  if (!roomTitle) {
    socket.emit("roomError", "방 제목을 입력하세요");
    return;
  }

  const roomId = "room_" + Date.now();

  rooms[roomId] = {
    roomId,
    title: roomTitle,
    hostId: socket.id,
    hostName: socket.playerId,
    guestId: null,
    guestName: null,
    status: "waiting"
  };

  socket.join(roomId);
  socket.roomId = roomId;

  socket.emit("enterWaitingRoom", rooms[roomId]);
  io.emit("roomListUpdate", Object.values(rooms));

  console.log("방 생성:", roomTitle);
});

socket.on("joinRoomById", roomId => {
  const room = rooms[roomId];

  if (!room) {
    socket.emit("roomError", "존재하지 않는 방입니다");
    return;
  }

  if (room.status !== "waiting") {
    socket.emit("roomError", "이미 시작된 방입니다");
    return;
  }

  if (room.hostId === socket.id) {
    socket.emit("enterWaitingRoom", room);
    return;
  }

  if (room.guestId) {
    socket.emit("roomError", "방이 가득 찼습니다");
    return;
  }

  room.guestId = socket.id;
  room.guestName = socket.playerId;

  socket.join(roomId);
  socket.roomId = roomId;

  io.to(roomId).emit("enterWaitingRoom", room);
  io.emit(
  "roomListUpdate",
  Object.values(rooms).filter(room => !room.private)
);

  console.log("방 입장:", room.title, socket.playerId);
});

socket.on("requestRoomList", () => {
  socket.emit(
    "roomListUpdate",
    Object.values(rooms).filter(room => !room.private)
  );
});

  // ID 설정 요청
  socket.on("setPlayerId", id => {
    id = String(id).trim();

    if (!id) {
      socket.emit("idRejected", "ID를 입력하세요");
      return;
    }

    if (usedIds.has(id) && socket.playerId !== id) {
      socket.emit("idRejected", "이미 사용중인 ID입니다");
      return;
    }

    // 기존 ID가 있으면 제거
    if (socket.playerId) {
  usedIds.delete(socket.playerId);
  idToSocket.delete(socket.playerId);
}

    socket.playerId = id;
    idToSocket.set(id, socket.id);
    usedIds.add(id);

    socket.emit("idAccepted", id);
    console.log("ID 등록:", id);
  });

  socket.on("disconnect", () => {
    if (socket.playerId) {
      usedIds.delete(socket.playerId);
      idToSocket.delete(socket.playerId);
      playersInMulti.delete(socket.playerId);
      console.log("ID 제거:", socket.playerId);
    }
    if (waitingPlayer && waitingPlayer.id === socket.id) {
  waitingPlayer = null;
}

    console.log("나감:", socket.id);

    for (const roomId in rooms) {
  const room = rooms[roomId];

  if (room.hostId === socket.id || room.guestId === socket.id) {
    delete rooms[roomId];
    io.emit("roomListUpdate", Object.values(rooms));
  }
}
  });
  socket.on("startMatching", () => {
    console.log("매칭 요청:", socket.id, socket.playerId);
  if (!socket.playerId) {
    socket.emit("matchError", "ID를 먼저 설정하세요");
    return;
  }
  

  // 대기자가 없으면 내가 대기
  if (!waitingPlayer) {
    waitingPlayer = socket;
    socket.emit("matchingWaiting");
    console.log(socket.playerId + " 매칭 대기중");
    return;
  }

  // 자기 자신이면 무시
  if (waitingPlayer.id === socket.id) {
    socket.emit("matchingWaiting");
    return;
  }

  // 대기자와 현재 유저 매칭
  const player1 = waitingPlayer;
  const player2 = socket;

  waitingPlayer = null;

  const roomId = "room_" + Date.now();

  player1.join(roomId);
  player2.join(roomId);

  player1.roomId = roomId;
  player2.roomId = roomId;

  io.to(roomId).emit("matchFound", {
    roomId: roomId,
    players: [
      player1.playerId,
      player2.playerId
    ]
  });

  console.log("매칭 완료:", player1.playerId, player2.playerId);
});
socket.on("cancelMatching", () => {
  if (waitingPlayer && waitingPlayer.id === socket.id) {
    waitingPlayer = null;
    socket.emit("matchingCanceled");
    console.log(socket.playerId + " 매칭 취소");
  }
});
  socket.on("sendObstacleToEnemy", data => {
  if (!socket.roomId) return;

  socket.to(socket.roomId).emit("receiveObstacle", {
    type: data.type
  });
});

socket.on("sendGameState", data => {
  if (!socket.roomId) return;

  socket.to(socket.roomId).emit("receiveGameState", {
    playerId: socket.playerId,
    board: data.board,
    score: data.score,
    nextRandomItem: data.nextRandomItem,
    nextObstacle: data.nextObstacle,
    turnCount: data.turnCount,
    itemSlots: data.itemSlots,
    timer_M: data.timer_M,

    bombs: data.bombs,
    lasers: data.lasers,
    locks: data.locks,
    shields: data.shields,
    curseBombs: data.curseBombs
  });
});

socket.on("gameResult", data => {
  if (!socket.roomId) return;

  socket.to(socket.roomId).emit("enemyGameResult", {
    result: data.result
  });
});


});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log("서버 실행 중:", PORT);
});



