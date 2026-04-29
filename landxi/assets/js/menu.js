/* =========================================================
   Land-XI - 메가 메뉴 인터랙션
   ========================================================= */

(function () {
  'use strict';

  function initMenu() {
    const menuItems = document.querySelectorAll('.menu-item');

    menuItems.forEach(function (item) {
      const dropdown = item.querySelector('.dropdown');
      if (!dropdown) return;

      let timer;

      item.addEventListener('mouseenter', function () {
        clearTimeout(timer);
        // 다른 드롭다운 닫기
        menuItems.forEach(function (other) {
          if (other !== item) {
            const otherDd = other.querySelector('.dropdown');
            if (otherDd) {
              otherDd.style.opacity = '';
              otherDd.style.pointerEvents = '';
              otherDd.style.transform = '';
            }
          }
        });
      });

      item.addEventListener('mouseleave', function () {
        timer = setTimeout(function () {
          // CSS hover 처리됨 - 추가 로직 없음
        }, 100);
      });
    });

    // 현재 페이지 링크 강조
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.dropdown-link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (href && href.split('/').pop() === currentPath) {
        link.classList.add('current-page');
        // 상위 메뉴 아이템도 active 처리
        const parentItem = link.closest('.menu-item');
        if (parentItem) parentItem.classList.add('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }
})();
