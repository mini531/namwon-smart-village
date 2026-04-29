/* 분석 클래스별 고정 색상 규격
 * - 지도 위 폴리곤·핀·범례·차트에서 동일 색상을 재사용
 * - 투명도가 필요하면 CSS/Canvas 측에서 rgba로 변환해서 사용
 * - 색상 수정 시 이 파일을 단일 진실 공급원으로 유지
 */
(function () {
  'use strict';

  window.NamwonClassColors = {
    // 사료작물 생육기
    IRG_GROWTH: '#f44336',
    RYE_GROWTH: '#ce7e00',
    CORN_GROWTH: '#2986cc',
    SUDAN_GRASS_GROWTH: '#6a329f',

    // 사료작물 생산기
    IRG_HARVEST: '#744700',
    RYE_HARVEST: '#8fce00',
    CORN_HARVEST: '#16537e',
    SUDAN_GRASS_HARVEST: '#c90076',

    // 비닐하우스
    GREENHOUSE_SINGLE: '#990000',
    GREENHOUSE_MULTI: '#b45f06',

    // 기타
    SILAGE_BALE: '#bf9000',
    FARMLAND_CULTIVATED: '#38761d',
    FARMLAND_UNCULTIVATED: '#134f5c',
    ABANDONED_WASTE: '#0b5394'
  };

  // hex → rgba 변환 유틸 (투명도 적용용)
  window.NamwonClassColors.toRgba = function (hex, alpha) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha == null ? 1 : alpha) + ')';
  };
})();
