/* =========================================================
   DetectionModal — 탐지 정보 상세 모달 (대시보드/지도/이력 공용)
   - 싱글톤 DOM, body 직하에 주입
   - 전역 .modal-* 스타일 (style.css) 사용
   - 저장 시 localStorage에 처리 상태/메모 영구화
   ========================================================= */
(function () {
  'use strict';

  var OVERRIDE_KEY = 'namwon-detection-overrides';
  var LOG_KEY = 'namwon-detection-logs';
  var SEVERITY_BADGE = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  var STATUS_BADGE = { '미처리': 'badge-unprocessed', '처리중': 'badge-processing', '완료': 'badge-done' };
  var SEVERITY_KO = { high: '고위험', medium: '주의', low: '양호' };

  var state = {
    built: false,
    modal: null,
    current: null,
    pending: null,
    callbacks: {}
  };

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setOverride(id, status) {
    var o = getOverrides();
    o[id] = status;
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function getLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function appendLog(id, action, note) {
    var logs = getLogs();
    if (!logs[id]) logs[id] = [];
    logs[id].push({ at: new Date().toISOString(), action: action, note: note || '' });
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logs)); } catch (e) {}
  }

  function build() {
    if (state.built) return;
    state.built = true;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal-backdrop" id="shared-detail-modal">' +
        '<div class="modal-card">' +
          '<div class="modal-head">' +
            '<div class="title">탐지 정보</div>' +
            '<button class="close-btn" data-role="close">×</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<img class="modal-thumb" data-role="thumb" style="width:100%;border-radius:6px;object-fit:cover;max-height:180px;" alt="썸네일">' +
            '<div class="modal-info-grid">' +
              '<div class="info-item"><div class="label">탐지 ID</div><div class="value" data-f="id">-</div></div>' +
              '<div class="info-item"><div class="label">탐지 클래스</div><div class="value" data-f="class">-</div></div>' +
              '<div class="info-item"><div class="label">심각도</div><div class="value" data-f="severity">-</div></div>' +
              '<div class="info-item full"><div class="label">위치</div><div class="value" data-f="addr">-</div></div>' +
              '<div class="info-item"><div class="label">탐지 일시</div><div class="value" data-f="date">-</div></div>' +
              '<div class="info-item"><div class="label">처리 상태</div><div class="value" data-f="status">-</div></div>' +
              '<div class="info-item full"><div class="label">원본 파일</div><div class="value" data-f="file">-</div></div>' +
            '</div>' +
            '<div class="m-action-section">' +
              '<div class="m-action-title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
                '처리 상태 변경' +
              '</div>' +
              '<div class="m-status-steps">' +
                '<button class="m-status-step" data-status="미처리"><span class="m-step-dot unprocessed"></span><span class="m-step-label">미처리</span></button>' +
                '<div class="m-step-line"></div>' +
                '<button class="m-status-step" data-status="처리중"><span class="m-step-dot processing"></span><span class="m-step-label">처리중</span></button>' +
                '<div class="m-step-line"></div>' +
                '<button class="m-status-step" data-status="완료"><span class="m-step-dot done"></span><span class="m-step-label">완료</span></button>' +
              '</div>' +
              '<div class="m-action-field">' +
                '<label>조치 메모 (선택)</label>' +
                '<textarea data-role="note" placeholder="예) 4/15 현장 확인 · 긴급 보수 요청 · 자재 주문 완료 등"></textarea>' +
              '</div>' +
              '<div class="m-history-log" data-role="log"></div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-foot">' +
            '<button class="btn btn-ghost" data-role="back" style="display:none;">← 이전으로</button>' +
            '<div class="mf-spacer"></div>' +
            '<button class="btn btn-ghost" data-role="cancel">닫기</button>' +
            '<button class="btn btn-primary" data-role="save">저장</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap.firstChild);
    state.modal = document.getElementById('shared-detail-modal');
    bindEvents();
  }

  function bindEvents() {
    var m = state.modal;
    m.querySelector('[data-role="close"]').addEventListener('click', close);
    m.querySelector('[data-role="cancel"]').addEventListener('click', close);
    m.querySelector('[data-role="save"]').addEventListener('click', save);
    m.querySelector('[data-role="back"]').addEventListener('click', back);
    m.addEventListener('click', function (e) {
      if (e.target === m) close();
    });
    m.querySelectorAll('.m-status-step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.pending = btn.dataset.status;
        m.querySelectorAll('.m-status-step').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && m.classList.contains('show')) close();
    });
  }


  function renderLog() {
    var logEl = state.modal.querySelector('[data-role="log"]');
    var logs = getLogs()[state.current.id] || [];
    if (logs.length === 0) { logEl.innerHTML = ''; return; }
    logEl.innerHTML = logs.slice().reverse().map(function (l) {
      var t = l.at.replace('T', ' ').substring(0, 16).replace(/-/g, '.');
      return '<div class="m-history-log-item"><time>' + t + '</time><span>' + l.action + (l.note ? ' · ' + l.note : '') + '</span></div>';
    }).join('');
  }

  function open(d, opts) {
    build();
    opts = opts || {};
    state.current = d;
    state.pending = d.status;
    state.callbacks = opts;

    var m = state.modal;
    m.querySelector('[data-f="id"]').textContent = d.id;
    m.querySelector('[data-f="class"]').textContent = d.class_ko + (d.class_en ? ' (' + d.class_en + ')' : '');
    m.querySelector('[data-f="severity"]').innerHTML = '<span class="badge ' + SEVERITY_BADGE[d.severity] + '">' + SEVERITY_KO[d.severity] + '</span>';
    m.querySelector('[data-f="addr"]').textContent = d.address || '-';
    m.querySelector('[data-f="date"]').textContent = d.detected_at
      ? d.detected_at.replace('T', ' ').substring(0, 16).replace(/-/g, '.')
      : '-';
    m.querySelector('[data-f="status"]').innerHTML = '<span class="badge ' + STATUS_BADGE[d.status] + '">' + d.status + '</span>';
    m.querySelector('[data-f="file"]').textContent = d.image_file || '-';

    var imgIdx = (parseInt(d.id.replace(/\D/g, ''), 10) || 0) % 6 + 1;
    m.querySelector('[data-role="thumb"]').src =
      (d.model_type === 'camera' ? 'assets/images/camera_0' : 'assets/images/drone_0') + imgIdx + '.png';

    m.querySelectorAll('.m-status-step').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.status === d.status);
    });
    m.querySelector('[data-role="note"]').value = '';
    renderLog();

    m.querySelector('[data-role="back"]').style.display = opts.onBack ? 'inline-flex' : 'none';

    // 다른 페이지에서 pledge-overlay 등이 동시에 열려있다면 함께 닫기 (중첩 방지)
    document.querySelectorAll('.pledge-overlay.show').forEach(function (el) {
      el.classList.remove('show');
    });

    m.classList.add('show');
  }

  function close() {
    state.modal.classList.remove('show');
    state.current = null;
    state.callbacks = {};
  }

  function back() {
    var cb = state.callbacks.onBack;
    state.modal.classList.remove('show');
    state.current = null;
    state.callbacks = {};
    if (cb) cb();
  }

  function save() {
    if (!state.current) return;
    var newStatus = state.pending;
    var note = state.modal.querySelector('[data-role="note"]').value.trim();

    if (newStatus === state.current.status && !note) {
      if (window.NotifyUI) NotifyUI.toast('변경 사항이 없습니다', '알림');
      return;
    }

    var oldStatus = state.current.status;
    state.current.status = newStatus;
    setOverride(state.current.id, newStatus);

    if (oldStatus !== newStatus) {
      appendLog(state.current.id, oldStatus + ' → ' + newStatus, note);
    } else if (note) {
      appendLog(state.current.id, '메모 추가', note);
    }

    state.modal.querySelector('[data-f="status"]').innerHTML =
      '<span class="badge ' + STATUS_BADGE[newStatus] + '">' + newStatus + '</span>';
    state.modal.querySelector('[data-role="note"]').value = '';
    renderLog();

    if (state.callbacks.onSave) state.callbacks.onSave(state.current, newStatus);
    if (window.NotifyUI) NotifyUI.toast('처리 상태가 저장되었습니다', '저장 완료');
  }

  function applyOverridesTo(detections) {
    var o = getOverrides();
    detections.forEach(function (d) {
      if (o[d.id]) d.status = o[d.id];
    });
  }

  window.DetectionModal = {
    open: open,
    close: close,
    getOverrides: getOverrides,
    applyOverridesTo: applyOverridesTo
  };
})();
