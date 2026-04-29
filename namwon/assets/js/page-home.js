/* =========================================================
   홈 페이지 — jeonnam-ai 사이트 swiper / before-after 슬라이더
   원본: https://www.jeonnam-ai.kr:18443/auth/nw/home (inline script)
   ========================================================= */
(function () {
  'use strict';

  // 헤더 fetch 완료 후 초기화 (헤더가 DOM 위에서 height 차지 후 swiper init)
  function init() {
    if (typeof Swiper === 'undefined' || typeof window.jQuery === 'undefined') return;

    var $ = window.jQuery;

    var s2Array = [
      { number: '01', title: '사료작물 정보 분석', text: '드론 영상과 AI 분석으로 사료작물 재배 현황을<br>정확하게 파악하고, 재배 정보와 수확량을 효율적으로 관리합니다.' },
      { number: '02', title: '농지이용 정보 분석', text: '농지의 경작, 휴경, 비닐하우스 등 이용 현황을<br>시계열로 비교·분석하여 체계적인 농지 관리와 행정업무를 지원합니다.' },
      { number: '03', title: '영농시설 정보 분석', text: '영농시설의 설치 유형과 상태를 AI가 자동 분류하고,<br>보조사업 대상 여부까지 한눈에 확인할 수 있습니다.' },
      { number: '04', title: '방치쓰레기 탐지',     text: '방치되어 쌓여 있는 쓰레기 더미를 검출해주는 AI 분석<br>서비스로 대규모 지역을 모니터링, 불법으로 버려진 쓰레기를 탐지합니다.' }
    ];

    var s2Swiper = new Swiper('.section-2 .swiper', {
      direction: 'horizontal',
      effect: 'slide',
      speed: 1000,
      autoplay: true,
      slidesPerView: 1,
      spaceBetween: 0,
      allowTouchMove: false,
      mousewheel: false,
      loop: true,
      navigation: { nextEl: '.section-2 .next', prevEl: '.section-2 .prev' },
      pagination: { el: '.section-2 .fraction', type: 'fraction' },
      on: {
        init: function () {
          var tpl = document.querySelector('.s2-tpl');
          if (tpl) tpl.classList.add('first-active');
        }
      }
    });

    s2Swiper.on('slideChange', function () {
      var item = s2Array[this.realIndex] || s2Array[0];
      var tpl = document.querySelector('.s2-tpl');
      if (!tpl) return;
      tpl.classList.remove('first-active');
      tpl.innerHTML =
        '<div class="tit">AI 분석 서비스</div>' +
        '<div class="s-tit"><span class="num">' + item.number + '</span><b>' + item.title + '</b></div>' +
        '<div class="txt">' + item.text + '</div>';
      document.querySelectorAll('.scroller').forEach(function (el) { el.style.left = '50%'; });
      document.querySelectorAll('.original').forEach(function (el) { el.style.width = '50%'; });
      setTimeout(function () { tpl.classList.add('first-active'); }, 250);
    });

    var stopPlay = false;
    $('.monitor-button-pause').on('click', function () {
      $(this).siblings('.monitor-button-play').addClass('active');
      $(this).removeClass('active');
      stopPlay = true;
      s2Swiper.autoplay.stop();
    });
    $('.monitor-button-play').on('click', function () {
      $(this).siblings('.monitor-button-pause').addClass('active');
      $(this).removeClass('active');
      stopPlay = false;
      s2Swiper.autoplay.start();
    });

    document.querySelectorAll('.bafore').forEach(function (slider) {
      var sliderHandle = slider.querySelector('.scroller');
      var sliderImageAfter = slider.querySelector('.original');
      var coordinatesElement = document.querySelector('.monitor-wrapper');
      if (!sliderHandle || !sliderImageAfter) return;

      var isDragging = false;
      var startX = 0;
      var lastX = 0;
      var isMouseDown = false;

      sliderHandle.addEventListener('mousedown', function (e) {
        isDragging = true;
        document.body.style.cursor = 'ew-resize';
        startX = e.clientX;
        s2Swiper.autoplay.pause();
        isMouseDown = true;
        lastX = e.clientX;
      });

      document.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = 'default';
        if (!stopPlay) s2Swiper.autoplay.start();
        isMouseDown = false;
        if (coordinatesElement) coordinatesElement.classList.remove('move-right', 'move-left');
      });

      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        var rect = slider.getBoundingClientRect();
        var offsetX = e.clientX - rect.left;
        if (offsetX < 0) offsetX = 0;
        if (offsetX > rect.width) offsetX = rect.width;
        var pct = (offsetX / rect.width) * 100;
        sliderHandle.style.left = pct + '%';
        sliderImageAfter.style.width = pct + '%';

        var swiperActive = document.querySelector('.swiper-slide-active');
        if (swiperActive) {
          if (pct > 50) { swiperActive.classList.add('half-left'); swiperActive.classList.remove('half-right'); }
          else { swiperActive.classList.remove('half-left'); swiperActive.classList.add('half-right'); }
        }
      });

      sliderHandle.addEventListener('mousemove', function (event) {
        if (!isMouseDown) return;
        var x = event.clientX;
        if (!coordinatesElement) return;
        if (x > lastX) { coordinatesElement.classList.add('move-right'); coordinatesElement.classList.remove('move-left'); }
        else if (x < lastX) { coordinatesElement.classList.add('move-left'); coordinatesElement.classList.remove('move-right'); }
        lastX = x;
      });

      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            var target = mutation.target;
            if (target.classList.contains('swiper-slide-active')) {
              document.querySelectorAll('.swiper-slide').forEach(function (slide) {
                if (slide !== target) slide.classList.remove('half-left', 'half-right');
              });
            }
          }
        });
      });
      document.querySelectorAll('.swiper-slide').forEach(function (slide) {
        observer.observe(slide, { attributes: true });
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio > 0) entry.target.classList.add('active');
      });
    });
    document.querySelectorAll('.section-3').forEach(function (el) { io.observe(el); });

    initBoardTabs();
  }

  // ── 알림마당 — 공지사항 / 활용사례 / 자주 묻는 질문 통합 ──
  var BOARD = {
    notice: {
      moreLabel: '공지사항 더보기',
      moreHref: 'notice.html',
      detailUrl: function (id) { return 'notice.html?notice=' + id; },
      catLabels: { urgent: '긴급', work: '업무', release: '배포', update: '업데이트', maintain: '점검' },
      items: [
        { id: 8, cat: 'urgent', title: '고위험 탐지 건 긴급 처리 안내',         date: '2026.04.15', views: 142 },
        { id: 7, cat: 'work',   title: '정사영상 AI 모델 v2.1 배포 완료',      date: '2026.04.14', views: 98  },
        { id: 6, cat: 'work',   title: '카메라 AI 추론 신규 클래스 2종 추가',  date: '2026.04.10', views: 76  }
      ]
    },
    usecase: {
      moreLabel: '활용사례 더보기',
      moreHref: 'usecase.html',
      detailUrl: function (id) { return 'usecase.html?uc=' + id; },
      items: [
        { id: 2, title: '[도로안전] Land-XI 기반 AI 도로결함 자동 탐지 실증 — 남원시 관내 6개 권역', date: '2026.04.15', views: 64 },
        { id: 1, title: '[영농관리] Land-XI 플랫폼으로 영농문제까지 해결!',                          date: '2025.11.23', views: 41 }
      ]
    },
    faq: {
      moreLabel: '자주 묻는 질문 더보기',
      moreHref: 'faq.html',
      detailUrl: function (id) { return 'faq.html?faq=' + id; },
      catLabels: {
        '01': '서비스 이용',
        '02': '데이터 업로드',
        '03': '분석 서비스',
        '04': '오류 및 점검',
        '05': '자료 다운로드',
        '06': '기타'
      },
      items: [
        { id: 1, cat: '01', title: 'Namwon GeoVision 플랫폼은 어떤 서비스인가요?' },
        { id: 2, cat: '01', title: '사용 권한은 어떻게 부여받나요?' },
        { id: 3, cat: '03', title: '정사영상과 카메라 분석은 어떻게 다른가요?' }
      ]
    }
  };

  function initBoardTabs() {
    var tabs = document.querySelectorAll('.home-board-tab');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        renderBoard(tab.dataset.board);
      });
    });
    renderBoard('notice');
  }

  function renderBoard(key) {
    var data = BOARD[key];
    if (!data) return;
    var listEl = document.getElementById('home-board-list');
    var moreEl = document.getElementById('home-board-more');
    if (!listEl || !moreEl) return;

    var html = '';
    data.items.forEach(function (it) {
      // 카테고리 배지 — 활용사례처럼 cat 이 없으면 표시하지 않음
      var catHtml = '';
      if (it.cat && data.catLabels && data.catLabels[it.cat]) {
        catHtml = '<span class="home-board-cat home-board-cat--' + it.cat + '">' + data.catLabels[it.cat] + '</span>';
      }
      // 메타 — views / date 가 정의된 경우만, 작성자는 표시하지 않음
      var metaParts = [];
      if (typeof it.views !== 'undefined') metaParts.push('<span>조회수 : ' + it.views + '</span>');
      if (it.date) metaParts.push('<span class="home-board-meta-sep">등록일 : ' + it.date + '</span>');
      var metaHtml = metaParts.length ? '<span class="home-board-meta">' + metaParts.join('') + '</span>' : '';

      var href = data.detailUrl ? data.detailUrl(it.id) : data.moreHref;
      html += '<a class="home-board-row" href="' + href + '">' +
        catHtml +
        '<span class="home-board-text">' + it.title + '</span>' +
        metaHtml +
      '</a>';
    });
    listEl.innerHTML = html;

    moreEl.href = data.moreHref;
    var labelNode = moreEl.childNodes[0];
    if (labelNode) labelNode.nodeValue = data.moreLabel + ' ';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
