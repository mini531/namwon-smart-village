/* =========================================================
   Namwon GeoVision - 공통 레이아웃 로더
   레퍼런스: https://mini531.github.io/landxi/public/theme3/js/layout.js
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     헤더 로드 (include/header.html)
  ------------------------------------------------------- */
  function loadHeader() {
    var el = document.getElementById('header-include');
    if (!el) return Promise.resolve();

    return fetch('include/header.html')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        el.innerHTML = html;
        initActiveMenu();
        initMenuInteraction();
      })
      .catch(function (err) {
        console.warn('Header load failed:', err);
      });
  }

  /* -------------------------------------------------------
     현재 페이지 활성 메뉴 처리
  ------------------------------------------------------- */
  function initActiveMenu() {
    var currentFile = window.location.pathname.split('/').pop() || 'index.html';

    var fileMenuMap = {
      'index.html': 'dashboard',
      'map-home.html': 'map',
      'report.html': 'report',
      'report-history.html': 'report',
      'analysis-orthophoto.html': 'analysis',
      'analysis-camera.html': 'analysis',
      'history.html': 'analysis'
    };

    var activeMenu = fileMenuMap[currentFile];

    // 메뉴 아이템 active 처리
    document.querySelectorAll('.menu-item[data-menu]').forEach(function (item) {
      if (item.getAttribute('data-menu') === activeMenu) {
        item.classList.add('active');
      }
    });

    // 드롭다운 링크 current-page 처리
    document.querySelectorAll('.dropdown-link').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.split('/').pop() === currentFile) {
        link.classList.add('current-page');
      }
    });
  }

  /* -------------------------------------------------------
     메뉴 인터랙션 (hover 보강 + 잔상 제거)
  ------------------------------------------------------- */
  function initMenuInteraction() {
    var menuItems = document.querySelectorAll('.menu-item[data-menu]');

    menuItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        // 다른 모든 메뉴의 열린 드롭다운 강제 닫기
        menuItems.forEach(function (other) {
          if (other !== item) other.classList.remove('hover-open');
        });
        item.classList.add('hover-open');
      });

      item.addEventListener('mouseleave', function () {
        item.classList.remove('hover-open');
      });

      // 1차 메뉴명 클릭 시 드롭다운의 첫 번째 링크로 이동
      var mainLink = item.querySelector(':scope > a');
      if (mainLink) {
        mainLink.addEventListener('click', function (e) {
          var firstDropLink = item.querySelector('.dropdown .dropdown-link[href]:not([href="#"])');
          if (firstDropLink) {
            e.preventDefault();
            window.location.href = firstDropLink.getAttribute('href');
          }
        });
      }
    });

    // 네비게이션 바 외부로 벗어나면 모두 닫기
    var navBar = document.querySelector('.gnb-nav');
    if (navBar) {
      navBar.addEventListener('mouseleave', function () {
        menuItems.forEach(function (i) { i.classList.remove('hover-open'); });
      });
    }
  }

  /* -------------------------------------------------------
     날짜 포맷 헬퍼 (yyyy.mm.dd)
  ------------------------------------------------------- */
  window.formatDate = function (date) {
    if (typeof date === 'string') date = new Date(date);
    if (!(date instanceof Date) || isNaN(date)) return '';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + d;
  };

  window.formatDateTime = function (dateStr) {
    if (!dateStr) return '';
    var dt = dateStr.replace('T', ' ').substring(0, 16);
    return dt.replace('-', '.').replace('-', '.');
  };

  /* -------------------------------------------------------
     NotifyUI - 전역 알림/확인 모달
     alert/confirm 대체
  ------------------------------------------------------- */
  function ensureNotifyDom() {
    if (document.getElementById('notify-overlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'notify-overlay';
    overlay.id = 'notify-overlay';
    overlay.innerHTML =
      '<div class="notify-box">' +
        '<div class="notify-head">' +
          '<div class="notify-icon" id="notify-icon"></div>' +
          '<div class="notify-title" id="notify-title">알림</div>' +
        '</div>' +
        '<div class="notify-body" id="notify-body"></div>' +
        '<div class="notify-footer">' +
          '<button class="notify-btn notify-btn-cancel" id="notify-btn-cancel">취소</button>' +
          '<button class="notify-btn notify-btn-ok" id="notify-btn-ok">확인</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideNotify();
    });
  }

  function hideNotify() {
    var ov = document.getElementById('notify-overlay');
    if (ov) ov.classList.remove('show');
  }

  var ICONS = {
    info:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warn:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>',
    error:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    success: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    confirm: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>'
  };

  function showNotify(opts) {
    ensureNotifyDom();
    var overlay = document.getElementById('notify-overlay');
    var box = overlay.querySelector('.notify-box');
    var iconEl = document.getElementById('notify-icon');
    var titleEl = document.getElementById('notify-title');
    var bodyEl = document.getElementById('notify-body');
    var okBtn = document.getElementById('notify-btn-ok');
    var cancelBtn = document.getElementById('notify-btn-cancel');

    var type = opts.type || 'info';
    box.className = 'notify-box notify-type-' + type;
    iconEl.innerHTML = ICONS[type] || ICONS.info;
    titleEl.textContent = opts.title || '알림';
    bodyEl.textContent = opts.message || '';

    okBtn.textContent = opts.okText || '확인';
    cancelBtn.textContent = opts.cancelText || '취소';

    var isConfirm = !!opts.confirm;
    cancelBtn.style.display = isConfirm ? 'inline-block' : 'none';

    // 이벤트 리바인딩 (clone 노드로 리셋)
    var newOk = okBtn.cloneNode(true);
    var newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.addEventListener('click', function () {
      hideNotify();
      if (opts.onOk) opts.onOk();
    });
    newCancel.addEventListener('click', function () {
      hideNotify();
      if (opts.onCancel) opts.onCancel();
    });

    overlay.classList.add('show');
    setTimeout(function () { newOk.focus(); }, 30);
  }

  window.NotifyUI = {
    info: function (message, title) { showNotify({ type: 'info', title: title || '알림', message: message }); },
    warn: function (message, title) { showNotify({ type: 'warn', title: title || '주의', message: message }); },
    error: function (message, title) { showNotify({ type: 'error', title: title || '오류', message: message }); },
    success: function (message, title) { showNotify({ type: 'success', title: title || '완료', message: message }); },
    confirm: function (message, onOk, opts) {
      opts = opts || {};
      showNotify({
        type: 'confirm',
        title: opts.title || '확인',
        message: message,
        confirm: true,
        okText: opts.okText || '확인',
        cancelText: opts.cancelText || '취소',
        onOk: onOk,
        onCancel: opts.onCancel
      });
    },
    show: showNotify,
    hide: hideNotify
  };

  // ESC 로 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = document.getElementById('notify-overlay');
      if (ov && ov.classList.contains('show')) hideNotify();
    }
  });

  /* -------------------------------------------------------
     DOMContentLoaded
  ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    loadHeader().then(function () {
      // 헤더 로드 완료 후 페이지별 초기화 이벤트
      document.dispatchEvent(new CustomEvent('headerLoaded'));
    });
  });

})();
