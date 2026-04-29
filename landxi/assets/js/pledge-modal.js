/* =============================================================
   pledge-modal.js — 공용 보안 서약서 모달
   지도 다운로드 플로우와 동일한 pledge-overlay 마크업·검증 로직을
   다른 페이지(보고서 다운로드 등)에서도 재사용하기 위한 모듈.

   사용 예:
     PledgeModal.open({
       applicant: '도로관리과 담당자',         // 선택. 기본 '사용자'
       title: '보안 서약서',                    // 선택
       purposePlaceholder: '예) 포트홀 긴급 보수 우선순위 선정',
       reqNamePlaceholder: '예) 도통동 도로 보수 계획 수립',
       execLabel: '다운로드 실행',
       onConfirm: function (data) {
         // data: { reqName, startDate, endDate, purpose, applicant }
         // 실제 다운로드 트리거
       }
     });

   DOM 은 최초 호출 시 body 에 자동 삽입. 폼 검증·에러 표시 포함.
   ============================================================= */
(function () {
  'use strict';

  var root = null;
  var onConfirmCb = null;
  var lastFocused = null;

  function build() {
    var today = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var todayStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var next = new Date(today);
    next.setMonth(next.getMonth() + 1);
    var nextStr = next.getFullYear() + '-' + pad(next.getMonth() + 1) + '-' + pad(next.getDate());

    root = document.createElement('div');
    root.className = 'pledge-overlay';
    root.id = 'pledge-modal-root';
    root.innerHTML =
      '<div class="pledge-box">' +
        '<button class="pledge-close" data-role="close" aria-label="닫기">&times;</button>' +
        '<header class="pledge-header">' +
          '<h1 data-role="title">보안 서약서</h1>' +
          '<p class="pledge-sub">다운로드를 받기 위해서는 해당 내용에 대한 동의가 필요합니다.</p>' +
        '</header>' +
        '<div class="pledge-content">' +
          '<div class="pledge-text-box">' +
            '본인은 <strong>Land-XI 플랫폼</strong>의 공간정보 다운로드 환경을 사용함에 있어 해당 자료를 외부로 유출하지 않을 것이며, 업무(과제) 수행에 한해 사용하고 이를 임의로 가공·편집·유출하지 않으며, 신청한 본인 외 제3자 또는 기관 내 타 사용자에게 공유하지 않고, 자료의 사용 및 활용, 목적 외 사용금지, 자료보호조치, 자료오용방지 등에 대한 책임이 있음을 서약하고 이에 본 서약서를 제출합니다.' +
          '</div>' +
          '<div class="pledge-applicant">신청자 : <strong data-role="applicant">사용자</strong> 님</div>' +
          '<div class="p-form-group pledge-agree-group" data-group="agree">' +
            '<label class="pledge-agree-check">' +
              '<input type="checkbox" data-role="agree">' +
              '<span class="check-box">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
              '</span>' +
              '<span class="check-label"><span class="req">[필수]</span> 위 보안 서약 내용에 동의합니다.</span>' +
            '</label>' +
            '<div class="p-error-msg" style="margin-left:28px;">보안 서약 내용에 동의해 주셔야 합니다.</div>' +
          '</div>' +
          '<div class="p-form-group" data-group="reqname">' +
            '<label>요청명 <span class="req">*</span></label>' +
            '<input type="text" data-role="req-name">' +
            '<div class="p-error-msg">요청명을 입력해 주세요.</div>' +
          '</div>' +
          '<div class="p-form-group" data-group="period">' +
            '<label>활용 기간 <span class="req">*</span></label>' +
            '<div class="p-date-row">' +
              '<input type="date" data-role="start-date" value="' + todayStr + '">' +
              '<span class="p-sep">~</span>' +
              '<input type="date" data-role="end-date" value="' + nextStr + '">' +
            '</div>' +
            '<div class="p-error-msg">활용 기간을 입력해 주세요.</div>' +
          '</div>' +
          '<div class="p-form-group" data-group="purpose">' +
            '<label>사용 목적 <span class="req">*</span></label>' +
            '<input type="text" data-role="purpose">' +
            '<div class="p-error-msg">사용 목적을 입력해 주세요.</div>' +
          '</div>' +
        '</div>' +
        '<footer class="pledge-footer">' +
          '<button class="btn-p btn-p-cancel" data-role="cancel">취소</button>' +
          '<button class="btn-p btn-p-exec" data-role="exec">다운로드 실행</button>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(root);

    root.querySelector('[data-role="close"]').addEventListener('click', close);
    root.querySelector('[data-role="cancel"]').addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });

    // 입력 시 에러 제거
    ['req-name', 'start-date', 'end-date', 'purpose'].forEach(function (role) {
      var el = root.querySelector('[data-role="' + role + '"]');
      if (el) el.addEventListener('input', function () {
        var g = el.closest('.p-form-group');
        if (g) g.classList.remove('has-error');
      });
    });
    var agree = root.querySelector('[data-role="agree"]');
    if (agree) agree.addEventListener('change', function () {
      var g = root.querySelector('[data-group="agree"]');
      if (agree.checked && g) g.classList.remove('has-error');
    });

    root.querySelector('[data-role="exec"]').addEventListener('click', function () {
      var valid = true;
      var reqName = root.querySelector('[data-role="req-name"]');
      var startDate = root.querySelector('[data-role="start-date"]');
      var endDate = root.querySelector('[data-role="end-date"]');
      var purpose = root.querySelector('[data-role="purpose"]');
      function setError(group, cond) {
        var g = root.querySelector('[data-group="' + group + '"]');
        if (!g) return;
        if (cond) { g.classList.add('has-error'); valid = false; }
        else g.classList.remove('has-error');
      }
      setError('agree', !agree.checked);
      setError('reqname', !reqName.value.trim());
      setError('period', !startDate.value || !endDate.value);
      setError('purpose', !purpose.value.trim());
      if (!valid) return;

      var cb = onConfirmCb;
      var data = {
        applicant: root.querySelector('[data-role="applicant"]').textContent,
        reqName: reqName.value.trim(),
        startDate: startDate.value,
        endDate: endDate.value,
        purpose: purpose.value.trim()
      };
      close();
      if (typeof cb === 'function') cb(data);
    });

    document.addEventListener('keydown', function (e) {
      if (!root.classList.contains('show')) return;
      if (e.key === 'Escape') close();
    });
  }

  function close() {
    if (!root) return;
    root.classList.remove('show');
    onConfirmCb = null;
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
  }

  function open(opts) {
    opts = opts || {};
    if (!root) build();
    root.querySelector('[data-role="title"]').textContent = opts.title || '보안 서약서';
    root.querySelector('[data-role="applicant"]').textContent = opts.applicant || '사용자';
    root.querySelector('[data-role="req-name"]').placeholder = opts.reqNamePlaceholder || '예) 도통동 도로 보수 계획 수립';
    root.querySelector('[data-role="purpose"]').placeholder = opts.purposePlaceholder || '예) 포트홀 긴급 보수 우선순위 선정';
    root.querySelector('[data-role="exec"]').textContent = opts.execLabel || '다운로드 실행';

    // 이전 입력 초기화 (재진입 시 깨끗하게)
    if (opts.resetOnOpen !== false) {
      root.querySelector('[data-role="agree"]').checked = false;
      root.querySelector('[data-role="req-name"]').value = '';
      root.querySelector('[data-role="purpose"]').value = '';
      root.querySelectorAll('.p-form-group').forEach(function (g) { g.classList.remove('has-error'); });
    }

    onConfirmCb = typeof opts.onConfirm === 'function' ? opts.onConfirm : null;
    lastFocused = document.activeElement;
    root.classList.add('show');
  }

  window.PledgeModal = { open: open, close: close };
})();
