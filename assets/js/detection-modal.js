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
            '<canvas class="modal-thumb" data-role="thumb" width="500" height="180"></canvas>' +
            '<div class="modal-info-grid">' +
              '<div class="info-item"><div class="label">탐지 ID</div><div class="value" data-f="id">-</div></div>' +
              '<div class="info-item"><div class="label">탐지 클래스</div><div class="value" data-f="class">-</div></div>' +
              '<div class="info-item"><div class="label">신뢰도</div><div class="value" data-f="conf">-</div></div>' +
              '<div class="info-item"><div class="label">심각도</div><div class="value" data-f="severity">-</div></div>' +
              '<div class="info-item full"><div class="label">위치</div><div class="value" data-f="addr">-</div></div>' +
              '<div class="info-item"><div class="label">위도</div><div class="value" data-f="lat">-</div></div>' +
              '<div class="info-item"><div class="label">경도</div><div class="value" data-f="lng">-</div></div>' +
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
            '<button class="btn btn-ghost btn-sm" data-role="back" style="display:none;">← 이전으로</button>' +
            '<div class="mf-spacer"></div>' +
            '<button class="btn btn-ghost btn-sm" data-role="cancel">닫기</button>' +
            '<button class="btn btn-primary btn-sm" data-role="save">저장</button>' +
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

  function drawThumb(canvas, d) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;

    var grd = ctx.createLinearGradient(0, 0, 0, h);
    if (d.model_type === 'orthophoto') {
      grd.addColorStop(0, '#4a7c59');
      grd.addColorStop(0.5, '#3d6b4a');
      grd.addColorStop(1, '#2a4f36');
    } else {
      grd.addColorStop(0, '#0d1520');
      grd.addColorStop(0.4, '#1e3050');
      grd.addColorStop(1, '#1a2535');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    if (d.model_type === 'orthophoto') {
      ctx.fillStyle = '#5a6370';
      ctx.fillRect(w * 0.25, 0, w * 0.5, h);
      ctx.fillStyle = '#4e5765';
      ctx.fillRect(w * 0.32, 0, w * 0.36, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 12]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = '#2a3444';
      ctx.fillRect(0, h * 0.4, w, h * 0.6);
      ctx.strokeStyle = 'rgba(255,255,220,0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([30, 15]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.4);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h);
      ctx.lineTo(w * 0.4, h * 0.4);
      ctx.moveTo(w * 0.85, h);
      ctx.lineTo(w * 0.6, h * 0.4);
      ctx.stroke();
    }

    var col = d.severity === 'high' ? '#E63946' : d.severity === 'medium' ? '#F4A261' : '#2A9D8F';
    var bx = w * 0.34, by = h * 0.42, bw = w * 0.32, bh = h * 0.34;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;

    var label = d.class_ko + ' ' + (d.confidence || 0).toFixed(2);
    ctx.font = 'bold 13px Inter, sans-serif';
    var tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = col;
    ctx.fillRect(bx, by - 22, tw, 22);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, bx + 6, by - 7);
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
    m.querySelector('[data-f="conf"]').textContent = Math.round(d.confidence * 100) + '%';
    m.querySelector('[data-f="severity"]').innerHTML = '<span class="badge ' + SEVERITY_BADGE[d.severity] + '">' + SEVERITY_KO[d.severity] + '</span>';
    m.querySelector('[data-f="addr"]').textContent = d.address || '-';
    m.querySelector('[data-f="lat"]').textContent = (d.lat != null) ? d.lat.toFixed(6) : '-';
    m.querySelector('[data-f="lng"]').textContent = (d.lng != null) ? d.lng.toFixed(6) : '-';
    m.querySelector('[data-f="date"]').textContent = d.detected_at
      ? d.detected_at.replace('T', ' ').substring(0, 16).replace(/-/g, '.')
      : '-';
    m.querySelector('[data-f="status"]').innerHTML = '<span class="badge ' + STATUS_BADGE[d.status] + '">' + d.status + '</span>';
    m.querySelector('[data-f="file"]').textContent = d.image_file || '-';

    drawThumb(m.querySelector('[data-role="thumb"]'), d);

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
