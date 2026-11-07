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
  const toolbar = document.createElement('div');
  toolbar.className = 'mobile-game-toolbar';
  function organizeControls() {
    if (!mobile.matches || game.classList.contains('hidden')) return;
    if (toolbar.parentElement !== game) game.appendChild(toolbar);
    // Only one back control on mobile. Prefer the latest stage-created control,
    // retaining its original click handler; remove stale duplicates.
    const backs = [...game.querySelectorAll('.back-btn, .multi-back-btn')];
    if (backs.length) {
      const active = backs[backs.length - 1];
      for (const btn of backs) {
        if (btn !== active) btn.remove();
      }
      if (active.parentElement !== toolbar) toolbar.prepend(active);
    }
    if (pad.parentElement !== toolbar) toolbar.appendChild(pad);
  }
  let start = null;
  game.addEventListener('touchstart', (e) => {
    if (!mobile.matches || game.classList.contains('hidden') || e.touches.length !== 1) { start = null; return; }
    if (!e.target.closest('.board, .cell') || e.target.closest('button, input, select, textarea, .mobile-direction-pad, .back-btn, .shop-item')) { start = null; return; }
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

  // Normalize older stage item panels which were created without a CSS class.
  // Move them after their board instead of positioning over the board.
  function normalizeStagePanels() {
    if (!mobile.matches) return;
    const boards = [...game.querySelectorAll('.board')];
    if (!boards.length) return;
    const known = [...game.querySelectorAll('.game-item-panel, .game-item-panel-inline, .mobile-item-row')];
    const slotCandidates = [...game.querySelectorAll('div')].filter(el => {
      if (el === game || el.classList.contains('board') || el.closest('.board')) return false;
      if (el.closest('.multi-enemy-side, .ai-enemy-side')) return false;
      if (known.includes(el)) return false;
      if (el.children.length !== 3) return false;
      return [...el.children].every(child => child.tagName === 'DIV' &&
        (child.style.border.includes('solid') || child.style.background === 'rgb(238, 238, 238)' || child.style.background === '#eee'));
    });
    for (const panel of [...known, ...slotCandidates]) {
      if (panel.closest('.multi-enemy-side, .ai-enemy-side')) continue;
      if (!panel.classList.contains('game-item-panel') && !panel.classList.contains('game-item-panel-inline')) {
        panel.classList.add('mobile-item-row');
      }
      const localBoard = boards.find(b => b.parentElement === panel.parentElement) || boards[0];
      if (panel.parentElement === localBoard.parentElement && localBoard.nextElementSibling !== panel) {
        localBoard.insertAdjacentElement('afterend', panel);
      }
    }
  }
  /* Fit the actual grid tracks, not a transformed board with oversized cells. */
  // Desktop: anchor item slots to the actual board edge, not the viewport edge.
  function positionDesktopItems() {
    const panels = [...game.querySelectorAll('.game-item-panel, .game-item-panel-inline')]
      .filter(p => !p.closest('.multi-enemy-side, .ai-enemy-side'));
    if (mobile.matches) {
      panels.forEach(p => {
        if (p.dataset.desktopSlotAnchor === '1') {
          ['position','left','right','top','bottom','transform','flex-direction','z-index'].forEach(k => p.style.removeProperty(k));
          delete p.dataset.desktopSlotAnchor;
        }
      });
      return;
    }
    if (game.classList.contains('hidden')) return;
    const boards = [...game.querySelectorAll('.board')]
      .filter(b => !b.closest('.multi-enemy-side, .ai-enemy-side'));
    for (const panel of panels) {
      const board = boards.find(b => b.parentElement === panel.parentElement) || boards[0];
      if (!board) continue;
      const rect = board.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const panelWidth = panel.getBoundingClientRect().width || 70;
      const gap = 30; // Desktop: leave a comfortable 30px gap between board and item slots.
      // Prefer the board's right side, with a left-side fallback on narrow desktop windows.
      const rightSpace = window.innerWidth - rect.right;
      const left = rightSpace >= panelWidth + gap + 8
        ? rect.right + gap : Math.max(8, rect.left - panelWidth - gap);
      panel.style.setProperty('position', 'fixed', 'important');
      panel.style.setProperty('left', `${Math.round(left)}px`, 'important');
      panel.style.setProperty('right', 'auto', 'important');
      panel.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
      panel.style.setProperty('bottom', 'auto', 'important');
      panel.style.setProperty('transform', 'none', 'important');
      panel.style.setProperty('flex-direction', 'column', 'important');
      panel.style.setProperty('z-index', '30', 'important');
      panel.dataset.desktopSlotAnchor = '1';
    }
  }
  function fitGame() {
    pad.style.display = mobile.matches && !game.classList.contains('hidden') ? 'grid' : 'none';
    positionDesktopItems();
    if (!mobile.matches) return;
    normalizeStagePanels();
    organizeControls();
    game.querySelectorAll('.board').forEach(board => {
      const raw = board.style.gridTemplateColumns || '';
      const match = raw.match(/repeat\(\s*(\d+)\s*,/);
      const cols = match ? Number(match[1]) : (board.classList.contains('board-4') ? 4 : 2);
      const rowRaw = board.style.gridTemplateRows || '';
      const rowMatch = rowRaw.match(/repeat\(\s*(\d+)\s*,/);
      const rows = rowMatch ? Number(rowMatch[1]) : cols;
      // Fit BOTH axes. 7x11 and other tall boards must not exceed mobile viewport.
      const availableHeight = Math.max(170, window.innerHeight * (rows > 7 ? .39 : rows > 5 ? .40 : .43));
      const width = Math.max(125, Math.min(window.innerWidth - 28, 350, availableHeight * cols / rows));
      const gap = Math.max(3, Math.min(7, Math.floor(width / (cols * 12))));
      const side = Math.floor((width - gap * (cols - 1)) / cols);
      board.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');
      board.style.setProperty('grid-template-rows', `repeat(${rows}, ${side}px)`, 'important');
      board.style.setProperty('width', `${width}px`, 'important');
      board.style.setProperty('height', `${rows * side + (rows - 1) * gap}px`, 'important');
      board.style.setProperty('gap', `${gap}px`, 'important');
      board.style.setProperty('transform', 'none', 'important');
      board.style.setProperty('margin-left', 'auto', 'important');
      board.style.setProperty('margin-right', 'auto', 'important');
      board.style.setProperty('max-width', '100%', 'important');
    });
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
    const slot = e.target.closest('.game-item-panel > *, .game-item-panel-inline > *, .mobile-item-row > *');
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
    game.querySelectorAll('.game-item-panel, .game-item-panel-inline, .mobile-item-row').forEach(panel => {
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
