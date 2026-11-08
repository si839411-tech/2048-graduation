/* V14: 업적 8개 / 꾸미기 해금. 기존 게임 엔진과 별도로 관리한다. */
(function () {
  'use strict';

  const STORAGE_KEY = '2048_achievements_v14';
  const TIMER_CAP = 1000;
  const SPENDING_GOAL = 20000;
  const THEMES = [
    {id: 'pastel', name: '파스텔', description: '차분하고 부드러운 컬러', color: '#a8cfa8', background: '#f3e7ed'},
    {id: 'ocean', name: '오션', description: '푸른 바다의 색감', color: '#238db2', background: '#d8f1fb'},
    {id: 'neon', name: '네온', description: '선명한 보라색과 청록색', color: '#7e68df', background: '#24203f'},
    {id: 'ember', name: '화염', description: '붉고 따뜻한 색감', color: '#df764e', background: '#fff0e6'},
    {id: 'cyber', name: '사이버', description: '어두운 미래형 테마', color: '#12c6c6', background: '#151b2b'},
    {id: 'diamond', name: '다이아몬드', description: '푸른빛의 차가운 광택', color: '#8ac7e9', background: '#eff9ff'},
    {id: 'gold', name: '황금', description: '금빛 타일과 진한 배경', color: '#e0b34d', background: '#29231d'},
    {id: 'rainbow', name: '레인보우', description: '모든 아이템의 최종 보상', color: '#c681d3', background: '#fff0f8'}
  ];
  const ACHIEVEMENTS = [
    {id: 'first', name: '첫걸음', rule: '솔로 또는 멀티플레이 첫 게임 시작', theme: 'pastel'},
    {id: 'clear14', name: '초보 탈출', rule: '스테이지 1-4 클리어', theme: 'ocean'},
    {id: 'unlock81', name: '새로운 도전자', rule: '스테이지 8-1 해금', theme: 'neon'},
    {id: 'level925', name: 'AI 도전자', rule: '9-1 난이도 25 이상 도달', theme: 'ember'},
    {id: 'level950', name: 'AI 정복자', rule: '9-1 난이도 50 이상 도달', theme: 'cyber'},
    {id: 'both100', name: '인공지능의 천적', rule: '8-1과 9-1 모두 난이도 100 도달', theme: 'diamond'},
    {id: 'spent100k', name: '큰손', rule: '상점에서 누적 20,000코인 사용', theme: 'gold'},
    {id: 'allMax', name: '완벽한 수집가', rule: '아이템 1~16 전부 실제 MAX 달성', theme: 'rainbow'}
  ];

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  function storedNumber(key) { return number(localStorage.getItem(key)); }
  function owned(key) { return !!localStorage.getItem(key); }
  function stageUnlocked(key) {
    try { return (JSON.parse(localStorage.getItem('unlocked')) || []).includes(key); }
    catch (_) { return false; }
  }
  function getShopMaxCount() {
    const limits = {1: 5, 2: 10, 3: 1, 4: 1, 5: 10, 6: 10, 7: 1, 8: 1,
      9: 2, 10: 2, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: TIMER_CAP};
    const once = new Set([3, 4, 7, 8, 11, 12, 15]);
    let full = 0;
    for (let item = 1; item <= 16; item++) {
      const count = once.has(item) ? (owned(`item${item}`) ? 1 : 0) : storedNumber(`item${item}Count`);
      if (count >= limits[item]) full++;
    }
    return full;
  }
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        firstPlayed: value.firstPlayed === true,
        cleared14: value.cleared14 === true,
        spentCoins: number(value.spentCoins),
        best8: number(value.best8),
        best9: number(value.best9),
        completed: value.completed && typeof value.completed === 'object' ? value.completed : {},
        theme: typeof value.theme === 'string' ? value.theme : 'classic'
      };
    } catch (_) {
      return {firstPlayed: false, cleared14: false, spentCoins: 0,
        best8: 0, best9: 0, completed: {}, theme: 'classic'};
    }
  }
  let state = load();
  let menuNode = null;
  let openDialogNode = null;
  let toastQueue = [];
  let toastActive = false;

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function isComplete(id) { return state.completed[id] === true; }
  function progress(id) {
    switch (id) {
      case 'first': return {value: state.firstPlayed ? 1 : 0, max: 1};
      case 'clear14': return {value: state.cleared14 || stageUnlocked('2-1') ? 1 : 0, max: 1};
      case 'unlock81': return {value: stageUnlocked('8-1') ? 1 : 0, max: 1};
      case 'level925': return {value: Math.min(25, state.best9), max: 25};
      case 'level950': return {value: Math.min(50, state.best9), max: 50};
      case 'both100': return {value: (state.best8 >= 100 ? 1 : 0) + (state.best9 >= 100 ? 1 : 0), max: 2};
      case 'spent100k': return {value: Math.min(SPENDING_GOAL, state.spentCoins), max: SPENDING_GOAL};
      case 'allMax': return {value: getShopMaxCount(), max: 16};
      default: return {value: 0, max: 1};
    }
  }
  function showToast(name, themeName) {
    toastQueue.push({name, themeName});
    if (!toastActive) nextToast();
  }
  function nextToast() {
    const data = toastQueue.shift();
    if (!data) { toastActive = false; return; }
    toastActive = true;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = `🏆 업적 달성! ${data.name} · ${data.themeName} 테마 해금`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); nextToast(); }, 2800);
  }
  function ensureThemeButton() {
    if (!menuNode || !isComplete('first') || menuNode.querySelector('#themeMenuBtn')) return;
    const button = document.createElement('div');
    button.className = 'block';
    button.id = 'themeMenuBtn';
    button.textContent = '🎨 꾸미기';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.addEventListener('click', showThemes);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showThemes(); }
    });
    menuNode.appendChild(button);
  }
  function check(silent = false) {
    // 이전 버전에서 얻은 8-1 해금 및 8-1의 현재 난이도는 이어받는다.
    state.best8 = Math.max(state.best8, Math.min(100, storedNumber('ai8Difficulty')));
    if (stageUnlocked('2-1')) state.cleared14 = true;
    let changed = false;
    ACHIEVEMENTS.forEach((achievement) => {
      const p = progress(achievement.id);
      if (p.value >= p.max && !isComplete(achievement.id)) {
        state.completed[achievement.id] = true;
        changed = true;
        if (!silent) {
          const theme = THEMES.find(t => t.id === achievement.theme);
          showToast(achievement.name, theme.name);
        }
      }
    });
    if (changed) ensureThemeButton();
    if (changed) save();
    if (openDialogNode) renderCurrentDialog();
  }
  function applyTheme() {
    if (state.theme !== 'classic' && !THEMES.some(theme => theme.id === state.theme &&
      isComplete(ACHIEVEMENTS.find(a => a.theme === theme.id).id))) {
      state.theme = 'classic';
      save();
    }
    if (state.theme === 'classic') document.body.removeAttribute('data-achievement-theme');
    else document.body.setAttribute('data-achievement-theme', state.theme);
  }
  function closeDialog() {
    if (openDialogNode) openDialogNode.backdrop.remove();
    openDialogNode = null;
  }
  function makeDialog(title) {
    closeDialog();
    const backdrop = document.createElement('div');
    backdrop.className = 'achievement-overlay';
    const panel = document.createElement('section');
    panel.className = 'achievement-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    const header = document.createElement('header');
    header.className = 'achievement-header';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const close = document.createElement('button');
    close.className = 'achievement-close';
    close.textContent = '닫기 ✕';
    close.addEventListener('click', closeDialog);
    header.append(heading, close);
    const content = document.createElement('div');
    content.className = 'achievement-content';
    panel.append(header, content);
    backdrop.appendChild(panel);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeDialog();
    });
    document.body.appendChild(backdrop);
    openDialogNode = {backdrop, content, type: title === '업적' ? 'achievements' : 'themes'};
    close.focus();
    return content;
  }
  function percent(p) { return Math.min(100, Math.round(p.value / p.max * 100)); }
  function renderAchievements(content) {
    content.innerHTML = '';
    const count = ACHIEVEMENTS.filter(a => isComplete(a.id)).length;
    const summary = document.createElement('p');
    summary.className = 'achievement-summary';
    summary.textContent = `달성한 업적 ${count} / ${ACHIEVEMENTS.length} · 모든 보상은 꾸미기 전용`;
    content.appendChild(summary);
    ACHIEVEMENTS.forEach((achievement, i) => {
      const p = progress(achievement.id);
      const done = isComplete(achievement.id);
      const theme = THEMES.find(t => t.id === achievement.theme);
      const card = document.createElement('article');
      card.className = `achievement-card${done ? ' achieved' : ''}`;
      const top = document.createElement('div');
      top.className = 'achievement-card-top';
      const label = document.createElement('strong');
      label.textContent = `${done ? '🏆' : '🔒'} ${i + 1}. ${achievement.name}`;
      const badge = document.createElement('span');
      badge.textContent = done ? '달성' : `${p.value.toLocaleString()} / ${p.max.toLocaleString()}`;
      top.append(label, badge);
      const rule = document.createElement('p');
      rule.textContent = achievement.rule;
      const reward = document.createElement('p');
      reward.className = 'achievement-reward';
      reward.textContent = `보상: ${theme.name} 테마 ${done ? '(사용 가능)' : '(잠김)'}`;
      const bar = document.createElement('div');
      bar.className = 'achievement-progress-track';
      const fill = document.createElement('div');
      fill.className = 'achievement-progress-fill';
      fill.style.width = percent(p) + '%';
      bar.appendChild(fill);
      card.append(top, rule, reward, bar);
      content.appendChild(card);
    });
    const note = document.createElement('p');
    note.className = 'achievement-note';
    note.textContent = '코인 사용액은 이번 업데이트 이후 구매부터 누적됩니다. 업적을 한 번 달성하면 이후 코인을 쓰거나 상점을 초기화해도 유지됩니다.';
    content.appendChild(note);
  }
  function showAchievements() {
    const content = makeDialog('업적');
    renderAchievements(content);
  }
  function renderThemes(content) {
    content.innerHTML = '';
    const message = document.createElement('p');
    message.className = 'achievement-summary';
    message.textContent = '해금한 테마를 선택하세요. 타일 숫자·게임 규칙·배치는 바뀌지 않습니다.';
    content.appendChild(message);
    const grid = document.createElement('div');
    grid.className = 'achievement-theme-grid';
    const allThemes = [{id: 'classic', name: '기본', description: '원래 게임 디자인', color: '#4caf50', background: '#e8f5e9'}, ...THEMES];
    allThemes.forEach(theme => {
      const condition = ACHIEVEMENTS.find(a => a.theme === theme.id);
      const unlocked = !condition || isComplete(condition.id);
      const active = state.theme === theme.id;
      const button = document.createElement('button');
      button.className = `achievement-theme-option${active ? ' selected' : ''}`;
      button.disabled = !unlocked;
      button.setAttribute('aria-pressed', String(active));
      const sample = document.createElement('div');
      sample.className = 'achievement-theme-sample';
      sample.style.background = theme.background;
      const tileGroup = document.createElement('div');
      tileGroup.className = 'achievement-sample-tiles';
      [2, 4, 8, 16].forEach(num => {
        const tile = document.createElement('span');
        tile.textContent = String(num);
        tile.style.background = theme.color;
        tile.style.color = theme.id === 'diamond' || theme.id === 'rainbow' ? '#142c40' : '#ffffff';
        tileGroup.appendChild(tile);
      });
      sample.appendChild(tileGroup);
      const name = document.createElement('strong');
      name.textContent = `${theme.name}${active ? ' ✓' : ''}`;
      const info = document.createElement('small');
      info.textContent = unlocked ? theme.description : `🔒 ${condition.rule}`;
      button.append(sample, name, info);
      button.addEventListener('click', () => {
        if (!unlocked) return;
        state.theme = theme.id;
        save();
        applyTheme();
        renderThemes(content);
      });
      grid.appendChild(button);
    });
    content.appendChild(grid);
  }
  function showThemes() {
    if (!isComplete('first')) return;
    const content = makeDialog('꾸미기');
    renderThemes(content);
  }
  function renderCurrentDialog() {
    if (!openDialogNode) return;
    if (openDialogNode.type === 'achievements') renderAchievements(openDialogNode.content);
    else renderThemes(openDialogNode.content);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openDialogNode) { closeDialog(); event.stopPropagation(); }
  });

  window.Achievements = {
    init(menu) {
      menuNode = menu;
      // 초기 로드에서 이미 충족한 기록은 조용히 복구한다.
      check(true);
      const button = document.createElement('div');
      button.className = 'block';
      button.id = 'achievementMenuBtn';
      button.textContent = '🏆 업적';
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.addEventListener('click', showAchievements);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showAchievements(); }
      });
      menu.appendChild(button);
      ensureThemeButton();
      applyTheme();
    },
    onGameStarted() { if (!state.firstPlayed) { state.firstPlayed = true; save(); } check(); },
    onStageCleared(main, sub) {
      if (main === 1 && sub === 4) { state.cleared14 = true; save(); }
      check();
    },
    onStagesChanged() { check(); },
    onDifficulty(mode, difficulty) {
      const level = Math.min(100, number(difficulty));
      if (mode === 8) state.best8 = Math.max(state.best8, level);
      else if (mode === 9) state.best9 = Math.max(state.best9, level);
      else return;
      save();
      check();
    },
    onPurchase(amount) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      state.spentCoins += amount;
      save();
      check();
    },
    refresh() { check(); },
    getSummary() {
      return {spentCoins: state.spentCoins, best8: state.best8, best9: state.best9,
        completed: {...state.completed}, allMaxCount: getShopMaxCount(), theme: state.theme};
    }
  };
})();
