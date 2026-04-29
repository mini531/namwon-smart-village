/* =========================================================
   Land-XI - Chart.js 차트 모듈
   ========================================================= */

var NamwonCharts = (function () {
  'use strict';

  var COLORS = {
    primary: '#1A3A5C',
    accent: '#2D7DD2',
    danger: '#E63946',
    warning: '#F4A261',
    success: '#2A9D8F',
    muted: '#94A3B8'
  };

  var CLASS_COLORS = {
    Pothole: '#E63946',
    Crack: '#F4A261',
    Patch: '#2A9D8F',
    Void_Suspected: '#9B5DE5',
    Litter: '#F15BB5',
    Barrier_Damaged: '#FF6B35',
    Delineator_Damaged: '#FEE440',
    Pedestrian_Facility_Damaged: '#00BBF9',
    Sign_Damaged: '#00F5D4',
    Lane_Faded: '#E9C46A',
    Color_Manhole: '#A8DADC',
    Illegal_Parking: '#457B9D'
  };

  Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
  Chart.defaults.font.size = 12;

  /* -------------------------------------------------------
     클래스별 가로 바차트
  ------------------------------------------------------- */
  function createClassBarChart(canvasId, data) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    var labels = Object.keys(data.class_counts);
    var ko_labels = labels.map(function (l) { return NamwonMap.CLASS_KO[l] || l; });
    var values = labels.map(function (l) { return data.class_counts[l]; });
    var bgColors = labels.map(function (l) { return CLASS_COLORS[l] || COLORS.accent; });

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ko_labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' ' + ctx.parsed.x + '건'; }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#64748B', precision: 0 }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#1E293B', font: { size: 11 } }
          }
        }
      }
    });
  }

  /* -------------------------------------------------------
     모델별 도넛 차트
  ------------------------------------------------------- */
  function createModelDonutChart(canvasId, label, count, total, color) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    var remainder = total - count;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [label, '기타'],
        datasets: [{
          data: [count, remainder],
          backgroundColor: [color, '#E2EAF4'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 8,
              color: '#1E293B',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' ' + ctx.parsed + '건'; }
            }
          }
        }
      }
    });
  }

  /* -------------------------------------------------------
     월별 라인차트
  ------------------------------------------------------- */
  function createMonthlyLineChart(canvasId, detections) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // 월별 집계
    var months = {};
    detections.forEach(function (d) {
      var m = d.detected_at.substring(0, 7);
      months[m] = (months[m] || 0) + 1;
    });

    // 정렬
    var keys = Object.keys(months).sort();
    var labels = keys.map(function (k) { return k.replace('-', '.'); });
    var values = keys.map(function (k) { return months[k]; });

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '탐지 건수',
          data: values,
          borderColor: COLORS.accent,
          backgroundColor: 'rgba(45,125,210,0.08)',
          borderWidth: 2,
          pointBackgroundColor: COLORS.accent,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' 탐지 ' + ctx.parsed.y + '건'; }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#64748B', precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#64748B' }
          }
        }
      }
    });
  }

  /* -------------------------------------------------------
     심각도 도넛 차트
  ------------------------------------------------------- */
  function createSeverityDonutChart(canvasId, data) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['고위험', '주의', '양호'],
        datasets: [{
          data: [data.high_severity, data.medium_severity, data.low_severity],
          backgroundColor: [COLORS.danger, COLORS.warning, COLORS.success],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 11 } }
          }
        }
      }
    });
  }

  /* -------------------------------------------------------
     히스토그램 Canvas (Layers 패널 내)
  ------------------------------------------------------- */
  function drawHistogram(canvas, data, color) {
    color = color || '#2D7DD2';
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var max = Math.max.apply(null, data);
    var barW = w / data.length;

    data.forEach(function (val, i) {
      var barH = (val / max) * (h - 4);
      var x = i * barW;
      var alpha = 0.4 + (val / max) * 0.6;
      ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', ' + alpha + ')') || 'rgba(45,125,210,' + alpha + ')';

      // 간단히 색상 처리
      ctx.fillStyle = 'rgba(45,125,210,' + alpha + ')';
      ctx.fillRect(x + 1, h - barH, barW - 2, barH);
    });
  }

  /* -------------------------------------------------------
     퍼블릭 API
  ------------------------------------------------------- */
  return {
    createClassBarChart: createClassBarChart,
    createModelDonutChart: createModelDonutChart,
    createMonthlyLineChart: createMonthlyLineChart,
    createSeverityDonutChart: createSeverityDonutChart,
    drawHistogram: drawHistogram,
    CLASS_COLORS: CLASS_COLORS,
    COLORS: COLORS
  };
})();
