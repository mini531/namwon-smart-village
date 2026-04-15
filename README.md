# Namwon GeoVision Platform (남원 스마트시티 빌리지)

남원시 AI 기반 도로 안전관리 행정 서비스 플랫폼 프로토타입.
드론 정사영상 및 차량 카메라 영상을 AI로 분석하여 도로 결함·시설물 파손·불법 주정차 등 도로 이상 객체를 탐지하고, 지도와 보고서로 제공합니다.

## 주요 기능

- **대시보드** (`index.html`) — KPI, 최근 탐지 이력, AI 분석 모델 바로가기, 활동 로그, 처리 현황 요약
- **정사영상 AI 추론** (`analysis-orthophoto.html`) — 드론 촬영 정사영상 타일링 기반 YOLO 추론
- **카메라 AI 추론** (`analysis-camera.html`) — 차량 블랙박스 영상 프레임 기반 객체 탐지 및 GNSS 매핑
- **탐지 이력 관리** (`history.html`) — 전체 탐지 목록 조회, 필터링, 상세 보기, CSV 내보내기
- **지도 서비스** (`map-home.html`, `map-orthophoto.html`, `map-camera.html`) — Vworld 기반 탐지 결과 지도
- **보고서 생성** (`report.html`) — 기간·모델·지역별 보고서 생성 및 PDF 다운로드

## 디자인 시스템

- **브랜드 컬러**: 남원시 시그니처 레드 (`#C8102E`) — 액센트로 제한적으로 사용
- **기본 톤**: 뉴트럴 그레이 스케일 (`#212529` → `#F8F9FA`) 기반 미니멀 관리자 UI
- **폰트**: Inter + Noto Sans KR
- **헤더**: 다크 프로스티드 글라스 (`.gnb-header`), 우측 보조 메뉴는 아이콘 + 호버 툴팁 구조
- **메가 메뉴**: 드롭다운 8px 간격 호버 브릿지, 상단 2px 프라이머리 보더
- **뱃지**: 단일 중성 톤(`#F1F3F5` 배경 + 좌측 상태 도트)으로 통일

## 프로젝트 구조

```
namwon-smart-village/
├── index.html                    # 대시보드
├── analysis-orthophoto.html      # 정사영상 AI 추론
├── analysis-camera.html          # 카메라 AI 추론
├── history.html                  # 탐지 이력 관리
├── report.html                   # 보고서 생성
├── map-home.html                 # 지도 홈
├── map-orthophoto.html           # 정사영상 결과 지도
├── map-camera.html               # 카메라 결과 지도
├── include/
│   └── header.html               # 공통 GNB 헤더 (fetch 로드)
└── assets/
    ├── css/
    │   ├── style.css             # 공통 스타일 + 브랜드 변수
    │   └── menu.css              # 메가 메뉴 + 우측 보조 메뉴
    ├── js/
    │   ├── layout.js             # 헤더 로드 · 활성 메뉴 처리 · 날짜 헬퍼
    │   ├── detect.js             # AI 추론 시뮬레이션 (NamwonDetect)
    │   ├── map.js                # Vworld 지도 공통 모듈 (NamwonMap)
    │   ├── charts.js             # Chart.js 래퍼 (NamwonCharts)
    │   ├── report.js             # PDF 보고서 생성 (NamwonReport)
    │   └── menu.js               # 메뉴 인터랙션
    ├── data/
    │   └── sample-detections.json  # 샘플 탐지 데이터 (40건)
    └── images/
        ├── favicon_n.ico
        ├── logo_brand_white.png
        ├── logo_brand_white_small.png
        ├── model_orthophoto.jpg  # 정사영상 모델 썸네일 (생성 필요)
        └── model_camera.jpg      # 카메라 모델 썸네일 (생성 필요)
```

## 외부 라이브러리

- **OpenLayers 7.5.2** — Vworld 타일 지도
- **Chart.js 4.4.0** — 통계 차트
- **html2canvas 1.4.1** + **jsPDF 2.5.1** — 보고서 PDF 생성

## 로컬 실행

정적 파일만 사용하므로 간단한 HTTP 서버로 구동합니다.

```bash
cd namwon-smart-village
python3 -m http.server 8080
# → http://localhost:8080
```

## 샘플 데이터 구조

`assets/data/sample-detections.json` 는 40건의 도로 이상 객체 탐지 샘플을 포함합니다.

```json
{
  "id": "DET-001",
  "model_type": "orthophoto | camera",
  "class_en": "Pothole",
  "class_ko": "포트홀",
  "confidence": 0.92,
  "severity": "high | medium | low",
  "lat": 35.4158,
  "lng": 127.3905,
  "address": "전북 남원시 도통동 123",
  "detected_at": "2026-03-02T09:15:00",
  "status": "미처리 | 처리중 | 완료",
  "image_file": "DJI_0028.JPG",
  "bbox": [120, 80, 340, 220]
}
```

## 탐지 클래스

**정사영상 모델 (YOLOv8-Road-Ortho v2.1 · mAP 0.87)**
- 포트홀, 크랙, 보수흔적, 공동의심, 쓰레기

**카메라 모델 (YOLO-Road-Camera Lightweight v1.4 · mAP 0.83)**
- 중앙분리대파손, 시선유도봉파손, 보행안전시설파손, 교통표지판파손, 도로차선불량, 컬러맨홀, 불법주정차

## 썸네일 이미지 생성 프롬프트 (2종)

대시보드 `AI 분석 모델` 카드에 사용될 실사 썸네일 이미지 2장을 다른 생성형 AI에 요청할 수 있도록 프롬프트를 아래에 정리합니다. 생성 후 `assets/images/model_orthophoto.jpg`, `assets/images/model_camera.jpg` 경로로 저장하세요 (16:9, 약 800x450px 권장).

### 1. 정사영상 모델 썸네일 (`model_orthophoto.jpg`)

```
Photorealistic top-down aerial orthophoto of a rural Korean village road network,
captured by a mapping drone at 80m altitude. Clearly visible asphalt two-lane road
winding through mixed farmland and small residential rooftops, with dashed white
center lane markings, small potholes and faint cracks visible on the road surface.
Late morning soft daylight, clean vertical nadir view, no tilt, no vignetting.
Natural realistic colors, high detail, looks like a real GIS orthophoto tile
(not stylized). 16:9 aspect ratio, 800x450 px.
```

- 키워드: `orthophoto`, `aerial nadir view`, `mapping drone`, `Korean rural road`, `asphalt cracks`, `photorealistic GIS tile`
- 제외: 사람, 글자, 텍스트 오버레이, 과장된 색채, HUD, UI 요소

### 2. 카메라 모델 썸네일 (`model_camera.jpg`)

```
Photorealistic first-person dashcam view from a car driving on a two-lane Korean
suburban road on a clear day. Road lines visible ahead, low horizon, roadside
guardrails and delineator posts, a damaged traffic sign on the right shoulder,
and a faint pothole visible on the lane. Natural daylight, cinematic 35mm lens
perspective, slight windshield foreground blur, realistic dashcam color grading,
no text overlays, no UI elements, no brand logos. 16:9 aspect ratio, 800x450 px.
```

- 키워드: `dashcam POV`, `first-person driving view`, `Korean suburban road`, `guardrail`, `delineator post`, `damaged traffic sign`, `realistic color grade`
- 제외: 차량 내부 대시보드, 글자/UI, 만화풍 스타일, 사람 얼굴

## 라이선스

본 프로토타입은 내부 제안용으로 작성되었습니다. 외부 공개 시 별도 라이선스 고지 필요.
