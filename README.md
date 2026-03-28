# 한화 스코어 알림 - Chrome Extension

KBO 한화 이글스 경기 실시간 스코어를 크롬 뱃지로 알려주는 확장 프로그램.

코딩하면서, 일하면서 탭 안 열고도 한화 경기 상황을 한눈에.

## Features

- **실시간 뱃지 스코어**: 경기 중 1분마다 갱신, 한화 점수 항상 왼쪽
- **스마트 뱃지 색상**: 이기거나 동점이면 한화 주황(`#F37321`), 지면 회색
- **데스크탑 알림**: 득점, 실점, 경기 시작(30분 전), 경기 종료
- **팝업 스코어보드**: 이닝별 점수, 선발 투수, 날씨, 중계 채널
- **알림 설정**: 득점/실점/시작/종료 알림 개별 ON/OFF

## Screenshots

|         뱃지         |       팝업        |   설정    |
| :------------------: | :---------------: | :-------: |
| 이기는 중: 주황 뱃지 | 이닝별 스코어보드 | 알림 토글 |

## Install

1. 이 레포를 클론합니다
   ```bash
   git clone https://github.com/jellpd/hanwha-score.git
   ```
2. Chrome에서 `chrome://extensions` 열기
3. 우측 상단 **개발자 모드** 활성화
4. **압축해제된 확장 프로그램을 로드합니다** 클릭
5. 클론한 `hanwha-score` 폴더 선택

빌드 과정 없이 바로 사용 가능합니다.

## How It Works

```
Service Worker (background.js)
  ├── chrome.alarms (1분/10분 주기)
  ├── api.js          → Naver Sports API 호출
  ├── badge.js        → 뱃지 스코어/색상 업데이트
  ├── notifications.js → 데스크탑 알림
  └── storage.js      → 설정 + 상태 저장
```

### Polling Strategy

| 상태                 | 주기       | 동작               |
| -------------------- | ---------- | ------------------ |
| 새벽 (00:00~11:00)   | 폴링 안 함 | 뱃지 비움          |
| 경기 전 (11:00~시작) | 10분\*     | 경기 목록만 확인   |
| 경기 중 (`PLAYING`)  | 1분        | 스코어 갱신 + 알림 |
| 경기 후 (`RESULT`)   | -          | 최종 스코어 유지   |

\*`chrome.alarms` 최소 주기가 1분이므로, 경기 전에도 1분 주기로 동작하되 경기 목록 API만 호출합니다.

### Data Source

[Naver Sports API](https://api-gw.sports.naver.com) (비공식, 인증 불필요)

## Tech Stack

- **Chrome Extension Manifest V3**
- **Pure JavaScript** (ES Modules) — 프레임워크/빌드 도구 없음
- **Chrome APIs**: `chrome.alarms`, `chrome.notifications`, `chrome.storage`, `chrome.action`

## Notification Settings

| 설정           | 기본값 | 설명                  |
| -------------- | ------ | --------------------- |
| 알림 ON/OFF    | ON     | 전체 알림 마스터 토글 |
| 득점 알림      | ON     | 한화 득점 시          |
| 실점 알림      | OFF    | 한화 실점 시          |
| 경기 시작 알림 | ON     | 30분 전               |
| 경기 종료 알림 | ON     | 승/패 결과            |

## License

MIT
