/* =========================================================
   AI 분석 페이지 — 사이드바 카드 클릭 → 인라인 패널 + 지도 이동
   ========================================================= */

(function () {
  'use strict';

  // ── 데이터 정의 ────────────────────────────────────────
  var TASKS = [
    { id: 'road-ortho',  name: '도로안전 정사영상' },
    { id: 'road-camera', name: '도로안전 카메라' },
    { id: 'silage-grow', name: '사료작물(생육기) 탐지' },
    { id: 'silage-prod', name: '사료작물(생산기) 탐지' },
    { id: 'bale',        name: '곤포사일리지 탐지' },
    { id: 'greenhouse',  name: '비닐하우스 탐지' },
    { id: 'farmland',    name: '농지 활용 분석' },
    { id: 'trash',       name: '방치 쓰레기 탐지' }
  ];

  var RANGES = [
    { id: 'parcel', name: '필지 기반',  desc: '필지 단위 그룹' },
    { id: 'shp',    name: 'SHP 영역',  desc: '영역 내부 자일링', disabled: true },
    { id: 'draw',   name: '지도 그리기', desc: '직접 영역 지정',   disabled: true },
    { id: 'all',    name: '전체 추론',   desc: '영상 전체',         disabled: true }
  ];

  // 필지(데이터셋) — '필지 기반' 범위 선택 시 보여줌. 분류 표시 안 함.
  var PARCELS = [
    { id: 'P01', name: '사료작물(하계)_사매면',     date: '2025-10-30' },
    { id: 'P02', name: '사료작물(동계) 운봉읍',     date: '2025-04-29' },
    { id: 'P03', name: '사료작물(IRG,호밀) 5권역',  date: '2025-06-29' },
    { id: 'P04', name: '사료작물(IRG,호밀) 4권역',  date: '2025-06-29' },
    { id: 'P05', name: '사료작물(IRG,호밀) 3권역',  date: '2025-06-29' },
    { id: 'P06', name: '사료작물(추계) 인월면',     date: '2025-09-12' },
    { id: 'P07', name: '사료작물(춘계) 산내면',     date: '2025-03-21' }
  ];

  // 영상 카테고리(탭)
  var VIDEO_CATS = [
    { id: 'all',     name: '전체' },
    { id: 'recent',  name: '최근' },
    { id: 'shared',  name: '공유' },
    { id: 'mine',    name: '내 영상' }
  ];

  // 정사영상(ECW) 데이터 — 드론 촬영, 도로안전 정사영상·농업 분석용
  var VIDEOS_ECW = [
    { id: 'E01', name: '남원_광한루원_드론.ecw',  region: '도통동', tag: 'ECW', size: '58.3GB', date: '2026-04-10' },
    { id: 'E02', name: '남원_운봉_드론_4월.ecw',  region: '운봉읍', tag: 'ECW', size: '62.7GB', date: '2026-04-08' },
    { id: 'E03', name: '인월_농지권역_드론.ecw',  region: '인월면', tag: 'ECW', size: '54.8GB', date: '2026-04-05' },
    { id: 'E04', name: '주생면_도로망_드론.ecw',  region: '주생면', tag: 'ECW', size: '48.2GB', date: '2026-03-28' },
    { id: 'E05', name: '쌍교동_도로망_3월.ecw',   region: '쌍교동', tag: 'ECW', size: '51.5GB', date: '2026-03-20' },
    { id: 'E06', name: '동충동_도로망_3월.ecw',   region: '동충동', tag: 'ECW', size: '49.0GB', date: '2026-03-16' }
  ];

  // 차량 카메라 이미지 데이터셋 — 도로안전(카메라) 분석용
  var VIDEOS_CAM = [
    { id: 'C01', name: '도통_순찰루트_DASHCAM_4월.zip', region: '도통동', tag: 'IMG', size: '4,820장', date: '2026-04-12' },
    { id: 'C02', name: '향교_순찰루트_DASHCAM_4월.zip', region: '향교동', tag: 'IMG', size: '3,940장', date: '2026-04-09' },
    { id: 'C03', name: '운봉_순찰루트_DASHCAM_3월.zip', region: '운봉읍', tag: 'IMG', size: '5,210장', date: '2026-03-25' },
    { id: 'C04', name: '주생_순찰루트_DASHCAM_3월.zip', region: '주생면', tag: 'IMG', size: '2,860장', date: '2026-03-18' },
    { id: 'C05', name: '쌍교_순찰루트_DASHCAM_3월.zip', region: '쌍교동', tag: 'IMG', size: '3,510장', date: '2026-03-11' }
  ];

  // 영상 region → 좌표 매핑 (남원시 주요 동/읍/면)
  var REGION_CENTERS = {
    '도통동': [127.3905, 35.4158],
    '향교동': [127.3878, 35.4142],
    '중앙동': [127.3912, 35.4197],
    '노암동': [127.3870, 35.4118],
    '금동':   [127.3867, 35.4195],
    '쌍교동': [127.3932, 35.4220],
    '동충동': [127.3955, 35.4145],
    '운봉읍': [127.5175, 35.4525],
    '인월면': [127.5780, 35.4480],
    '주생면': [127.3470, 35.3800]
  };

  var NAMWON_CENTER = [127.3905, 35.4158];
  var PER_PAGE = 4;

  // ── 상태 ────────────────────────────────────────────
  var state = {
    task:   null,
    video:  null,
    range:  null,
    parcel: null,
    panel:  null,    // 'task' | 'video' | 'range' | 'parcel' | null
    videoCat: 'all',
    videoPage:  1,
    parcelPage: 1
  };

  var aiMap = null;
  var pinLayer = null;

  // ── DOM ────────────────────────────────────────────
  var $panel       = document.getElementById('ai-panel');
  var $panelTitle  = document.getElementById('ai-panel-title');
  var $panelBody   = document.getElementById('ai-panel-body');
  var $panelFoot   = document.getElementById('ai-panel-foot');
  var $panelClose  = document.getElementById('ai-panel-close');
  var $runBtn      = document.getElementById('ai-run-btn');

  // ── 지도 초기화 (지도 서비스와 동일 셸: 검색·배경·측정·그리기·내보내기·줌) ──
  function initMap() {
    aiMap = NamwonMap.initMap('ai-map', { zoom: 12 });
    NamwonMap.buildMapShell(aiMap, {
      getSearchable: function () { return []; }
    });

    pinLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        image: new ol.style.Circle({
          radius: 9,
          fill: new ol.style.Fill({ color: 'rgba(200, 16, 46, 0.85)' }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2.5 })
        })
      })
    });
    aiMap.addLayer(pinLayer);
  }

  function flyTo(lonlat, zoom) {
    if (!aiMap) return;
    aiMap.getView().animate({
      center: ol.proj.fromLonLat(lonlat),
      zoom: zoom || 16,
      duration: 700
    });
    var src = pinLayer.getSource();
    src.clear();
    src.addFeature(new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(lonlat))
    }));
  }

  function resetMap() {
    if (!aiMap) return;
    aiMap.getView().animate({
      center: ol.proj.fromLonLat(NAMWON_CENTER),
      zoom: 12,
      duration: 600
    });
    pinLayer.getSource().clear();
  }

  // ── 패널 렌더 ──────────────────────────────────────
  function openPanel(kind) {
    state.panel = kind;
    $panel.classList.add('is-open');
    $panel.setAttribute('aria-hidden', 'false');

    document.querySelectorAll('.ai-pick-card').forEach(function (el) {
      el.classList.toggle('is-open', el.dataset.pick === kind);
    });

    if (kind === 'task') renderTaskPanel();
    else if (kind === 'video') renderVideoPanel();
    else if (kind === 'range') renderRangePanel();
    else if (kind === 'parcel') renderParcelPanel();
  }

  function closePanel() {
    state.panel = null;
    $panel.classList.remove('is-open');
    $panel.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.ai-pick-card').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }

  function renderTaskPanel() {
    $panelTitle.textContent = '분석 과제를 선택해 주세요';
    $panelFoot.hidden = true;

    var html = '<div class="ai-card-grid">';
    TASKS.forEach(function (t) {
      var sel = state.task && state.task.id === t.id ? ' is-selected' : '';
      html += '<div class="ai-opt-card' + sel + '" data-task="' + t.id + '">' +
        '<div class="ai-opt-thumb ai-opt-thumb--' + t.id + '"></div>' +
        '<div class="ai-opt-info"><div class="ai-opt-title">' + t.name + '</div></div>' +
      '</div>';
    });
    html += '</div>';
    $panelBody.innerHTML = html;

    $panelBody.querySelectorAll('.ai-opt-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var t = TASKS.filter(function (x) { return x.id === el.dataset.task; })[0];
        if (!t) return;
        // 분석 과제가 바뀌면 하위 선택 모두 초기화 (영상 종류 ECW/이미지가 달라짐)
        if (!state.task || state.task.id !== t.id) {
          state.video = null;
          state.range = null;
          state.parcel = null;
          state.videoCat = 'all';
          state.videoPage = 1;
        }
        state.task = t;
        updatePicks();
        closePanel();
      });
    });
  }

  function renderVideoPanel() {
    $panelTitle.textContent = '영상을 선택해 주세요';

    var tabsHtml = '<div class="ai-tabs">';
    VIDEO_CATS.forEach(function (c) {
      tabsHtml += '<button type="button" class="ai-tab' + (state.videoCat === c.id ? ' is-active' : '') + '" data-cat="' + c.id + '">' + c.name + '</button>';
    });
    tabsHtml += '</div>';

    // 페이지네이션 적용
    var list = filterVideos();
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (state.videoPage > pages) state.videoPage = pages;
    var start = (state.videoPage - 1) * PER_PAGE;
    var slice = list.slice(start, start + PER_PAGE);

    var listHtml = '<div class="ai-vid-list">';
    if (slice.length === 0) {
      listHtml += '<div class="ai-tab-hint">조건에 맞는 영상이 없어요.</div>';
    } else {
      slice.forEach(function (v) {
        var sel = state.video && state.video.id === v.id ? ' is-selected' : '';
        listHtml += '<div class="ai-vid-item' + sel + '" data-vid="' + v.id + '">' +
          '<div class="ai-vid-name">' + v.name + ' <span class="ai-vid-tag">' + v.tag + '</span></div>' +
          '<div class="ai-vid-meta">' + v.region + ' · ' + v.size + ' · ' + v.date + '</div>' +
        '</div>';
      });
    }
    listHtml += '</div>';

    $panelBody.innerHTML = tabsHtml + listHtml;

    // 페이지네이션 (공용 board-page-btn)
    if (pages > 1) {
      var pageHtml = '';
      for (var i = 1; i <= pages; i++) {
        pageHtml += '<button type="button" class="board-page-btn' + (i === state.videoPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }
      $panelFoot.innerHTML = pageHtml;
      $panelFoot.hidden = false;
      $panelFoot.querySelectorAll('.board-page-btn').forEach(function (el) {
        el.addEventListener('click', function () {
          state.videoPage = parseInt(el.dataset.page, 10);
          renderVideoPanel();
        });
      });
    } else {
      $panelFoot.hidden = true;
    }

    // 탭 이벤트
    $panelBody.querySelectorAll('.ai-tab').forEach(function (el) {
      el.addEventListener('click', function () {
        state.videoCat = el.dataset.cat;
        state.videoPage = 1;
        renderVideoPanel();
      });
    });

    // 영상 선택 이벤트 (선택하면 패널 닫고 지도 이동)
    $panelBody.querySelectorAll('.ai-vid-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var pool = VIDEOS_ECW.concat(VIDEOS_CAM);
        var v = pool.filter(function (x) { return x.id === el.dataset.vid; })[0];
        if (!v) return;
        state.video = v;
        updatePicks();
        var ctr = REGION_CENTERS[v.region] || NAMWON_CENTER;
        flyTo(ctr, 16);
        closePanel();
      });
    });
  }

  function filterVideos() {
    var pool = (state.task && state.task.id === 'road-camera') ? VIDEOS_CAM : VIDEOS_ECW;
    if (state.videoCat === 'all') return pool;
    if (state.videoCat === 'recent') return pool.slice(0, 4);
    if (state.videoCat === 'shared') return pool.slice(0, 3);
    if (state.videoCat === 'mine')   return pool.slice(2);
    return pool;
  }

  function renderRangePanel() {
    $panelTitle.textContent = '추론 범위를 선택해 주세요';
    $panelFoot.hidden = true;

    var html = '<div class="ai-range-list">';
    RANGES.forEach(function (r) {
      var cls = '';
      if (state.range && state.range.id === r.id) cls += ' is-selected';
      if (r.disabled) cls += ' is-disabled';
      var badge = r.disabled ? '<span class="ai-range-badge">서비스 제공 예정</span>' : '';
      html += '<div class="ai-range-item' + cls + '" data-range="' + r.id + '">' +
        badge +
        '<div class="ai-range-title">' + r.name + '</div>' +
        '<div class="ai-range-desc">' + r.desc + '</div>' +
      '</div>';
    });
    html += '</div>';
    $panelBody.innerHTML = html;

    $panelBody.querySelectorAll('.ai-range-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var r = RANGES.filter(function (x) { return x.id === el.dataset.range; })[0];
        if (!r || r.disabled) return;
        // 다른 범위로 바꾸면 기존 필지 선택은 초기화
        if (!state.range || state.range.id !== r.id) state.parcel = null;
        state.range = r;
        updatePicks();
        closePanel();
      });
    });
  }

  function renderParcelPanel() {
    $panelTitle.textContent = '필지를 선택해 주세요';

    var PER = 5;
    var total = PARCELS.length;
    var pages = Math.max(1, Math.ceil(total / PER));
    if (state.parcelPage > pages) state.parcelPage = pages;
    var start = (state.parcelPage - 1) * PER;
    var slice = PARCELS.slice(start, start + PER);

    var html = '<div class="ai-vid-list">';
    slice.forEach(function (p) {
      var sel = state.parcel && state.parcel.id === p.id ? ' is-selected' : '';
      html += '<div class="ai-vid-item' + sel + '" data-parcel="' + p.id + '">' +
        '<div class="ai-vid-meta">' + p.date + '</div>' +
        '<div class="ai-vid-name">' + p.name + '</div>' +
      '</div>';
    });
    html += '</div>';
    $panelBody.innerHTML = html;

    if (pages > 1) {
      var pageHtml = '';
      for (var i = 1; i <= pages; i++) {
        pageHtml += '<button type="button" class="board-page-btn' + (i === state.parcelPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      }
      $panelFoot.innerHTML = pageHtml;
      $panelFoot.hidden = false;
      $panelFoot.querySelectorAll('.board-page-btn').forEach(function (el) {
        el.addEventListener('click', function () {
          state.parcelPage = parseInt(el.dataset.page, 10);
          renderParcelPanel();
        });
      });
    } else {
      $panelFoot.hidden = true;
    }

    $panelBody.querySelectorAll('.ai-vid-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var p = PARCELS.filter(function (x) { return x.id === el.dataset.parcel; })[0];
        if (!p) return;
        state.parcel = p;
        updatePicks();
        closePanel();
      });
    });
  }

  // ── 사이드바 카드 갱신 ──────────────────────────────
  function updatePicks() {
    var taskCard  = document.getElementById('pick-task');
    var videoCard = document.getElementById('pick-video');
    var rangeCard = document.getElementById('pick-range');

    if (state.task) {
      taskCard.classList.add('is-selected');
      document.getElementById('pick-task-value').textContent = state.task.name;
    } else {
      taskCard.classList.remove('is-selected');
      document.getElementById('pick-task-value').textContent = '분석 과제를 선택해 주세요';
    }

    // 순차 활성화: 분석 과제 → 영상 → 범위 → (필지)
    var videoLocked = !state.task;
    var rangeLocked = !state.task || !state.video;
    videoCard.classList.toggle('is-disabled', videoLocked);
    rangeCard.classList.toggle('is-disabled', rangeLocked);

    if (state.video) {
      videoCard.classList.add('is-selected');
      document.getElementById('pick-video-value').textContent = state.video.name;
    } else {
      videoCard.classList.remove('is-selected');
      document.getElementById('pick-video-value').textContent = videoLocked ? '분석 과제를 먼저 선택해 주세요' : '영상을 선택해 주세요';
    }

    if (state.range) {
      rangeCard.classList.add('is-selected');
      document.getElementById('pick-range-value').textContent = state.range.name;
    } else {
      rangeCard.classList.remove('is-selected');
      document.getElementById('pick-range-value').textContent = rangeLocked ? '영상을 먼저 선택해 주세요' : '추론 범위를 선택해 주세요';
    }

    // 필지 카드: 범위가 '필지 기반' 일 때만 노출
    var parcelCard = document.getElementById('pick-parcel');
    var needsParcel = !!(state.range && state.range.id === 'parcel');
    parcelCard.hidden = !needsParcel;
    if (needsParcel) {
      if (state.parcel) {
        parcelCard.classList.add('is-selected');
        document.getElementById('pick-parcel-value').textContent = state.parcel.name;
      } else {
        parcelCard.classList.remove('is-selected');
        document.getElementById('pick-parcel-value').textContent = '필지를 선택해 주세요';
      }
    }

    var ready = !!(state.task && state.video && state.range && (!needsParcel || state.parcel));
    $runBtn.disabled = !ready;
  }

  // ── 이벤트 바인딩 ────────────────────────────────────
  document.querySelectorAll('.ai-pick-card').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.classList.contains('is-disabled')) return;
      var kind = el.dataset.pick;
      if (state.panel === kind) closePanel();
      else openPanel(kind);
    });
  });

  $panelClose.addEventListener('click', closePanel);

  // ── 분석 실행 / 진행 오버레이 ─────────────────────────
  // 실제 분석은 평균 24시간 소요 — 화면도 동일 페이스로 진행 (랜덤 ±1시간)
  var $progress       = document.getElementById('ai-progress-overlay');
  var $progressFill   = document.getElementById('ai-progress-fill');
  var $progressPct    = document.getElementById('ai-progress-pct');
  var $progressStg    = document.getElementById('ai-progress-stage');
  var $progressTtl    = document.getElementById('ai-progress-title');
  var $progressParcel = document.getElementById('ai-progress-parcel');
  var $progressStart  = document.getElementById('ai-progress-start');
  var $progressEnd    = document.getElementById('ai-progress-end');
  var $progressRemain = document.getElementById('ai-progress-remain');
  var $restartBtn     = document.getElementById('ai-restart-btn');
  var progressTimer = null;

  function fmtTimestamp(ms) {
    var d = new Date(ms);
    var pad = function (n) { return ('0' + n).slice(-2); };
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtRemain(ms) {
    var min = Math.max(0, Math.floor(ms / 60000));
    var hh = Math.floor(min / 60);
    var mm = min % 60;
    if (hh > 0) return hh + '시간 ' + mm + '분';
    if (mm > 0) return mm + '분';
    var sec = Math.max(0, Math.floor(ms / 1000));
    return sec + '초';
  }

  function startProgressSim() {
    var totalParcels = 2583;
    var totalMs = (24 * 60 + (Math.random() * 120 - 60)) * 60 * 1000;  // 24h ± 1h
    var startMs = Date.now();
    var endMs = startMs + totalMs;

    if (progressTimer) clearInterval(progressTimer);
    $progressTtl.textContent = '분석 진행 중';
    $progressStg.textContent = '대기열 등록';
    $progressStart.textContent = fmtTimestamp(startMs);
    $progressEnd.textContent = fmtTimestamp(endMs);

    function tick() {
      var now = Date.now();
      var pct = Math.min(100, ((now - startMs) / totalMs) * 100);
      var stage;
      if (pct < 2) stage = '전처리';
      else if (pct < 95) stage = '추론중';
      else if (pct < 100) stage = '후처리';
      else stage = '완료';

      $progressFill.style.width = pct + '%';
      $progressPct.textContent = pct.toFixed(2) + '%';
      $progressStg.textContent = stage;
      $progressParcel.textContent = Math.floor(totalParcels * pct / 100).toLocaleString() +
        ' / ' + totalParcels.toLocaleString();
      $progressRemain.textContent = fmtRemain(endMs - now);

      if (pct >= 100) {
        clearInterval(progressTimer);
        progressTimer = null;
        $progressTtl.textContent = '분석 완료';
        $progressRemain.textContent = '0분';
      }
    }
    tick();
    progressTimer = setInterval(tick, 1000);
  }

  function showProgress() {
    $progress.hidden = false;
    $progressFill.style.width = '0%';
    $progressPct.textContent = '0.00%';
    startProgressSim();
  }

  function hideProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    $progress.hidden = true;
    $progressFill.style.width = '0%';
  }

  function resetAll() {
    hideProgress();
    state.task = null;
    state.video = null;
    state.range = null;
    state.parcel = null;
    state.videoCat = 'all';
    state.videoPage = 1;
    state.parcelPage = 1;
    closePanel();
    updatePicks();
    resetMap();
  }

  $runBtn.addEventListener('click', function () {
    if ($runBtn.disabled) return;
    showProgress();
  });

  $restartBtn.addEventListener('click', resetAll);

  // ── 시작 ──────────────────────────────────────────
  function start() {
    updatePicks();
    if (typeof ol === 'undefined' || typeof NamwonMap === 'undefined') return;
    initMap();
    // 헤더 fetch / 레이아웃 안정화 후 사이즈 재계산 (다중 단계)
    setTimeout(function () { aiMap && aiMap.updateSize(); }, 100);
    setTimeout(function () { aiMap && aiMap.updateSize(); }, 600);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  document.addEventListener('headerLoaded', function () {
    if (aiMap) aiMap.updateSize();
  });
})();
