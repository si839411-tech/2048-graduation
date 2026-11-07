/* Mobile support: swipe generates the same arrow-key input used by desktop. */
(() => {
  'use strict';
  const game = document.getElementById('gameContainer');
  if (!game) return;
  const mobile = matchMedia('(max-width: 700px)');
  const pad = document.createElement('div');
  pad.className = 'mobile-direction-pad';
  pad.setAttribute('aria-label', '게임 방향 조작');
  const entries = [['↑','ArrowUp'],['←','ArrowLeft'],['↓','ArrowDown'],['→','ArrowRight']];
  function move(key) {
    if (game.classList.contains('hidden')) return;
    // Existing stage handlers listen on document.onkeydown.
    const event = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true });
    document.dispatchEvent(event);
  }
  for (const [label, key] of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', key.replace('Arrow', ''));
    button.addEventListener('click', () => move(key));
    pad.appendChild(button);
  }
  document.body.appendChild(pad);
  let start = null;
  game.addEventListener('touchstart', (e) => {
    if (!mobile.matches || game.classList.contains('hidden') || e.touches.length !== 1) { start = null; return; }
    if (e.target.closest('button, input, select, textarea, .mobile-direction-pad, .back-btn, .shop-item')) { start = null; return; }
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  game.addEventListener('touchmove', (e) => {
    if (mobile.matches && start && e.cancelable) e.preventDefault();
  }, { passive: false });
  game.addEventListener('touchend', (e) => {
    if (!start || !mobile.matches || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    move(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
  }, { passive: true });
  game.addEventListener('touchcancel', () => { start = null; }, { passive: true });

  /* Scale PC-sized game content for narrow screens without modifying gameplay rules. */
  function fitGame() {
    pad.style.display = mobile.matches && !game.classList.contains('hidden') ? 'grid' : 'none';
    if (!mobile.matches) return;
    // The widest boards are ~880px, while 4x4 / 5x5 boards need less room.
    const boards = [...game.querySelectorAll('.board, .board-4, [style*="grid-template-columns"]')]
      .filter(el => !el.closest('.mobile-direction-pad'));
    let maxBoard = 0;
    for (const board of boards) {
      const css = getComputedStyle(board);
      if (css.display === 'none') continue;
      maxBoard = Math.max(maxBoard, board.scrollWidth || board.offsetWidth);
    }
    const available = window.innerWidth - 20;
    let scale = maxBoard ? Math.min(1, available / (maxBoard + 30)) : 1;
    // Scale only the gameplay boards; keep overlay controls readable.
    for (const board of boards) {
      if (!board.dataset.mobileOriginalTransform) board.dataset.mobileOriginalTransform = board.style.transform || 'none';
      if (!board.dataset.mobileOriginalOrigin) board.dataset.mobileOriginalOrigin = board.style.transformOrigin || '';
      board.style.transform = scale < 1 ? `scale(${scale})` : board.dataset.mobileOriginalTransform;
      board.style.transformOrigin = scale < 1 ? 'center center' : board.dataset.mobileOriginalOrigin;
      board.style.marginLeft = scale < 1 ? `${-(1-scale)*board.offsetWidth/2}px` : '';
      board.style.marginRight = scale < 1 ? `${-(1-scale)*board.offsetWidth/2}px` : '';
    }
  }
  let queued = false;
  function scheduleFit() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fitGame(); });
  }
  const observer = new MutationObserver(scheduleFit);
  observer.observe(game, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
  addEventListener('resize', scheduleFit);
  scheduleFit();
  // Mobile item activation: reuse the currently active stage's A/S/D item shortcuts.
  game.addEventListener('click', (e) => {
    if (!mobile.matches || game.classList.contains('hidden')) return;
    const slot = e.target.closest('.game-item-panel > *, .game-item-panel-inline > *');
    if (!slot || slot.closest('.multi-enemy-side, .ai-enemy-side')) return;
    const panel = slot.parentElement;
    const index = Array.prototype.indexOf.call(panel.children, slot);
    if (index < 0 || index > 2 || !slot.textContent.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    const key = ['a', 's', 'd'][index];
    if (typeof document.onkeydown === 'function') {
      document.onkeydown(new KeyboardEvent('keydown', { key, code: 'Key' + key.toUpperCase(), bubbles: true }));
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, code: 'Key' + key.toUpperCase(), bubbles: true }));
    }
  });
  function labelItemSlots() {
    if (!mobile.matches) return;
    game.querySelectorAll('.game-item-panel, .game-item-panel-inline').forEach(panel => {
      if (panel.closest('.multi-enemy-side, .ai-enemy-side')) return;
      Array.from(panel.children).slice(0, 3).forEach((slot, i) => {
        slot.setAttribute('role', 'button');
        slot.setAttribute('aria-label', '아이템 ' + (i + 1) + ' 사용');
        slot.style.cursor = 'pointer';
        slot.style.touchAction = 'manipulation';
      });
    });
  }
  const itemObserver = new MutationObserver(labelItemSlots);
  itemObserver.observe(game, {childList: true, subtree: true});
  labelItemSlots();
})();
