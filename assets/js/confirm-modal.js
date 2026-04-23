/* =============================================================
   confirm-modal.js — 공용 확인 다이얼로그
   사용 예:
     ConfirmModal.open({
       title: '확인',
       message: '사용자를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
       confirmText: '확인',         // 선택
       cancelText: '닫기',          // 선택
       danger: true,                // 선택. true 면 확인 버튼 danger 스타일
       onConfirm: function () { ... }
     });
   DOM 은 최초 호출 시 자동 생성되어 body 에 추가. 페이지마다
   템플릿 반복하지 않도록 JS 단독으로 동작.
   ============================================================= */
(function () {
  'use strict';

  var rootEl = null;
  var dialogEl = null;
  var titleEl = null;
  var messageEl = null;
  var confirmBtn = null;
  var cancelBtn = null;
  var closeBtn = null;
  var currentOnConfirm = null;
  var lastFocused = null;

  function build() {
    rootEl = document.createElement('div');
    rootEl.className = 'confirm-backdrop';
    rootEl.setAttribute('role', 'dialog');
    rootEl.setAttribute('aria-modal', 'true');
    rootEl.setAttribute('aria-hidden', 'true');
    rootEl.innerHTML =
      '<div class="confirm-dialog" role="document">' +
        '<div class="confirm-head">' +
          '<div class="confirm-title" id="confirm-modal-title">확인</div>' +
          '<button type="button" class="confirm-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="confirm-body" id="confirm-modal-message"></div>' +
        '<div class="confirm-foot">' +
          '<button type="button" class="board-btn" data-role="cancel">닫기</button>' +
          '<button type="button" class="board-btn board-btn-primary" data-role="confirm">확인</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(rootEl);

    dialogEl = rootEl.querySelector('.confirm-dialog');
    titleEl = rootEl.querySelector('#confirm-modal-title');
    messageEl = rootEl.querySelector('#confirm-modal-message');
    confirmBtn = rootEl.querySelector('[data-role="confirm"]');
    cancelBtn = rootEl.querySelector('[data-role="cancel"]');
    closeBtn = rootEl.querySelector('.confirm-close');

    cancelBtn.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    rootEl.addEventListener('click', function (e) {
      if (e.target === rootEl) close();
    });
    confirmBtn.addEventListener('click', function () {
      var cb = currentOnConfirm;
      close();
      if (typeof cb === 'function') cb();
    });
    document.addEventListener('keydown', function (e) {
      if (!rootEl.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') confirmBtn.click();
    });
  }

  function close() {
    if (!rootEl) return;
    rootEl.classList.remove('open');
    rootEl.setAttribute('aria-hidden', 'true');
    currentOnConfirm = null;
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
  }

  function open(opts) {
    opts = opts || {};
    if (!rootEl) build();
    titleEl.textContent = opts.title || '확인';
    // 줄바꿈은 \n 로 받고 CSS white-space:pre-wrap 으로 보존.
    messageEl.textContent = opts.message || '';
    confirmBtn.textContent = opts.confirmText || '확인';
    cancelBtn.textContent = opts.cancelText || '닫기';

    confirmBtn.classList.toggle('board-btn-primary', !opts.danger);
    confirmBtn.classList.toggle('board-btn-danger', !!opts.danger);

    currentOnConfirm = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
    lastFocused = document.activeElement;
    rootEl.classList.add('open');
    rootEl.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      try { confirmBtn.focus(); } catch (_) {}
    }, 0);
  }

  window.ConfirmModal = { open: open, close: close };
})();
