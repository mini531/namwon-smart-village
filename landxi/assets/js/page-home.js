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
      { number: '01', title: '방치쓰레기 탐지',          text: '불법으로 방치된 쓰레기를 신속하게 탐지함으로써 국토 환경을<br>보호하고 깨끗한 도시 조성을 위한 서비스입니다.' },
      { number: '02', title: '리싸이클링 자원 탐지',    text: '건설폐재류 등 7종의 재활용률이 높은 자원을 탐지하여<br>재활용 자원의 수거율을 증대시키고 지역 환경 문제를 개선하기 위한 서비스입니다.' },
      { number: '03', title: '개발제한구역 불법행위 탐지', text: '국토환경 보호를 위해 관리되는 개발제한구역을 중심으로<br>불법 행위를 모니터링하는 서비스입니다.' },
      { number: '04', title: '재난 피해 객체 탐지',     text: '재난 발생 시 신속한 피해상황 파악 및 의사결정<br>지원을 위한 서비스입니다.' }
    ];

    // .cross-text 두 카피 교차 토글 (4초 주기)
    (function () {
      var spans = document.querySelectorAll('.visualty1-center .cross-text span');
      if (spans.length < 2) return;
      var idx = 0;
      setInterval(function () {
        spans.forEach(function (s) { s.classList.remove('active'); });
        idx = (idx + 1) % spans.length;
        spans[idx].classList.add('active');
      }, 4000);
    })();

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
        '<div class="tit">Land-XI 분석 서비스</div>' +
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
        { id: 1, cat: '01', title: 'Land-XI 플랫폼은 어떤 서비스인가요?' },
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
