/* =========================================================
   Land-XI - PDF 보고서 생성 모듈
   ========================================================= */

var NamwonReport = (function () {
  'use strict';

  /* -------------------------------------------------------
     보고서 설정 읽기
  ------------------------------------------------------- */
  function getReportConfig() {
    var config = {};

    var periodStart = document.getElementById('report-period-start');
    var periodEnd = document.getElementById('report-period-end');
    var modelType = document.getElementById('report-model-type');
    var region = document.getElementById('report-region');

    config.periodStart = periodStart ? periodStart.value : '2026-03-01';
    config.periodEnd = periodEnd ? periodEnd.value : '2026-04-15';
    config.modelType = modelType ? modelType.value : 'all';
    config.region = region ? region.value : '남원시 전체';
    config.generatedAt = window.formatDateTime ? window.formatDateTime(new Date()) : new Date().toISOString().substring(0, 16).replace('T', ' ').replace(/-/g, '.');

    return config;
  }

  /* -------------------------------------------------------
     종합 의견 자동 생성
  ------------------------------------------------------- */
  function generateOpinion(data, config) {
    var total = data.summary.total;
    var high = data.summary.high_severity;
    var unprocessed = data.summary.status_counts['미처리'] || 0;
    var pct = Math.round((high / total) * 100);

    var opinion = config.region + ' 내 도로 안전 관리 현황을 분석한 결과, ';
    opinion += '조사 기간(' + config.periodStart + ' ~ ' + config.periodEnd + ') 동안 ';
    opinion += '총 ' + total + '건의 도로 안전 위협 요소가 탐지되었습니다. ';
    opinion += '\n\n';

    opinion += '탐지 결과 중 고위험(High) 등급이 ' + high + '건(' + pct + '%)으로 ';
    if (pct >= 40) {
      opinion += '전체의 상당 비율을 차지하고 있어 즉각적인 대응이 필요합니다. ';
    } else {
      opinion += '관리 가능한 수준이나 지속적인 모니터링이 필요합니다. ';
    }

    opinion += '현재 미처리 건수는 ' + unprocessed + '건으로, ';
    if (unprocessed > total * 0.4) {
      opinion += '처리율이 낮아 보수 역량 강화 및 우선순위 기반 처리 방식 도입을 권고드립니다.';
    } else {
      opinion += '적절한 수준의 처리가 이루어지고 있으나 지속적인 이행이 필요합니다.';
    }

    opinion += '\n\n';
    opinion += '[권고사항] 1) 고위험 등급 포트홀 및 공동의심 구간 우선 보수 ';
    opinion += '2) AI 카메라 탐지 기반 정기 순찰 체계 강화 ';
    opinion += '3) 탐지 이력 데이터 누적을 통한 도로 노후화 구간 예측 관리';

    return opinion;
  }

  /* -------------------------------------------------------
     PDF 다운로드
  ------------------------------------------------------- */
  function downloadPDF(data) {
    var config = getReportConfig();
    var reportEl = document.getElementById('report-sheet');
    if (!reportEl) {
      if (window.NotifyUI) NotifyUI.error('보고서 영역을 찾을 수 없습니다.');
      return;
    }

    var btn = document.getElementById('pdf-download-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'PDF 생성 중...';
    }

    var today = new Date();
    var dateStr = today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    html2canvas(reportEl, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    }).then(function (canvas) {
      var imgData = canvas.toDataURL('image/jpeg', 0.9);
      var pdf = new jspdf.jsPDF('p', 'mm', 'a4');

      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      var imgW = pageW - 20;
      var imgH = (canvas.height * imgW) / canvas.width;

      var y = 10;
      var remaining = imgH;

      while (remaining > 0) {
        if (y < 10) {
          pdf.addPage();
          y = 10;
        }
        var portion = Math.min(remaining, pageH - 20);
        var srcY = (imgH - remaining) / imgH * canvas.height;
        var srcH = (portion / imgH) * canvas.height;

        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = srcH;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        var tempImg = tempCanvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(tempImg, 'JPEG', 10, y, imgW, portion);

        remaining -= portion;
        y = 10;

        if (remaining > 0) pdf.addPage();
      }

      var fileName = '남원시_도로안전_보고서_' + dateStr + '.pdf';
      pdf.save(fileName);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> PDF 다운로드';
      }
    }).catch(function (err) {
      console.error('PDF 생성 오류:', err);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'PDF 다운로드';
      }
      if (window.NotifyUI) NotifyUI.error('PDF 생성 중 오류가 발생했습니다.');
    });
  }

  /* -------------------------------------------------------
     퍼블릭 API
  ------------------------------------------------------- */
  return {
    getReportConfig: getReportConfig,
    generateOpinion: generateOpinion,
    downloadPDF: downloadPDF
  };
})();
