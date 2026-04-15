/* =========================================================
   Namwon GeoVision - Vworld 지도 공통 모듈
   API 키: 88CF60F1-99BC-3338-8893-0FE768F13E61
   ========================================================= */

var NamwonMap = (function () {
  'use strict';

  var VWORLD_KEY = '88CF60F1-99BC-3338-8893-0FE768F13E61';
  var NAMWON_CENTER = ol.proj.fromLonLat([127.3905, 35.4158]);

  /* -------------------------------------------------------
     Vworld 타일 레이어 생성
  ------------------------------------------------------- */
  function createVworldLayer(type) {
    type = type || 'Base';
    return new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_KEY + '/' + type + '/{z}/{y}/{x}.png',
        maxZoom: 19,
        attributions: 'Vworld'
      }),
      properties: { name: 'vworld-' + type.toLowerCase() }
    });
  }

  /* -------------------------------------------------------
     Vworld 위성 레이어
  ------------------------------------------------------- */
  function createSatelliteLayer() {
    return new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: 'https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_KEY + '/Satellite/{z}/{y}/{x}.jpeg',
        maxZoom: 19
      }),
      properties: { name: 'vworld-satellite' }
    });
  }

  /* -------------------------------------------------------
     지도 초기화
  ------------------------------------------------------- */
  function initMap(targetId, options) {
    options = options || {};

    // 기본 배경: 위성 지도
    var layers = [createSatelliteLayer()];
    if (options.base === true) {
      layers = [createVworldLayer('Base')];
    }

    var map = new ol.Map({
      target: targetId,
      layers: layers,
      view: new ol.View({
        center: options.center || NAMWON_CENTER,
        zoom: options.zoom || 14,
        minZoom: 10,
        maxZoom: 19
      }),
      controls: ol.control.defaults.defaults({ attribution: false, zoom: false })
    });

    return map;
  }

  /* -------------------------------------------------------
     마커 생성 - 핀 모양 (정사영상/카메라 공용, 심각도 색상)
  ------------------------------------------------------- */
  var _pinCache = {};
  function _buildPinSvg(color, innerShape) {
    // 20 x 26 작은 핀, 드롭쉐도우 포함
    return '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">' +
      '<defs>' +
        '<filter id="ds" x="-50%" y="-30%" width="200%" height="180%">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>' +
          '<feOffset dy="1.2"/>' +
          '<feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>' +
          '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>' +
      '</defs>' +
      '<g filter="url(#ds)">' +
        '<path d="M11 1.2C5.7 1.2 1.5 5.4 1.5 10.7c0 7.5 9.5 17.6 9.5 17.6s9.5-10.1 9.5-17.6C20.5 5.4 16.3 1.2 11 1.2z" ' +
          'fill="' + color + '" stroke="#ffffff" stroke-width="1.4"/>' +
        innerShape +
      '</g>' +
    '</svg>';
  }

  function _createPinStyle(kind, severity, color) {
    if (!color) {
      color = severity === 'high' ? '#C8102E'
            : severity === 'medium' ? '#F4A261'
            : '#2A9D8F';
    }

    var key = kind + '-' + severity + '-' + color;
    if (_pinCache[key]) return _pinCache[key];

    var inner = kind === 'camera'
      ? '<circle cx="11" cy="10.7" r="3.2" fill="#ffffff"/><circle cx="11" cy="10.7" r="1.5" fill="' + color + '"/>'
      : '<circle cx="11" cy="10.7" r="3.5" fill="#ffffff"/>';

    var svg = _buildPinSvg(color, inner);

    var style = new ol.style.Style({
      image: new ol.style.Icon({
        src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 1
      })
    });
    _pinCache[key] = style;
    return style;
  }

  function createOrthoMarkerStyle(severity) {
    return _createPinStyle('ortho', severity);
  }

  function createCameraMarkerStyle(severity) {
    return _createPinStyle('camera', severity);
  }

  // 클래스 기반 카메라 마커 스타일
  function createCameraMarkerStyleByClass(det) {
    var cls = det.class_en;
    var color = CAMERA_CLASS_COLORS[cls] || '#C8102E';
    return _createPinStyle('camera', det.severity, color);
  }

  /* -------------------------------------------------------
     클러스터 레이어 생성
  ------------------------------------------------------- */
  function createClusteredDetectionLayer(detections, filterFn, singleStyleFn) {
    var features = [];
    detections.forEach(function (det) {
      if (filterFn && !filterFn(det)) return;
      var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([det.lng, det.lat])),
        data: det
      });
      features.push(feature);
    });

    var source = new ol.source.Vector({ features: features });
    var cluster = new ol.source.Cluster({
      distance: 55,
      minDistance: 30,
      source: source
    });

    var styleCache = {};

    return new ol.layer.Vector({
      source: cluster,
      style: function (feature) {
        var subFeatures = feature.get('features');
        var size = subFeatures ? subFeatures.length : 1;

        if (size === 1) {
          var data = subFeatures[0].get('data');
          return singleStyleFn(data);
        }

        var hasHigh = subFeatures.some(function (f) { return (f.get('data') || {}).severity === 'high'; });
        var cacheKey = (hasHigh ? 'h' : 'n') + '-' + (size > 99 ? '99' : size);

        if (!styleCache[cacheKey]) {
          var bgColor = hasHigh ? '#C8102E' : '#1A3A5C';
          var radius = size >= 30 ? 22 : size >= 10 ? 19 : 16;

          styleCache[cacheKey] = [
            // 외부 블러 글로우
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: radius + 4,
                fill: new ol.style.Fill({ color: hasHigh ? 'rgba(200,16,46,0.22)' : 'rgba(26,58,92,0.22)' })
              })
            }),
            // 본체
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: bgColor }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 })
              }),
              text: new ol.style.Text({
                text: size > 99 ? '99+' : String(size),
                font: 'bold 13px Inter, sans-serif',
                fill: new ol.style.Fill({ color: '#ffffff' })
              })
            })
          ];
        }
        return styleCache[cacheKey];
      }
    });
  }

  /* -------------------------------------------------------
     클래스별 폴리곤 색상 (정사영상 파손 종류)
  ------------------------------------------------------- */
  var ORTHO_CLASS_COLORS = {
    Pothole: { stroke: '#E63946', fill: 'rgba(230, 57, 70, 0.40)' },
    Crack: { stroke: '#F4A261', fill: 'rgba(244, 162, 97, 0.38)' },
    Patch: { stroke: '#2A9D8F', fill: 'rgba(42, 157, 143, 0.38)' },
    Void_Suspected: { stroke: '#9B5DE5', fill: 'rgba(155, 93, 229, 0.38)' },
    Litter: { stroke: '#FFB703', fill: 'rgba(255, 183, 3, 0.36)' }
  };

  var CAMERA_CLASS_COLORS = {
    Pothole: '#E63946',
    Barrier_Damaged: '#F4A261',
    Delineator_Damaged: '#2A9D8F',
    Pedestrian_Facility_Damaged: '#9B5DE5',
    Sign_Damaged: '#FFB703',
    Lane_Faded: '#00B4D8',
    Color_Manhole: '#F15BB5',
    Illegal_Parking: '#8AC926'
  };

  var SEVERITY_COLORS = {
    high: { stroke: '#C8102E', fill: 'rgba(200, 16, 46, 0.40)' },
    medium: { stroke: '#F4A261', fill: 'rgba(244, 162, 97, 0.38)' },
    low: { stroke: '#2A9D8F', fill: 'rgba(42, 157, 143, 0.36)' }
  };

  var ORTHO_DEFAULT_COLOR = { stroke: '#C8102E', fill: 'rgba(200, 16, 46, 0.38)' };

  function _hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function _buildBboxPolygon(det) {
    // 도로 파손 ~8~15m 크기 (이는 시각적으로 보이는 도로 위 폴리곤 기준)
    var bbox = det.bbox || [100, 100, 200, 200];
    var pxW = bbox[2] - bbox[0];
    var pxH = bbox[3] - bbox[1];
    var aspect = pxH > 0 ? (pxW / pxH) : 1;
    // 기본 높이 ~10m, bbox 비율로 너비 (최대 2배 제한)
    var baseSize = 0.00009;
    var geoH = baseSize;
    var geoW = baseSize * Math.min(2, Math.max(0.5, aspect));
    var cx = det.lng;
    var cy = det.lat;
    var w2 = geoW / 2;
    var h2 = geoH / 2;
    var ring = [
      [cx - w2, cy - h2],
      [cx + w2, cy - h2],
      [cx + w2, cy + h2],
      [cx - w2, cy + h2],
      [cx - w2, cy - h2]
    ].map(function (c) { return ol.proj.fromLonLat(c); });
    return new ol.geom.Polygon([ring]);
  }

  /* -------------------------------------------------------
     정사영상 폴리곤 + 클러스터링 레이어
     - 낮은 줌: 포인트 클러스터 배지 표시
     - 높은 줌(단일): 실제 폴리곤을 색상(클래스/심각도)으로 렌더
     - colorMode: 'class' (기본) 또는 'severity'
  ------------------------------------------------------- */
  function createOrthoPolygonLayer(detections, filterFn, colorMode) {
    colorMode = colorMode || 'class';
    var pointFeatures = [];

    detections.forEach(function (det) {
      if (filterFn && !filterFn(det)) return;
      var poly = _buildBboxPolygon(det);
      var pt = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([det.lng, det.lat])),
        data: det,
        polygon: poly
      });
      pointFeatures.push(pt);
    });

    var source = new ol.source.Vector({ features: pointFeatures });
    var cluster = new ol.source.Cluster({
      distance: 55,
      minDistance: 30,
      source: source
    });

    var clusterStyleCache = {};

    return new ol.layer.Vector({
      source: cluster,
      style: function (feature) {
        var children = feature.get('features');
        var size = children ? children.length : 1;

        // 단일 포인트: 원래 폴리곤을 설정된 모드로 색상 렌더
        if (size === 1) {
          var child = children[0];
          var data = child.get('data');
          var poly = child.get('polygon');
          var col;
          if (colorMode === 'severity') {
            col = SEVERITY_COLORS[data.severity] || ORTHO_DEFAULT_COLOR;
          } else {
            col = ORTHO_CLASS_COLORS[data.class_en] || ORTHO_DEFAULT_COLOR;
          }

          return [
            new ol.style.Style({
              geometry: poly,
              fill: new ol.style.Fill({ color: col.fill }),
              stroke: new ol.style.Stroke({ color: col.stroke, width: 2.2 })
            })
          ];
        }

        // 클러스터 배지
        var key = size > 99 ? '99' : String(size);
        if (!clusterStyleCache[key]) {
          var radius = size >= 20 ? 22 : size >= 10 ? 19 : 16;
          clusterStyleCache[key] = [
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: radius + 4,
                fill: new ol.style.Fill({ color: 'rgba(200, 16, 46, 0.22)' })
              })
            }),
            new ol.style.Style({
              image: new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: '#C8102E' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.5 })
              }),
              text: new ol.style.Text({
                text: size > 99 ? '99+' : String(size),
                font: 'bold 13px Inter, sans-serif',
                fill: new ol.style.Fill({ color: '#ffffff' })
              })
            })
          ];
        }
        return clusterStyleCache[key];
      }
    });
  }

  /* -------------------------------------------------------
     클러스터 클릭 핸들러: 클릭시 클러스터 영역으로 줌인
  ------------------------------------------------------- */
  function bindClusterClick(map, layer) {
    map.on('click', function (evt) {
      map.forEachFeatureAtPixel(evt.pixel, function (feature, lyr) {
        if (lyr !== layer) return;
        var children = feature.get('features');
        if (!children || children.length <= 1) return;

        // 모든 하위 피처의 extent로 fit
        var extent = ol.extent.createEmpty();
        children.forEach(function (c) {
          ol.extent.extend(extent, c.getGeometry().getExtent());
        });
        map.getView().fit(extent, {
          duration: 500,
          padding: [80, 80, 80, 80],
          maxZoom: 18
        });
        return true;
      });
    });
  }

  /* -------------------------------------------------------
     벡터 레이어 생성
  ------------------------------------------------------- */
  function createDetectionLayer(detections, filterFn, styleFn) {
    var features = [];

    detections.forEach(function (det) {
      if (filterFn && !filterFn(det)) return;

      var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([det.lng, det.lat])),
        data: det
      });
      feature.setStyle(styleFn(det));
      features.push(feature);
    });

    var source = new ol.source.Vector({ features: features });
    return new ol.layer.Vector({ source: source });
  }

  /* -------------------------------------------------------
     팝업 오버레이 초기화
  ------------------------------------------------------- */
  function initPopup(map, popupEl, contentFn) {
    var overlay = new ol.Overlay({
      element: popupEl,
      autoPan: { animation: { duration: 250 } },
      positioning: 'bottom-center',
      offset: [0, -24],
      stopEvent: true
    });

    map.addOverlay(overlay);

    map.on('click', function (e) {
      var feature = map.forEachFeatureAtPixel(e.pixel, function (f) { return f; });
      if (feature) {
        var data = feature.get('data');
        var children = feature.get('features');

        // 클러스터 피처: 단일 포인트면 내부 data를 꺼내서 팝업, 다건이면 줌인만 (bindClusterClick가 처리)
        if (!data && children && children.length === 1) {
          data = children[0].get('data');
          feature = children[0];
        }

        if (data) {
          var geom = feature.getGeometry();
          var coords;
          // 폴리곤은 중심점으로
          if (geom.getType && geom.getType() === 'Polygon') {
            coords = ol.extent.getCenter(geom.getExtent());
          } else {
            coords = geom.getCoordinates();
          }
          overlay.setPosition(coords);
          popupEl.style.display = 'block';
          if (contentFn) contentFn(data, popupEl);
          return;
        }
      }
      overlay.setPosition(undefined);
      popupEl.style.display = 'none';
    });

    // 커서 변경
    map.on('pointermove', function (e) {
      var hit = map.hasFeatureAtPixel(e.pixel);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    return overlay;
  }

  /* -------------------------------------------------------
     마커 클릭 팝업 닫기
  ------------------------------------------------------- */
  function closePopup(overlay, popupEl) {
    overlay.setPosition(undefined);
    popupEl.style.display = 'none';
  }

  /* -------------------------------------------------------
     Bounding Box Canvas 렌더링
  ------------------------------------------------------- */
  function drawBoundingBox(canvas, det, imgW, imgH) {
    imgW = imgW || 320;
    imgH = imgH || 200;

    canvas.width = imgW;
    canvas.height = imgH;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, imgW, imgH);

    // 배경 (드론 정사영상 시뮬레이션)
    var grd = ctx.createLinearGradient(0, 0, imgW, imgH);
    grd.addColorStop(0, '#3d5a4a');
    grd.addColorStop(0.3, '#4a6b55');
    grd.addColorStop(0.6, '#5a7a60');
    grd.addColorStop(1, '#3d5a4a');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, imgW, imgH);

    // 도로 시뮬레이션
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(60, 0, imgW - 120, imgH);
    ctx.fillStyle = '#5a6170';
    ctx.fillRect(80, 0, imgW - 160, imgH);

    // 흰 점선
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(imgW / 2, 0);
    ctx.lineTo(imgW / 2, imgH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bounding Box
    var bbox = det.bbox || [80, 60, 240, 160];
    var scaleX = imgW / 480;
    var scaleY = imgH / 320;
    var x = bbox[0] * scaleX;
    var y = bbox[1] * scaleY;
    var w = (bbox[2] - bbox[0]) * scaleX;
    var h = (bbox[3] - bbox[1]) * scaleY;

    ctx.strokeStyle = '#2D7DD2';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 레이블 배경
    var label = det.class_en + ' ' + det.confidence.toFixed(2);
    ctx.font = 'bold 11px monospace';
    var labelW = ctx.measureText(label).width + 8;

    ctx.fillStyle = '#2D7DD2';
    ctx.fillRect(x, y - 16, labelW, 16);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 4, y - 4);

    // 파일명 워터마크
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(det.image_file || 'DJI_0001.JPG', 4, imgH - 4);
  }

  /* -------------------------------------------------------
     카메라 프레임 Canvas 렌더링
  ------------------------------------------------------- */
  function drawCameraFrame(canvas, det) {
    var w = canvas.width || 320;
    var h = canvas.height || 200;

    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext('2d');

    // 배경 (도로 장면)
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#87CEEB');
    bg.addColorStop(0.4, '#aed6f1');
    bg.addColorStop(0.4, '#7f8c8d');
    bg.addColorStop(1, '#5d6d7e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 도로
    ctx.fillStyle = '#606060';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // 차선
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.55);
    ctx.lineTo(w * 0.25, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.65, h * 0.55);
    ctx.lineTo(w * 0.75, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bounding Box
    var bbox = det.bbox || [100, 110, 280, 220];
    var scaleX = w / 640;
    var scaleY = h / 480;
    var x = bbox[0] * scaleX;
    var y = bbox[1] * scaleY;
    var bw = (bbox[2] - bbox[0]) * scaleX;
    var bh = (bbox[3] - bbox[1]) * scaleY;

    var color = det.severity === 'high' ? '#E63946'
              : det.severity === 'medium' ? '#F4A261'
              : '#2A9D8F';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, bw, bh);

    // 모서리 장식
    var cs = 8;
    ctx.lineWidth = 3;
    ['topleft', 'topright', 'bottomleft', 'bottomright'].forEach(function (corner) {
      var cx = corner.includes('left') ? x : x + bw;
      var cy = corner.includes('top') ? y : y + bh;
      ctx.beginPath();
      ctx.moveTo(cx + (corner.includes('left') ? cs : -cs), cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + (corner.includes('top') ? cs : -cs));
      ctx.stroke();
    });

    // 레이블
    ctx.font = 'bold 11px monospace';
    var lbl = det.class_en + ' ' + det.confidence.toFixed(2);
    var lw = ctx.measureText(lbl).width + 8;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 18, lw, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(lbl, x + 4, y - 5);

    // 타임스탬프
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 20, w, 20);
    ctx.fillStyle = '#0f0';
    ctx.font = '10px monospace';
    ctx.fillText(det.detected_at || '2026-04-15 09:00:00', 4, h - 6);
    ctx.fillStyle = '#ff0';
    ctx.fillText(det.image_file || 'CAM_0001.JPG', w - 100, h - 6);
  }

  /* -------------------------------------------------------
     클래스 한글 맵
  ------------------------------------------------------- */
  var CLASS_KO = {
    Pothole: '포트홀', Crack: '크랙', Patch: '보수흔적',
    Void_Suspected: '공동의심', Litter: '쓰레기',
    Barrier_Damaged: '중앙분리대파손', Delineator_Damaged: '시선유도봉파손',
    Pedestrian_Facility_Damaged: '보행안전시설물파손',
    Sign_Damaged: '교통표지판파손', Lane_Faded: '도로차선불량',
    Color_Manhole: '컬러맨홀', Illegal_Parking: '불법주정차'
  };

  var SEVERITY_KO = { high: '고위험', medium: '주의', low: '양호' };
  var STATUS_CLASS = { '미처리': 'unprocessed', '처리중': 'processing', '완료': 'done' };

  /* -------------------------------------------------------
     측정/그리기 도구 실제 구현
  ------------------------------------------------------- */
  var _mapToolState = new WeakMap();

  function _getToolState(map) {
    var s = _mapToolState.get(map);
    if (s) return s;
    s = {
      measureSource: null,
      measureLayer: null,
      drawSource: null,
      drawLayer: null,
      activeInteraction: null,
      measureOverlays: [],
      activeTooltipEl: null,
      activeTooltipOverlay: null,
      pointerMoveKey: null
    };
    _mapToolState.set(map, s);
    return s;
  }

  function _measureStyle() {
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(200, 16, 46, 0.18)' }),
      stroke: new ol.style.Stroke({ color: '#C8102E', width: 2.4, lineDash: [6, 4] }),
      image: new ol.style.Circle({
        radius: 5,
        fill: new ol.style.Fill({ color: '#C8102E' }),
        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
      })
    });
  }

  function _drawStyle() {
    return new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(45, 125, 210, 0.22)' }),
      stroke: new ol.style.Stroke({ color: '#2D7DD2', width: 2.6 }),
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({ color: '#2D7DD2' }),
        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
      })
    });
  }

  function _ensureMeasureLayer(map) {
    var s = _getToolState(map);
    if (s.measureLayer) return s;
    s.measureSource = new ol.source.Vector();
    s.measureLayer = new ol.layer.Vector({
      source: s.measureSource,
      style: _measureStyle(),
      zIndex: 900,
      properties: { name: 'measure-layer' }
    });
    map.addLayer(s.measureLayer);
    return s;
  }

  function _ensureDrawLayer(map) {
    var s = _getToolState(map);
    if (s.drawLayer) return s;
    s.drawSource = new ol.source.Vector();
    s.drawLayer = new ol.layer.Vector({
      source: s.drawSource,
      style: _drawStyle(),
      zIndex: 899,
      properties: { name: 'draw-layer' }
    });
    map.addLayer(s.drawLayer);
    return s;
  }

  function _removeActiveInteraction(map) {
    var s = _getToolState(map);
    if (s.activeInteraction) {
      map.removeInteraction(s.activeInteraction);
      s.activeInteraction = null;
    }
    if (s.pointerMoveKey) {
      ol.Observable.unByKey(s.pointerMoveKey);
      s.pointerMoveKey = null;
    }
    if (s.activeTooltipOverlay) {
      map.removeOverlay(s.activeTooltipOverlay);
      s.activeTooltipOverlay = null;
      s.activeTooltipEl = null;
    }
  }

  function _formatLength(line) {
    var length = ol.sphere.getLength(line);
    if (length >= 1000) return (length / 1000).toFixed(2) + ' km';
    return length.toFixed(1) + ' m';
  }

  function _formatArea(polygon) {
    var area = ol.sphere.getArea(polygon);
    if (area >= 1e6) return (area / 1e6).toFixed(2) + ' km²';
    if (area >= 1e4) return (area / 1e4).toFixed(2) + ' ha';
    return area.toFixed(1) + ' m²';
  }

  function _formatRadius(circle) {
    // 반경: OL 투영 좌표계 상 거리 → 근사 변환 (EPSG:3857 지역 왜곡 작음)
    var center = circle.getCenter();
    var edge = center.slice();
    edge[0] += circle.getRadius();
    var line = new ol.geom.LineString([center, edge]);
    var m = ol.sphere.getLength(line);
    if (m >= 1000) return (m / 1000).toFixed(2) + ' km';
    return m.toFixed(1) + ' m';
  }

  function _createTooltip(map, className) {
    var el = document.createElement('div');
    el.className = 'map-tool-tooltip ' + (className || '');
    var overlay = new ol.Overlay({
      element: el,
      offset: [0, -12],
      positioning: 'bottom-center',
      stopEvent: false,
      insertFirst: false
    });
    map.addOverlay(overlay);
    return { el: el, overlay: overlay };
  }

  function _startMeasure(map, mode) {
    var s = _ensureMeasureLayer(map);
    _removeActiveInteraction(map);

    var type = mode === 'area' ? 'Polygon' : mode === 'radius' ? 'Circle' : 'LineString';
    var draw = new ol.interaction.Draw({
      source: s.measureSource,
      type: type,
      style: _measureStyle()
    });
    s.activeInteraction = draw;
    map.addInteraction(draw);

    var tip = _createTooltip(map, 'measure-tooltip active');
    s.activeTooltipEl = tip.el;
    s.activeTooltipOverlay = tip.overlay;
    tip.el.textContent = mode === 'area' ? '첫 지점을 클릭' : mode === 'radius' ? '중심점을 클릭' : '시작점을 클릭';

    var sketch = null;
    var listener = null;

    draw.on('drawstart', function (evt) {
      sketch = evt.feature;
      listener = sketch.getGeometry().on('change', function (e) {
        var geom = e.target;
        var coord, text;
        if (geom instanceof ol.geom.Polygon) {
          text = _formatArea(geom);
          coord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.LineString) {
          text = _formatLength(geom);
          coord = geom.getLastCoordinate();
        } else if (geom instanceof ol.geom.Circle) {
          text = '반경 ' + _formatRadius(geom);
          coord = geom.getCenter();
        }
        if (tip.el && text && coord) {
          tip.el.textContent = text;
          tip.overlay.setPosition(coord);
        }
      });
    });

    draw.on('drawend', function (evt) {
      var geom = evt.feature.getGeometry();
      var text, coord;
      if (geom instanceof ol.geom.Polygon) {
        text = _formatArea(geom);
        coord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof ol.geom.LineString) {
        text = _formatLength(geom);
        coord = geom.getLastCoordinate();
      } else if (geom instanceof ol.geom.Circle) {
        text = '반경 ' + _formatRadius(geom);
        coord = geom.getCenter();
      }

      // 영구 라벨 오버레이 생성
      var labelEl = document.createElement('div');
      labelEl.className = 'map-tool-tooltip measure-tooltip static';
      labelEl.textContent = text;
      var labelOverlay = new ol.Overlay({
        element: labelEl,
        offset: [0, -8],
        positioning: 'bottom-center',
        stopEvent: false
      });
      labelOverlay.setPosition(coord);
      map.addOverlay(labelOverlay);
      s.measureOverlays.push(labelOverlay);

      if (listener) ol.Observable.unByKey(listener);
      sketch = null;

      // 활성 툴팁 제거하고 새 측정 준비
      if (s.activeTooltipOverlay) {
        map.removeOverlay(s.activeTooltipOverlay);
        s.activeTooltipOverlay = null;
        s.activeTooltipEl = null;
      }
      _removeActiveInteraction(map);
    });
  }

  function _clearMeasure(map) {
    var s = _getToolState(map);
    _removeActiveInteraction(map);
    if (s.measureSource) s.measureSource.clear();
    if (s.measureOverlays.length) {
      s.measureOverlays.forEach(function (ov) { map.removeOverlay(ov); });
      s.measureOverlays = [];
    }
  }

  function _startDraw(map, mode) {
    var s = _ensureDrawLayer(map);
    _removeActiveInteraction(map);

    var typeMap = { point: 'Point', line: 'LineString', area: 'Polygon', circle: 'Circle' };
    var type = typeMap[mode];
    if (!type) return;

    var draw = new ol.interaction.Draw({
      source: s.drawSource,
      type: type,
      style: _drawStyle()
    });
    s.activeInteraction = draw;
    map.addInteraction(draw);

    draw.on('drawend', function () {
      // 그리기 한 번 완료 후 자동 해제 (연속 그리기 방지, 원하면 유지 가능)
      _removeActiveInteraction(map);
    });
  }

  function _clearDraw(map) {
    var s = _getToolState(map);
    _removeActiveInteraction(map);
    if (s.drawSource) s.drawSource.clear();
  }

  /* -------------------------------------------------------
     지도 공통 도구/검색/하단바 셸 생성
     - 각 페이지의 .map-wrapper 내부에 공통 UI 구조 주입
     - 우측 도구(검색/배경지도/측정/그리기/내보내기/줌)
     - 검색 오버레이 + 결과 패널
     - 하단 상태바 (좌표, 링크)
  ------------------------------------------------------- */
  function buildMapShell(map, options) {
    options = options || {};
    var wrapper = map.getTargetElement().closest('.map-wrapper') || map.getTargetElement().parentElement;
    if (!wrapper) return;
    if (wrapper.dataset.shellBuilt) return;
    wrapper.dataset.shellBuilt = '1';

    // ── 검색 오버레이 (레퍼런스 구조: 명칭/도로명/지번 탭 + 페이지네이션) ──
    var searchHtml =
      '<div class="db-search-overlay" id="db-search-overlay">' +
        '<svg class="ds-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<input type="text" id="db-search-input" placeholder="명칭 또는 지도 검색">' +
        '<button class="ds-btn" id="btn-search-reset" title="검색 초기화">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>' +
        '</button>' +
        '<button class="ds-btn" id="btn-search-exec" title="검색 실행">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '</button>' +
        '<button class="ds-btn" id="btn-search-close" title="검색 닫기">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="db-search-results" id="db-search-results">' +
        '<div class="res-tabs-wrap">' +
          '<div class="res-tabs">' +
            '<button class="res-tab active" data-tab="all">전체</button>' +
            '<button class="res-tab" data-tab="name">명칭</button>' +
            '<button class="res-tab" data-tab="road">도로명</button>' +
            '<button class="res-tab" data-tab="lot">지번</button>' +
          '</div>' +
          '<button class="res-close" id="btn-res-close">&times;</button>' +
        '</div>' +
        '<div class="res-scroll-area">' +
          '<div class="res-summary">' +
            '<span class="res-query" id="res-query-val">-</span> 검색결과 | 총 <span class="res-total" id="res-total-val">0</span> 건' +
          '</div>' +
          '<div class="res-content" id="res-content-list"></div>' +
        '</div>' +
      '</div>';

    // ── 우측 도구 바 ──
    var toolsHtml =
      '<aside class="db-right-tools">' +
        '<div class="rt-group">' +
          '<button class="rt-btn" id="btn-search-toggle" title="검색">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '</button>' +
          '<div class="rt-sep"></div>' +
          '<div class="rt-group-wrap">' +
            '<button class="rt-btn" id="btn-basemap" title="배경지도 변경">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>' +
            '</button>' +
            '<div class="rt-submenu basemap-menu" id="basemap-menu">' +
              '<div class="bm-item" data-basemap="base"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/></svg></div><div class="bm-label">일반</div></div>' +
              '<div class="bm-item" data-basemap="gray"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/></svg></div><div class="bm-label">흑백</div></div>' +
              '<div class="bm-item" data-basemap="night"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div><div class="bm-label">야간</div></div>' +
              '<div class="bm-item active" data-basemap="satellite"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M12 2v2M12 20v2M20 12h2M2 12h2"/></svg></div><div class="bm-label">위성</div></div>' +
              '<div class="bm-item" data-basemap="none"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M1 1l22 22"/></svg></div><div class="bm-label">빈화면</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="rt-sep"></div>' +
          '<div class="rt-group-wrap">' +
            '<button class="rt-btn" id="btn-measure" title="측정 및 분석">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3l-9.3-9.3a2 2 0 00-2.8 0L2.3 12.9a2 2 0 000 2.8l9.3 9.3a2 2 0 002.8 0l6.9-6.9a2 2 0 000-2.8z"/><line x1="8.5" y1="11.5" x2="10" y2="10"/><line x1="11.5" y1="14.5" x2="13" y2="13"/><line x1="14.5" y1="17.5" x2="16" y2="16"/></svg>' +
            '</button>' +
            '<div class="rt-submenu measure-menu" id="measure-menu">' +
              '<div class="bm-item" data-measure="clear"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></div><div class="bm-label">취소</div></div>' +
              '<div class="bm-item" data-measure="distance"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L19 5"/></svg></div><div class="bm-label">거리</div></div>' +
              '<div class="bm-item" data-measure="area"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/></svg></div><div class="bm-label">면적</div></div>' +
              '<div class="bm-item" data-measure="radius"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 12h9"/></svg></div><div class="bm-label">반경</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="rt-sep"></div>' +
          '<div class="rt-group-wrap">' +
            '<button class="rt-btn" id="btn-draw" title="그리기 도구">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>' +
            '</button>' +
            '<div class="rt-submenu draw-menu" id="draw-menu">' +
              '<div class="bm-item" data-draw="clear"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/></svg></div><div class="bm-label">취소</div></div>' +
              '<div class="bm-item" data-draw="point"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="6"/></svg></div><div class="bm-label">점</div></div>' +
              '<div class="bm-item" data-draw="line"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L19 5"/></svg></div><div class="bm-label">선</div></div>' +
              '<div class="bm-item" data-draw="area"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/></svg></div><div class="bm-label">면</div></div>' +
              '<div class="bm-item" data-draw="circle"><div class="bm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 12h9"/></svg></div><div class="bm-label">원</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="rt-sep"></div>' +
          '<button class="rt-btn" id="btn-export" title="내보내기">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="rt-spacer"></div>' +
        '<div class="rt-group">' +
          '<button class="zoom-btn" id="btn-zoom-in" title="확대">+</button>' +
          '<div class="zoom-sep"></div>' +
          '<button class="zoom-btn" id="btn-zoom-out" title="축소">−</button>' +
        '</div>' +
      '</aside>';

    // ── 하단 상태바 ──
    var bottomLinks = options.bottomLinks || [
      { href: 'history.html', icon: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>', label: '분석 이력' },
      { href: 'report.html', icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', label: '보고서' }
    ];
    var linksHtml = bottomLinks.map(function (l) {
      return '<a href="' + l.href + '" class="bb-link"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + l.icon + '</svg>' + l.label + '</a>';
    }).join('');

    var bottomHtml =
      '<div class="glass-bottombar">' +
        '<span class="bb-link" style="padding:0;cursor:default;">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>' +
          '<span id="coord-display">위도 – / 경도 –</span>' +
        '</span>' +
        '<div class="bb-divider"></div>' +
        (options.bottomExtra || '') +
        '<div class="bb-spacer"></div>' +
        linksHtml +
      '</div>';

    // ── 내보내기(다운로드) 모달 ──
    var today = new Date();
    var todayStr = today.toISOString().substring(0, 10);
    var nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    var nextMonthStr = nextMonth.toISOString().substring(0, 10);

    var modalHtml =
      '<div class="pledge-overlay" id="pledge-overlay">' +
        '<div class="pledge-box">' +
          '<button class="pledge-close" id="pledge-close">&times;</button>' +
          '<header class="pledge-header">' +
            '<h1>보안 서약서</h1>' +
            '<p class="pledge-sub">다운로드를 받기 위해서는 해당 내용에 대한 동의가 필요합니다.</p>' +
          '</header>' +
          '<div class="pledge-content">' +
            '<div class="pledge-text-box">' +
              '본인은 <strong>Namwon GeoVision 플랫폼</strong>의 공간정보 다운로드 환경을 사용함에 있어 해당 자료를 외부로 유출하지 않을 것이며, 업무(과제) 수행에 한해 사용하고 이를 임의로 가공·편집·유출하지 않으며, 신청한 본인 외 제3자 또는 기관 내 타 사용자에게 공유하지 않고, 자료의 사용 및 활용, 목적 외 사용금지, 자료보호조치, 자료오용방지 등에 대한 책임이 있음을 서약하고 이에 본 서약서를 제출합니다.' +
            '</div>' +
            '<div class="pledge-applicant">신청자 : <strong>도로관리과 담당자</strong> 님</div>' +
            '<div class="p-form-group pledge-agree-group" id="pg-agree-wrap">' +
              '<label class="pledge-agree-check">' +
                '<input type="checkbox" id="pledge-agree">' +
                '<span class="check-box">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</span>' +
                '<span class="check-label"><span class="req">[필수]</span> 위 보안 서약 내용에 동의합니다.</span>' +
              '</label>' +
              '<div class="p-error-msg" style="margin-left:28px;">보안 서약 내용에 동의해 주셔야 합니다.</div>' +
            '</div>' +
            '<div class="p-form-group" id="pg-reqname-wrap">' +
              '<label>요청명 <span class="req">*</span></label>' +
              '<input type="text" id="p-req-name" placeholder="예) 도통동 도로 보수 계획 수립">' +
              '<div class="p-error-msg">요청명을 입력해 주세요.</div>' +
            '</div>' +
            '<div class="p-form-group" id="pg-period-wrap">' +
              '<label>활용 기간 <span class="req">*</span></label>' +
              '<div class="p-date-row">' +
                '<input type="date" id="p-start-date" value="' + todayStr + '">' +
                '<span class="p-sep">~</span>' +
                '<input type="date" id="p-end-date" value="' + nextMonthStr + '">' +
              '</div>' +
              '<div class="p-error-msg">활용 기간을 입력해 주세요.</div>' +
            '</div>' +
            '<div class="p-form-group" id="pg-purpose-wrap">' +
              '<label>사용 목적 <span class="req">*</span></label>' +
              '<input type="text" id="p-purpose" placeholder="예) 포트홀 긴급 보수 우선순위 선정">' +
              '<div class="p-error-msg">사용 목적을 입력해 주세요.</div>' +
            '</div>' +
          '</div>' +
          '<footer class="pledge-footer">' +
            '<button class="btn-p btn-p-cancel" id="btn-pledge-cancel">취소</button>' +
            '<button class="btn-p btn-p-exec" id="btn-pledge-exec">다운로드 실행</button>' +
          '</footer>' +
        '</div>' +
      '</div>';

    // DOM 삽입 (이미 있는 요소가 있다면 그대로 두고 없는 것만 추가)
    var frag = document.createElement('div');
    frag.innerHTML = searchHtml + toolsHtml + bottomHtml + modalHtml;
    while (frag.firstChild) wrapper.appendChild(frag.firstChild);

    // ── 이벤트 바인딩 ──
    _bindShellEvents(map, wrapper, options);
  }

  function _bindShellEvents(map, wrapper, options) {
    var basemapBtn = wrapper.querySelector('#btn-basemap');
    var basemapMenu = wrapper.querySelector('#basemap-menu');
    var measureBtn = wrapper.querySelector('#btn-measure');
    var measureMenu = wrapper.querySelector('#measure-menu');
    var drawBtn = wrapper.querySelector('#btn-draw');
    var drawMenu = wrapper.querySelector('#draw-menu');

    function closeAllSubmenus() {
      wrapper.querySelectorAll('.rt-submenu.open').forEach(function (m) { m.classList.remove('open'); });
      [basemapBtn, measureBtn, drawBtn].forEach(function (b) { if (b) b.classList.remove('active'); });
      wrapper.classList.remove('submenu-active');
    }

    function toggleMenu(btn, menu) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var was = menu.classList.contains('open');
        closeAllSubmenus();
        if (!was) {
          menu.classList.add('open');
          btn.classList.add('active');
          wrapper.classList.add('submenu-active');
        }
      });
    }

    if (basemapBtn && basemapMenu) toggleMenu(basemapBtn, basemapMenu);
    if (measureBtn && measureMenu) toggleMenu(measureBtn, measureMenu);
    if (drawBtn && drawMenu) toggleMenu(drawBtn, drawMenu);

    // 배경지도 전환
    wrapper.querySelectorAll('#basemap-menu .bm-item').forEach(function (item) {
      item.addEventListener('click', function () {
        wrapper.querySelectorAll('#basemap-menu .bm-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        var type = item.dataset.basemap;
        var layers = map.getLayers().getArray();
        if (layers[0]) map.removeLayer(layers[0]);
        var newLayer;
        if (type === 'none') {
          newLayer = new ol.layer.Tile({ source: new ol.source.XYZ({ url: '' }) });
        } else if (type === 'satellite' || type === 'hybrid') {
          newLayer = createSatelliteLayer();
        } else {
          newLayer = createVworldLayer(type === 'gray' ? 'gray' : type === 'night' ? 'midnight' : 'Base');
        }
        map.getLayers().insertAt(0, newLayer);
        closeAllSubmenus();
      });
    });

    // 측정/그리기 실제 구현
    wrapper.querySelectorAll('#measure-menu .bm-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var mode = item.dataset.measure;
        if (mode === 'clear') {
          _clearMeasure(map);
          if (window.NotifyUI) NotifyUI.info('측정이 취소되었습니다', '측정 도구');
        } else {
          _startMeasure(map, mode);
          var label = { distance: '거리', area: '면적', radius: '반경' }[mode];
          if (window.NotifyUI) NotifyUI.info('지도를 클릭하여 ' + label + '을(를) 측정하세요. 더블클릭으로 완료', label + ' 측정');
        }
        closeAllSubmenus();
      });
    });
    wrapper.querySelectorAll('#draw-menu .bm-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var mode = item.dataset.draw;
        if (mode === 'clear') {
          _clearDraw(map);
          if (window.NotifyUI) NotifyUI.info('그리기가 모두 삭제되었습니다', '그리기 도구');
        } else {
          _startDraw(map, mode);
          var label = { point: '점', line: '선', area: '면', circle: '원' }[mode];
          if (window.NotifyUI) NotifyUI.info('지도를 클릭하여 ' + label + '을(를) 그리세요', label + ' 그리기');
        }
        closeAllSubmenus();
      });
    });

    // 내보내기 → 보안 서약서 모달 오픈
    var exportBtn = wrapper.querySelector('#btn-export');
    var pledgeOverlay = wrapper.querySelector('#pledge-overlay');
    if (exportBtn && pledgeOverlay) {
      exportBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        pledgeOverlay.classList.add('show');
      });
    }

    if (pledgeOverlay) {
      function closePledge() {
        pledgeOverlay.classList.remove('show');
        // 폼 초기화는 유지 (사용자가 재진입 시 입력 유지)
      }
      var pCloseBtn = wrapper.querySelector('#pledge-close');
      var pCancelBtn = wrapper.querySelector('#btn-pledge-cancel');
      if (pCloseBtn) pCloseBtn.addEventListener('click', closePledge);
      if (pCancelBtn) pCancelBtn.addEventListener('click', closePledge);
      pledgeOverlay.addEventListener('click', function (e) {
        if (e.target === pledgeOverlay) closePledge();
      });

      // 입력 시 에러 클래스 제거
      ['p-req-name', 'p-start-date', 'p-end-date', 'p-purpose'].forEach(function (id) {
        var el = wrapper.querySelector('#' + id);
        if (el) el.addEventListener('input', function () {
          var group = el.closest('.p-form-group');
          if (group) group.classList.remove('has-error');
        });
      });
      var agreeChk = wrapper.querySelector('#pledge-agree');
      if (agreeChk) agreeChk.addEventListener('change', function () {
        var g = wrapper.querySelector('#pg-agree-wrap');
        if (agreeChk.checked && g) g.classList.remove('has-error');
      });

      // 다운로드 실행
      var execBtn = wrapper.querySelector('#btn-pledge-exec');
      if (execBtn) execBtn.addEventListener('click', function () {
        var valid = true;
        var agree = wrapper.querySelector('#pledge-agree');
        var reqName = wrapper.querySelector('#p-req-name');
        var startDate = wrapper.querySelector('#p-start-date');
        var endDate = wrapper.querySelector('#p-end-date');
        var purpose = wrapper.querySelector('#p-purpose');

        function setError(id, cond) {
          var g = wrapper.querySelector('#' + id);
          if (!g) return;
          if (cond) { g.classList.add('has-error'); valid = false; }
          else g.classList.remove('has-error');
        }

        setError('pg-agree-wrap', !agree.checked);
        setError('pg-reqname-wrap', !reqName.value.trim());
        setError('pg-period-wrap', !startDate.value || !endDate.value);
        setError('pg-purpose-wrap', !purpose.value.trim());

        if (!valid) return;

        execBtn.disabled = true;
        execBtn.textContent = '생성 중...';
        setTimeout(function () {
          execBtn.disabled = false;
          execBtn.textContent = '다운로드 실행';
          closePledge();
          if (window.NotifyUI) {
            NotifyUI.success(
              '요청명: ' + reqName.value +
              '\n활용 기간: ' + startDate.value + ' ~ ' + endDate.value +
              '\n사용 목적: ' + purpose.value,
              '다운로드가 시작되었습니다'
            );
          }
        }, 800);
      });
    }

    // 줌
    var zi = wrapper.querySelector('#btn-zoom-in');
    var zo = wrapper.querySelector('#btn-zoom-out');
    if (zi) zi.addEventListener('click', function () { map.getView().setZoom(map.getView().getZoom() + 1); });
    if (zo) zo.addEventListener('click', function () { map.getView().setZoom(map.getView().getZoom() - 1); });

    // 바깥 클릭 시 서브메뉴 닫기
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.rt-group-wrap')) closeAllSubmenus();
    });

    // 좌표 표시
    map.on('pointermove', function (e) {
      var lonLat = ol.proj.toLonLat(e.coordinate);
      var disp = wrapper.querySelector('#coord-display');
      if (disp) disp.textContent = '위도 ' + lonLat[1].toFixed(4) + ' / 경도 ' + lonLat[0].toFixed(4);
    });

    // 검색
    _bindShellSearch(map, wrapper, options);
  }

  // ── 남원시 검색 MOCK 데이터 (레퍼런스 구조) ──
  var MOCK_SEARCH_RESULTS = {
    name: [
      { title: '광한루원', sub: '관광지 > 문화재', addr: '전북특별자치도 남원시 요천로 1447', lat: 35.4106, lng: 127.3858 },
      { title: '춘향테마파크', sub: '관광지 > 테마파크', addr: '전북특별자치도 남원시 양림길 14', lat: 35.4133, lng: 127.3795 },
      { title: '남원시청', sub: '공공기관 > 시청', addr: '전북특별자치도 남원시 시청로 60', lat: 35.4163, lng: 127.3905 },
      { title: '남원역', sub: '교통시설 > 철도역', addr: '전북특별자치도 남원시 용성로 30', lat: 35.4120, lng: 127.3743 },
      { title: '지리산국립공원', sub: '관광지 > 국립공원', addr: '전북특별자치도 남원시 산내면 지리산로', lat: 35.3370, lng: 127.5407 },
      { title: '남원 향교', sub: '문화재 > 향교', addr: '전북특별자치도 남원시 향교길 43', lat: 35.4142, lng: 127.3877 },
      { title: '국립민속국악원', sub: '문화시설 > 공연장', addr: '전북특별자치도 남원시 양림길 54', lat: 35.4130, lng: 127.3778 },
      { title: '교룡산성', sub: '문화재 > 산성', addr: '전북특별자치도 남원시 산곡동', lat: 35.4235, lng: 127.3655 },
      { title: '남원역사교육관', sub: '교육시설 > 교육관', addr: '전북특별자치도 남원시 광한북로 123', lat: 35.4148, lng: 127.3868 },
      { title: '남원종합터미널', sub: '교통시설 > 버스터미널', addr: '전북특별자치도 남원시 용성로 42', lat: 35.4115, lng: 127.3762 }
    ],
    road: [
      { title: '시청로', sub: '도로명주소', addr: '전북특별자치도 남원시 시청로', lat: 35.4163, lng: 127.3905 },
      { title: '광한북로', sub: '도로명주소', addr: '전북특별자치도 남원시 광한북로', lat: 35.4148, lng: 127.3868 },
      { title: '요천로', sub: '도로명주소', addr: '전북특별자치도 남원시 요천로', lat: 35.4120, lng: 127.3858 },
      { title: '용성로', sub: '도로명주소', addr: '전북특별자치도 남원시 용성로', lat: 35.4118, lng: 127.3750 },
      { title: '양림길', sub: '도로명주소', addr: '전북특별자치도 남원시 양림길', lat: 35.4130, lng: 127.3790 },
      { title: '향교길', sub: '도로명주소', addr: '전북특별자치도 남원시 향교길', lat: 35.4140, lng: 127.3875 },
      { title: '금동3길', sub: '도로명주소', addr: '전북특별자치도 남원시 금동3길', lat: 35.4208, lng: 127.3860 },
      { title: '춘향로', sub: '도로명주소', addr: '전북특별자치도 남원시 춘향로', lat: 35.4100, lng: 127.3820 }
    ],
    lot: [
      { title: '도통동 123', sub: '지번주소', addr: '전북특별자치도 남원시 도통동 123', lat: 35.4158, lng: 127.3905 },
      { title: '도통동 456', sub: '지번주소', addr: '전북특별자치도 남원시 도통동 456', lat: 35.4172, lng: 127.3921 },
      { title: '향교동 78', sub: '지번주소', addr: '전북특별자치도 남원시 향교동 78', lat: 35.4135, lng: 127.3882 },
      { title: '향교동 145', sub: '지번주소', addr: '전북특별자치도 남원시 향교동 145', lat: 35.4151, lng: 127.3878 },
      { title: '중앙동 201', sub: '지번주소', addr: '전북특별자치도 남원시 중앙동 201', lat: 35.4201, lng: 127.3945 },
      { title: '금동 55', sub: '지번주소', addr: '전북특별자치도 남원시 금동 55', lat: 35.4189, lng: 127.3867 },
      { title: '노암동 112', sub: '지번주소', addr: '전북특별자치도 남원시 노암동 112', lat: 35.4110, lng: 127.3870 },
      { title: '노암동 234', sub: '지번주소', addr: '전북특별자치도 남원시 노암동 234', lat: 35.4130, lng: 127.3875 },
      { title: '쌍교동 67', sub: '지번주소', addr: '전북특별자치도 남원시 쌍교동 67', lat: 35.4225, lng: 127.3932 },
      { title: '동충동 34', sub: '지번주소', addr: '전북특별자치도 남원시 동충동 34', lat: 35.4143, lng: 127.3956 },
      { title: '운봉읍 동천리 642', sub: '지번주소', addr: '전북특별자치도 남원시 운봉읍 동천리 642', lat: 35.4380, lng: 127.5188 },
      { title: '운봉읍 가산리 1', sub: '지번주소', addr: '전북특별자치도 남원시 운봉읍 가산리 1', lat: 35.4410, lng: 127.5150 }
    ]
  };

  function _bindShellSearch(map, wrapper, options) {
    var toggle = wrapper.querySelector('#btn-search-toggle');
    var overlay = wrapper.querySelector('#db-search-overlay');
    var results = wrapper.querySelector('#db-search-results');
    var input = wrapper.querySelector('#db-search-input');
    var execBtn = wrapper.querySelector('#btn-search-exec');
    var resetBtn = wrapper.querySelector('#btn-search-reset');
    var closeBtn = wrapper.querySelector('#btn-search-close');
    var resCloseBtn = wrapper.querySelector('#btn-res-close');
    var currentTab = 'all';
    var currentPage = { name: 1, road: 1, lot: 1 };
    var ITEMS_PER_PAGE = 5;

    if (!toggle || !overlay) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var was = overlay.classList.contains('open');
      if (was) closeSearch();
      else {
        overlay.classList.add('open');
        toggle.classList.add('active');
        wrapper.classList.add('search-active');
        if (input) input.focus();
      }
    });

    function closeSearch() {
      overlay.classList.remove('open');
      toggle.classList.remove('active');
      wrapper.classList.remove('search-active');
      if (results) results.classList.remove('active');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeSearch);
    if (resetBtn) resetBtn.addEventListener('click', function () {
      if (input) { input.value = ''; input.focus(); }
      results.classList.remove('active');
    });
    if (resCloseBtn) resCloseBtn.addEventListener('click', function () { results.classList.remove('active'); });
    if (execBtn) execBtn.addEventListener('click', executeSearch);
    if (input) {
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') executeSearch(); });
      input.addEventListener('input', function () {
        if (input.value.trim().length === 0) results.classList.remove('active');
      });
    }

    wrapper.querySelectorAll('.res-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        wrapper.querySelectorAll('.res-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        if (currentTab !== 'all') currentPage[currentTab] = 1;
        renderSearchResults(input.value.trim(), currentTab);
      });
    });

    // ESC 로 닫기
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeSearch();
      }
    });

    function executeSearch() {
      var q = input.value.trim();
      if (q.length === 0) return;
      currentPage = { name: 1, road: 1, lot: 1 };
      renderSearchResults(q, 'all');
      wrapper.querySelectorAll('.res-tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.tab === 'all');
      });
      currentTab = 'all';
      results.classList.add('active');
    }

    function filterCategory(query, category) {
      var q = query.toLowerCase();
      return MOCK_SEARCH_RESULTS[category].filter(function (item) {
        return item.title.toLowerCase().indexOf(q) !== -1 ||
               item.addr.toLowerCase().indexOf(q) !== -1 ||
               item.sub.toLowerCase().indexOf(q) !== -1;
      });
    }

    function renderItem(item, typeKey) {
      var badgeText = typeKey === 'road' ? '도로명' : '지번';
      var badgeClass = typeKey === 'road' ? 'road' : 'lot';
      var el = document.createElement('div');
      el.className = 'res-item';
      el.innerHTML =
        '<div class="res-item-title">' + item.title + '</div>' +
        '<div class="res-item-sub">' + item.sub + '</div>' +
        '<div class="res-item-addr"><span class="addr-badge ' + badgeClass + '">' + badgeText + '</span> ' + item.addr + '</div>';
      el.addEventListener('click', function () {
        map.getView().animate({
          center: ol.proj.fromLonLat([item.lng, item.lat]),
          zoom: 16,
          duration: 600
        });
      });
      return el;
    }

    function renderPagination(totalItems, category) {
      var totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      if (totalPages <= 1) return null;
      var wrap = document.createElement('div');
      wrap.className = 'res-pagination';
      for (var i = 1; i <= totalPages; i++) {
        var btn = document.createElement('button');
        btn.className = 'pg-btn' + (i === currentPage[category] ? ' active' : '');
        btn.textContent = String(i);
        (function (p) {
          btn.addEventListener('click', function () {
            currentPage[category] = p;
            renderSearchResults(input.value.trim(), currentTab);
          });
        })(i);
        wrap.appendChild(btn);
      }
      return wrap;
    }

    function renderSection(category, items, isAllTab) {
      var sec = document.createElement('div');
      sec.className = 'res-sec';
      var label = category === 'name' ? '명칭' : category === 'road' ? '도로명' : '지번';

      var hd = document.createElement('div');
      hd.className = 'res-sec-hd';
      hd.innerHTML = '<span>' + label + ' <span class="res-sec-count">' + items.length + '</span> 건</span>';
      if (isAllTab && items.length > 2) {
        var more = document.createElement('a');
        more.className = 'res-more';
        more.href = 'javascript:void(0);';
        more.innerHTML = label + ' 더 보기 <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 18l6-6-6-6"/></svg>';
        more.addEventListener('click', function () {
          wrapper.querySelectorAll('.res-tab').forEach(function (t) {
            t.classList.toggle('active', t.dataset.tab === category);
          });
          currentTab = category;
          renderSearchResults(input.value.trim(), category);
        });
        hd.appendChild(more);
      }
      sec.appendChild(hd);

      var listEl = document.createElement('div');
      listEl.className = 'res-list';
      var displayData;
      if (isAllTab) {
        displayData = items.slice(0, 2);
      } else {
        var start = (currentPage[category] - 1) * ITEMS_PER_PAGE;
        displayData = items.slice(start, start + ITEMS_PER_PAGE);
      }
      displayData.forEach(function (it) { listEl.appendChild(renderItem(it, category)); });
      sec.appendChild(listEl);

      if (!isAllTab) {
        var pg = renderPagination(items.length, category);
        if (pg) sec.appendChild(pg);
      }
      return sec;
    }

    function renderSearchResults(query, tab) {
      var list = wrapper.querySelector('#res-content-list');
      var queryVal = wrapper.querySelector('#res-query-val');
      var totalVal = wrapper.querySelector('#res-total-val');
      list.innerHTML = '';
      queryVal.textContent = query;

      var nameItems = filterCategory(query, 'name');
      var roadItems = filterCategory(query, 'road');
      var lotItems = filterCategory(query, 'lot');
      var totalCount = 0;

      if (tab === 'all') {
        totalCount = nameItems.length + roadItems.length + lotItems.length;
        if (nameItems.length > 0) list.appendChild(renderSection('name', nameItems, true));
        if (roadItems.length > 0) list.appendChild(renderSection('road', roadItems, true));
        if (lotItems.length > 0) list.appendChild(renderSection('lot', lotItems, true));
      } else {
        var items = tab === 'name' ? nameItems : tab === 'road' ? roadItems : lotItems;
        totalCount = items.length;
        if (items.length > 0) list.appendChild(renderSection(tab, items, false));
      }

      if (totalCount === 0) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.4);font-size:12px;">검색 결과가 없습니다</div>';
      }

      totalVal.textContent = totalCount.toLocaleString();
      results.classList.add('active');
    }
  }

  /* -------------------------------------------------------
     글래스 카드 접기 토글 (헤더 클릭)
  ------------------------------------------------------- */
  function initGlassCardCollapse() {
    document.querySelectorAll('.glass-card .glass-card-header').forEach(function (header) {
      if (header.dataset.collapseInit) return;
      header.dataset.collapseInit = '1';
      // 토글 아이콘이 없으면 삽입
      if (!header.querySelector('.gc-toggle')) {
        var toggle = document.createElement('span');
        toggle.innerHTML = '<svg class="gc-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        header.appendChild(toggle.firstChild);
      }
      header.addEventListener('click', function (e) {
        // select/input 클릭 시 무시
        if (e.target.closest('select, input, button, a')) return;
        var card = header.closest('.glass-card');
        if (card) card.classList.toggle('collapsed');
      });
    });
  }

  /* -------------------------------------------------------
     퍼블릭 API
  ------------------------------------------------------- */
  return {
    initMap: initMap,
    createVworldLayer: createVworldLayer,
    createSatelliteLayer: createSatelliteLayer,
    createOrthoMarkerStyle: createOrthoMarkerStyle,
    createCameraMarkerStyle: createCameraMarkerStyle,
    createDetectionLayer: createDetectionLayer,
    createClusteredDetectionLayer: createClusteredDetectionLayer,
    createOrthoPolygonLayer: createOrthoPolygonLayer,
    createCameraMarkerStyleByClass: createCameraMarkerStyleByClass,
    ORTHO_CLASS_COLORS: ORTHO_CLASS_COLORS,
    CAMERA_CLASS_COLORS: CAMERA_CLASS_COLORS,
    SEVERITY_COLORS: SEVERITY_COLORS,
    bindClusterClick: bindClusterClick,
    buildMapShell: buildMapShell,
    initGlassCardCollapse: initGlassCardCollapse,
    initPopup: initPopup,
    closePopup: closePopup,
    drawBoundingBox: drawBoundingBox,
    drawCameraFrame: drawCameraFrame,
    VWORLD_KEY: VWORLD_KEY,
    NAMWON_CENTER: NAMWON_CENTER,
    CLASS_KO: CLASS_KO,
    SEVERITY_KO: SEVERITY_KO,
    STATUS_CLASS: STATUS_CLASS
  };
})();
