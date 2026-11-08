/* V19: 옵션의 세이브 백업/복원 UI. 로컬 기록을 서버에서 서명하여 다운로드한다. */
(function () {
  'use strict';
  const SAVE_KEYS = [
    'coin', 'unlocked', 'ai8Difficulty', 'inviteBlock', '2048_achievements_v14',
    ...Array.from({length:16}, (_,i) => {
      const id = i + 1;
      return `item${id}${[3,4,7,8,11,12,15].includes(id) ? '' : 'Count'}`;
    })
  ];
  function collect() {
    const result = {};
    for (const key of SAVE_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    }
    return result;
  }
  async function request(path, body) {
    const response = await fetch(path, {
      method:'POST', credentials:'same-origin', cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    let result;
    try { result = await response.json(); }
    catch (_) { throw new Error('서버에서 올바른 응답을 받지 못했습니다.'); }
    if (!response.ok) throw new Error(result.error || `서버 오류 (${response.status})`);
    return result;
  }
  function downloadFile(backup) {
    const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date();
    const stamp = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    anchor.download = `2048-save-${stamp}.json`;
    anchor.href = url;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function applyRestoredData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('복원 결과가 올바르지 않습니다.');
    const original = collect();
    try {
      for (const key of SAVE_KEYS) localStorage.removeItem(key);
      for (const key of SAVE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(data,key)) localStorage.setItem(key,data[key]);
      }
    } catch (e) {
      // 저장 도중 문제가 발생하면 복원 이전의 데이터를 되돌린다.
      for (const key of SAVE_KEYS) localStorage.removeItem(key);
      for (const [key,value] of Object.entries(original)) localStorage.setItem(key,value);
      throw e;
    }
    location.reload(); // 메모리의 코인·스테이지·업적 상태를 다시 불러옴
  }
  function mount(host) {
    if (!host) return;
    const header = document.createElement('h2');
    header.textContent = '게임 데이터 관리';
    const description = document.createElement('p');
    description.textContent = '코인·아이템·스테이지·AI 기록·업적·테마를 파일에 저장합니다.';
    const controls = document.createElement('div');
    controls.className = 'backup-controls';
    const backupButton = document.createElement('button');
    backupButton.type = 'button';
    backupButton.textContent = '⬇ 데이터 백업';
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.textContent = '⬆ 데이터 복원';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.className = 'backup-file-input';
    fileInput.setAttribute('aria-label','2048 백업 파일 선택');
    const message = document.createElement('p');
    message.className = 'backup-status';
    message.setAttribute('role','status');
    message.setAttribute('aria-live','polite');
    message.textContent = '복원 전에 현재 기록을 백업해 두세요.';
    controls.append(backupButton,restoreButton);
    host.append(header,description,controls,fileInput,message);
    const status = (txt) => { message.textContent = txt; };
    const busy = (flag) => { backupButton.disabled=flag; restoreButton.disabled=flag; };

    backupButton.addEventListener('click',async () => {
      busy(true);
      status('서버에서 백업 파일에 서명하는 중…');
      try {
        const backup = await request('/api/backup/export', {data:collect()});
        downloadFile(backup);
        status('서명된 백업 파일이 다운로드되었습니다. 파일을 안전하게 보관하세요.');
      } catch (e) { status(`백업 실패: ${e.message}`); }
      finally { busy(false); }
    });
    restoreButton.addEventListener('click',() => { fileInput.value=''; fileInput.click(); });
    fileInput.addEventListener('change',async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 100000) { status('백업 파일은 100KB 이하여야 합니다.'); return; }
      busy(true);
      status('서버에서 파일 서명을 검증하는 중…');
      try {
        const backup = JSON.parse(await file.text());
        const verified = await request('/api/backup/verify', {backup});
        if (!verified.ok || !verified.data) throw new Error('백업 검증에 실패했습니다.');
        const confirmed = window.confirm(
          '백업 파일의 서명이 정상입니다.\n\n현재 코인, 아이템, 스테이지, 업적, 테마를 백업 파일의 기록으로 덮어쓸까요?\n이 작업은 자동으로 되돌릴 수 없습니다.\n\n복원 전 현재 데이터도 백업하는 것을 권장합니다.'
        );
        if (!confirmed) { status('복원을 취소했어. 현재 기록은 그대로야.'); return; }
        status('백업 데이터를 복원하는 중…');
        applyRestoredData(verified.data);
      } catch (e) {
        status(`복원 실패: ${e instanceof SyntaxError ? 'JSON 파일 형식이 올바르지 않습니다.' : e.message}`);
      } finally { busy(false); }
    });
  }
  window.GameBackup = {mount};
})();
