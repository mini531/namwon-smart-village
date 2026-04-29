/* =========================================================
   Land-XI - AI 추론 시뮬레이션 모듈
   ========================================================= */

var NamwonDetect = (function () {
  'use strict';

  /* -------------------------------------------------------
     정사영상 AI 추론 시뮬레이션
  ------------------------------------------------------- */
  function runOrthoInference(options) {
    options = options || {};
    var onProgress = options.onProgress || function () {};
    var onStep = options.onStep || function () {};
    var onComplete = options.onComplete || function () {};
    var totalDuration = options.duration || 2500;

    var steps = [
      { name: '크롭', desc: '정사영상 타일 크롭', weight: 0.1 },
      { name: '타일링', desc: '512x512 타일 분할', weight: 0.15 },
      { name: 'YOLO', desc: 'YOLOv8 객체 탐지', weight: 0.3 },
      { name: 'SAM', desc: 'SAM 세그멘테이션', weight: 0.2 },
      { name: '병합', desc: '타일 결과 병합', weight: 0.1 },
      { name: '후처리', desc: 'NMS 필터링', weight: 0.08 },
      { name: 'GPKG', desc: 'GeoPackage 저장', weight: 0.05 },
      { name: 'GeoServer', desc: 'GeoServer 업로드', weight: 0.02 }
    ];

    var currentStep = 0;
    var startTime = Date.now();
    var stepStartTimes = [0];
    var cumWeight = 0;
    steps.forEach(function (s) { cumWeight += s.weight; stepStartTimes.push(cumWeight); });

    var timer = setInterval(function () {
      var elapsed = Date.now() - startTime;
      var pct = Math.min(elapsed / totalDuration, 1);

      // 현재 단계 판정
      var newStep = 0;
      steps.forEach(function (s, i) {
        if (pct >= stepStartTimes[i]) newStep = i;
      });

      if (newStep !== currentStep) {
        onStep(currentStep, 'done');
        currentStep = newStep;
        onStep(currentStep, 'running');
      }

      onProgress(Math.floor(pct * 100));

      if (pct >= 1) {
        clearInterval(timer);
        onStep(currentStep, 'done');
        onComplete(generateOrthoResults());
      }
    }, 50);

    onStep(0, 'running');
    return { cancel: function () { clearInterval(timer); } };
  }

  /* -------------------------------------------------------
     카메라 AI 추론 시뮬레이션
  ------------------------------------------------------- */
  function runCameraInference(options) {
    options = options || {};
    var onProgress = options.onProgress || function () {};
    var onComplete = options.onComplete || function () {};
    var totalDuration = options.duration || 1800;

    var startTime = Date.now();
    var timer = setInterval(function () {
      var pct = Math.min((Date.now() - startTime) / totalDuration, 1);
      onProgress(Math.floor(pct * 100));
      if (pct >= 1) {
        clearInterval(timer);
        onComplete(generateCameraResults());
      }
    }, 40);

    return { cancel: function () { clearInterval(timer); } };
  }

  /* -------------------------------------------------------
     정사영상 결과 생성
  ------------------------------------------------------- */
  function generateOrthoResults() {
    var classes = ['Pothole', 'Crack', 'Patch', 'Void_Suspected', 'Litter'];
    var results = [];
    var count = 5 + Math.floor(Math.random() * 8);

    for (var i = 0; i < count; i++) {
      var cls = classes[Math.floor(Math.random() * classes.length)];
      results.push({
        id: 'ORG-' + String(i + 1).padStart(3, '0'),
        class_en: cls,
        class_ko: NamwonMap.CLASS_KO[cls],
        confidence: +(0.68 + Math.random() * 0.27).toFixed(2),
        bbox: [
          Math.floor(Math.random() * 100 + 60),
          Math.floor(Math.random() * 80 + 40),
          Math.floor(Math.random() * 100 + 240),
          Math.floor(Math.random() * 80 + 160)
        ],
        area_m2: +(Math.random() * 4 + 0.2).toFixed(2),
        severity: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
      });
    }
    return results;
  }

  /* -------------------------------------------------------
     카메라 결과 생성
  ------------------------------------------------------- */
  function generateCameraResults() {
    var classes = ['Barrier_Damaged', 'Delineator_Damaged', 'Sign_Damaged',
                   'Lane_Faded', 'Color_Manhole', 'Pothole', 'Illegal_Parking'];
    var results = [];
    var count = 4 + Math.floor(Math.random() * 6);

    for (var i = 0; i < count; i++) {
      var cls = classes[Math.floor(Math.random() * classes.length)];
      results.push({
        id: 'CAM-' + String(i + 1).padStart(3, '0'),
        class_en: cls,
        class_ko: NamwonMap.CLASS_KO[cls],
        confidence: +(0.68 + Math.random() * 0.27).toFixed(2),
        severity: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
        bbox: [
          Math.floor(Math.random() * 80 + 80),
          Math.floor(Math.random() * 60 + 100),
          Math.floor(Math.random() * 100 + 300),
          Math.floor(Math.random() * 80 + 240)
        ],
        frame: 'frame_' + String(Math.floor(Math.random() * 1000)).padStart(4, '0') + '.jpg',
        gnss_lat: (35.39 + Math.random() * 0.05).toFixed(6),
        gnss_lng: (127.37 + Math.random() * 0.05).toFixed(6),
        caption: generateCaption(cls)
      });
    }
    return results;
  }

  /* -------------------------------------------------------
     이미지 캡셔닝 자연어 생성
  ------------------------------------------------------- */
  var CAPTIONS = {
    Pothole: '도로 노면에 직경 약 {size}cm 크기의 포트홀이 탐지되었습니다. 차량 통행 시 안전사고 위험이 있어 즉시 보수가 필요합니다.',
    Crack: '아스팔트 표면에 {dir} 방향의 균열이 관찰되었습니다. 균열 폭 약 {w}mm로 우수 침투 및 확대 가능성이 있습니다.',
    Patch: '이전 보수 흔적(패치)이 확인됩니다. 재보수 여부 점검이 필요합니다.',
    Void_Suspected: '노면 하부 공동(空洞)이 의심되는 구간입니다. GPR 정밀 조사를 권고합니다.',
    Litter: '도로변에 불법 투기 쓰레기가 탐지되었습니다. 환경 미화 조치가 필요합니다.',
    Barrier_Damaged: '중앙분리대 구조물이 파손되어 있습니다. 고속 주행 차량의 반대 차로 진입 위험이 있어 긴급 조치가 필요합니다.',
    Delineator_Damaged: '시선유도봉 {n}개가 파손 또는 이탈된 상태입니다. 야간 시인성 저하로 인한 사고 위험이 증가합니다.',
    Pedestrian_Facility_Damaged: '보행안전시설물(난간/볼라드)이 파손된 상태입니다. 보행자 안전을 위한 즉시 교체가 필요합니다.',
    Sign_Damaged: '교통표지판이 훼손되어 식별이 어렵습니다. 정보 전달 기능 상실로 인한 사고 예방을 위해 교체가 필요합니다.',
    Lane_Faded: '차선 도색이 마모되어 시인성이 현저히 저하된 구간입니다. 우천 시 및 야간 사고 위험이 높습니다.',
    Color_Manhole: '컬러 맨홀 뚜껑이 탐지되었습니다. 노면 돌출 여부 및 파손 상태를 현장 확인하시기 바랍니다.',
    Illegal_Parking: '불법 주정차 차량이 탐지되었습니다. 교통 소통 저해 및 긴급차량 통행 방해 가능성이 있습니다.'
  };

  function generateCaption(cls) {
    var template = CAPTIONS[cls] || '이상 객체가 탐지되었습니다. 현장 확인이 필요합니다.';
    return template
      .replace('{size}', String(Math.floor(Math.random() * 40 + 10)))
      .replace('{dir}', ['종', '횡', '사'][Math.floor(Math.random() * 3)])
      .replace('{w}', String(Math.floor(Math.random() * 15 + 3)))
      .replace('{n}', String(Math.floor(Math.random() * 4 + 1)));
  }

  /* -------------------------------------------------------
     파이프라인 단계 정의 (정사영상)
  ------------------------------------------------------- */
  var ORTHO_PIPELINE_STEPS = [
    { name: '크롭', desc: '정사영상 타일 크롭 처리', icon: 'crop' },
    { name: '타일링', desc: '512×512 px 타일 분할', icon: 'grid' },
    { name: 'YOLO', desc: 'YOLOv8 객체 탐지 수행', icon: 'ai' },
    { name: 'SAM', desc: 'SAM 세그멘테이션 정제', icon: 'segment' },
    { name: '병합', desc: '타일 결과 병합 처리', icon: 'merge' },
    { name: '후처리', desc: 'NMS 중복 제거 필터링', icon: 'filter' },
    { name: 'GPKG', desc: 'GeoPackage 포맷 저장', icon: 'save' },
    { name: 'GeoServer', desc: 'GeoServer 레이어 발행', icon: 'upload' }
  ];

  /* -------------------------------------------------------
     퍼블릭 API
  ------------------------------------------------------- */
  return {
    runOrthoInference: runOrthoInference,
    runCameraInference: runCameraInference,
    generateCaption: generateCaption,
    ORTHO_PIPELINE_STEPS: ORTHO_PIPELINE_STEPS
  };
})();
