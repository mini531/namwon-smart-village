/* 공용 정책 모달 — 개인정보처리방침 / 이용약관 / 이메일무단수집거부
 * 사용법: 링크에 data-policy="privacy|terms|email-reject" 를 걸고 이 스크립트를 로드하면 자동 바인딩됨.
 * 모달 DOM은 런타임에 body에 1회만 주입되고, 클릭 이벤트는 document에 위임되므로
 * 동적으로 주입되는 풋터 안의 링크에도 그대로 동작함.
 */
(function () {
  'use strict';

  if (window.__PolicyModalInit) return;
  window.__PolicyModalInit = true;

  var POLICY = {
    privacy: {
      title: '개인정보처리방침',
      html:
        '<div class="pc-intro">' +
          'LX한국국토정보공사(이하 \'시\')는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 본 처리방침을 수립·공개합니다. ' +
          '본 방침은 Land-XI Platform(이하 \'서비스\')에 적용됩니다.' +
        '</div>' +
        '<h3>제1조 개인정보의 수집 항목 및 수집 방법</h3>' +
        '<p>시는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>' +
        '<ul>' +
          '<li><strong>필수 항목:</strong> 성명, 소속 부서, 직위, 업무용 이메일, 연락처</li>' +
          '<li><strong>선택 항목:</strong> 마케팅 정보 수신 동의 여부(SMS / Email)</li>' +
          '<li><strong>자동 수집 항목:</strong> 접속 IP, 쿠키, 서비스 이용 기록, 접속 로그</li>' +
        '</ul>' +
        '<p>개인정보 수집은 회원가입 및 서비스 이용 과정에서 이용자가 직접 입력하거나, 서비스 이용 중 자동으로 생성됩니다.</p>' +
        '<h3>제2조 개인정보의 수집 및 이용 목적</h3>' +
        '<ul>' +
          '<li>회원 식별 및 본인 확인, 서비스 부정 이용 방지</li>' +
          '<li>AI 도로 안전관리 분석 업무 수행 및 결과 제공</li>' +
          '<li>공지사항·점검 안내 등 필수 운영 정보 전달</li>' +
          '<li>이용자의 동의에 기반한 마케팅 정보 전송(선택)</li>' +
        '</ul>' +
        '<h3>제3조 개인정보의 보유 및 이용 기간</h3>' +
        '<p>수집된 개인정보는 수집 목적 달성 시까지 보유하며, 관계 법령에 따라 다음과 같이 일정 기간 보관됩니다.</p>' +
        '<ul>' +
          '<li>회원 가입 정보: 회원 탈퇴 시까지</li>' +
          '<li>접속 로그·IP 정보: 3개월 (통신비밀보호법)</li>' +
          '<li>서비스 이용 기록: 1년 (전자상거래법)</li>' +
        '</ul>' +
        '<h3>제4조 개인정보의 제3자 제공</h3>' +
        '<p>시는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.</p>' +
        '<ul>' +
          '<li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>' +
          '<li>통계작성, 과학적 연구, 공익적 기록보존 등을 위하여 가명처리된 상태로 제공하는 경우</li>' +
        '</ul>' +
        '<h3>제5조 개인정보의 파기</h3>' +
        '<p>시는 개인정보 보유 기간의 경과 및 처리 목적 달성 등 개인정보가 불필요하게 되었을 때 지체없이 파기합니다. ' +
        '전자적 파일 형태의 정보는 복구가 불가능한 기술적 방법으로, 종이 문서는 분쇄하거나 소각 처리합니다.</p>' +
        '<h3>제6조 이용자의 권리와 행사 방법</h3>' +
        '<p>이용자는 개인정보의 열람, 정정·삭제, 처리 정지, 동의 철회 등 권리를 언제든지 행사할 수 있으며, ' +
        '이는 마이 페이지에서 직접 수행하거나 아래 개인정보 보호책임자에게 서면·전화·이메일로 요청할 수 있습니다.</p>' +
        '<h3>제7조 개인정보 보호책임자</h3>' +
        '<p>' +
          '<strong>개인정보 보호책임자:</strong> LX한국국토정보공사 도로관리과장<br>' +
          '<strong>연락처:</strong> 063-713-1218 (평일 09:00~18:00)<br>' +
          '<strong>이메일:</strong> privacy@namwon.go.kr' +
        '</p>' +
        '<h3>제8조 개정 이력</h3>' +
        '<p class="pc-muted">본 처리방침은 2026년 4월 1일부터 적용됩니다. 개정 시에는 개정 14일 전 공지사항을 통해 안내합니다.</p>'
    },
    terms: {
      title: '이용약관',
      html:
        '<div class="pc-intro">' +
          '본 약관은 LX한국국토정보공사가 운영하는 Land-XI Platform 이용에 관한 기본 사항을 정합니다. ' +
          '본 약관에 동의한 후 서비스를 이용하실 수 있으며, 회원가입 또는 로그인 시 약관에 동의한 것으로 간주됩니다.' +
        '</div>' +
        '<h3>제1조 (목적)</h3>' +
        '<p>본 약관은 Land-XI Platform 이용 조건 및 절차, 이용자와 운영자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>' +
        '<h3>제2조 (용어의 정의)</h3>' +
        '<ul>' +
          '<li><strong>"서비스"</strong>란 AI 기반 도로 안전관리를 위해 제공되는 Land-XI Platform의 모든 기능을 의미합니다.</li>' +
          '<li><strong>"이용자"</strong>란 본 약관에 따라 서비스를 이용하는 공무원 및 승인된 사용자를 말합니다.</li>' +
          '<li><strong>"AI 분석"</strong>이란 드론 정사영상 및 차량 카메라 영상에서 도로 결함을 자동 탐지하는 기능을 의미합니다.</li>' +
        '</ul>' +
        '<h3>제3조 (약관의 효력 및 변경)</h3>' +
        '<p>본 약관은 서비스 내 게시함으로써 효력이 발생하며, 필요한 경우 관계 법령을 위반하지 않는 범위 내에서 개정될 수 있습니다. ' +
        '개정 시 적용일 및 개정 사유를 명시하여 개정 14일 전부터 공지합니다.</p>' +
        '<h3>제4조 (서비스의 제공)</h3>' +
        '<ul>' +
          '<li>드론 정사영상 AI 추론 및 결과 관리</li>' +
          '<li>차량 카메라 영상 AI 추론 및 결과 관리</li>' +
          '<li>탐지 이력 조회, 처리 상태 관리, 보고서 생성</li>' +
          '<li>지도 기반 통합 현황 대시보드</li>' +
        '</ul>' +
        '<h3>제5조 (서비스 이용 제한)</h3>' +
        '<p>이용자가 다음 각 호에 해당하는 행위를 한 경우 서비스 이용이 제한될 수 있습니다.</p>' +
        '<ul>' +
          '<li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>' +
          '<li>서비스 운영을 방해하거나 시스템에 부당한 영향을 주는 행위</li>' +
          '<li>법령 또는 본 약관이 금지하는 행위</li>' +
        '</ul>' +
        '<h3>제6조 (이용자의 의무)</h3>' +
        '<p>이용자는 서비스 이용 시 관계 법령, 본 약관의 규정 및 공지 사항을 준수하여야 하며, 시의 업무에 방해가 되는 행위를 해서는 안 됩니다. ' +
        '특히 업무상 취득한 정보를 외부에 유출하지 않을 책임을 부담합니다.</p>' +
        '<h3>제7조 (면책 조항)</h3>' +
        '<p>시는 천재지변, 전쟁, 통신 장애 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다. ' +
        'AI 분석 결과는 참고용이며, 실제 조치는 현장 확인을 거쳐 수행되어야 합니다.</p>' +
        '<h3>제8조 (관할 법원)</h3>' +
        '<p>본 서비스 이용과 관련하여 발생한 분쟁에 대해 소송이 제기될 경우, 관할 법원은 민사소송법이 정하는 절차에 따릅니다.</p>' +
        '<p class="pc-muted pc-muted--footer">본 약관은 2026년 4월 1일부터 시행됩니다.</p>'
    },
    'email-reject': {
      title: '이메일무단수집거부',
      html:
        '<div class="pc-notice-box">' +
          '본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여 ' +
          '<strong>무단으로 수집되는 것을 거부</strong>하며, 이를 위반 시 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 의해 ' +
          '<strong>형사처벌</strong>됨을 유념하여 주시기 바랍니다.' +
        '</div>' +
        '<h3>관련 법령</h3>' +
        '<p><strong>정보통신망 이용촉진 및 정보보호 등에 관한 법률 제50조의2 (전자우편주소의 무단 수집행위 등 금지)</strong></p>' +
        '<ul>' +
          '<li>누구든지 전자우편주소의 수집을 거부하는 의사가 명시된 인터넷 홈페이지에서 자동으로 전자우편주소를 수집하는 프로그램이나 그 밖의 기술적 장치를 이용하여 전자우편주소를 수집하여서는 아니 된다.</li>' +
          '<li>누구든지 제1항을 위반하여 수집된 전자우편주소를 판매·유통하여서는 아니 된다.</li>' +
          '<li>누구든지 제1항 및 제2항에 따라 수집·판매·유통이 금지된 전자우편주소임을 알고 이를 정보 전송에 이용하여서는 아니 된다.</li>' +
        '</ul>' +
        '<h3>처벌 규정</h3>' +
        '<p>위 조항 위반 시 <strong>1천만 원 이하의 과태료</strong>가 부과되며, 악용 사례에 따라 형사처벌을 받을 수 있습니다.</p>' +
        '<p class="pc-muted pc-muted--footer">시행일: 2026년 4월 1일</p>'
    }
  };

  function ensureModal() {
    var modal = document.getElementById('policy-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-backdrop policy-modal';
    modal.id = 'policy-modal';
    modal.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-head">' +
          '<div class="title" id="policy-title"></div>' +
          '<button class="close-btn" id="policy-close" type="button">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="policy-content" id="policy-body"></div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<div class="mf-spacer"></div>' +
          '<button type="button" class="btn btn-primary" id="policy-ok">닫기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    return modal;
  }

  function openPolicy(key) {
    var p = POLICY[key];
    if (!p) return;
    var modal = ensureModal();
    modal.querySelector('#policy-title').textContent = p.title;
    modal.querySelector('#policy-body').innerHTML = p.html;
    modal.classList.add('show');
    var body = modal.querySelector('.modal-body');
    if (body) body.scrollTop = 0;
  }

  function closePolicy() {
    var modal = document.getElementById('policy-modal');
    if (modal) modal.classList.remove('show');
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-policy]');
    if (link) {
      e.preventDefault();
      openPolicy(link.dataset.policy);
      return;
    }
    var modal = document.getElementById('policy-modal');
    if (!modal || !modal.classList.contains('show')) return;
    if (e.target.closest('#policy-close') || e.target.closest('#policy-ok') || e.target === modal) {
      closePolicy();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = document.getElementById('policy-modal');
    if (modal && modal.classList.contains('show')) closePolicy();
  });

  window.PolicyModal = { open: openPolicy, close: closePolicy };
})();
