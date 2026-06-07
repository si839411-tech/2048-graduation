export const Game2048 = (() => {

  let board, score, container, callback;

  function init(parent, onWin) {
    container = parent;
    callback = onWin;

    container.innerHTML = "";

    score = 0;
    board = [
      [0, 0],
      [0, 0]
    ];

    const boardDiv = document.createElement("div");
    boardDiv.className = "board";
    container.appendChild(boardDiv);

    addRandom();
    addRandom();
    draw(boardDiv);

    document.onkeydown = (e) => handleKey(e, boardDiv);
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

  function addRandom() {
    let empty = [];

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        if (board[i][j] === 0) empty.push([i, j]);
      }
    }

    if (!empty.length) return;

    const [x, y] = empty[Math.floor(Math.random() * empty.length)];
    board[x][y] = Math.random() < 0.9 ? 2 : 4;
  }

  function handleKey(e, boardDiv) {
    let moved = false;

    if (e.key === "ArrowLeft") {
      for (let i = 0; i < 2; i++) {
        let row = board[i].filter(v => v);
        while (row.length < 2) row.push(0);

        if (row[0] === row[1] && row[0] !== 0) {
          row[0] *= 2;
          row[1] = 0;
          score += row[0];
          moved = true;
        }

        row = row.filter(v => v);
        while (row.length < 2) row.push(0);

        board[i] = row;
      }
    }

    if (moved) {
      addRandom();
      draw(boardDiv);

      if (score >= 16 && callback) callback();
    }
  }

  return { init };

})();