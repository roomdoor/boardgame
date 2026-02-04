# 틱택토

로컬 AI 대전과 WebSocket 기반 온라인 PVP 모드를 지원하는 클래식 틱택토입니다.

## 주요 기능
- 로컬 AI 대전 (미니맥스)
- 방 코드 기반 온라인 PVP
- 반응형 UI 및 승리 라인 하이라이트

## 프로젝트 구조
- `index.html` - UI 레이아웃
- `styles.css` - 스타일
- `script.js` - 게임 로직 (로컬 + 온라인)
- `server/` - 온라인 모드용 WebSocket 서버

## 실행 방법

### 로컬 모드 (서버 불필요)
1. 브라우저에서 `index.html`을 엽니다.
2. "Local vs AI" 모드로 플레이합니다.

### 온라인 PVP 모드
1. WebSocket 서버를 실행합니다:

```bash
cd /Users/sihwa/IdeaProjects/boardgame/tic-tac-toe/server
npm install
node index.js
```

2. 두 개의 브라우저(또는 기기)에서 `http://<server-ip>:3000/`을 엽니다.
3. "Online PVP" 모드로 전환합니다.
4. 한쪽에서 방을 생성하고, 다른 쪽에서 방 코드로 입장합니다.

브라우저에서 `http://`로 열면 WebSocket 주소는 현재 접속한 호스트/포트를 자동으로 사용합니다.
`file://`로 열 때만 기본값 `ws://localhost:3000`을 사용합니다. 포트를 변경하려면:

```bash
PORT=4000 node index.js
```

## 참고
- 서버는 온라인 경기와 정적 파일 제공을 처리합니다. 로컬 플레이에는 Node.js가 필요하지 않습니다.
- 서버 포트를 변경하면 `http://<server-ip>:PORT/`로 접속하세요.
