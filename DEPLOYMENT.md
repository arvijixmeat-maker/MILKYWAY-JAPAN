# 안전한 배포 및 테스트 가이드 (Safe Deployment & Testing Guide)

사용자가 늘어났을 때, 서비스 중단 없이 안전하게 업데이트를 하기 위한 표준 작업 절차입니다.

## 1. 핵심 원칙
*   **Main 브랜치는 언제나 '정상 작동' 상태여야 합니다.**
*   모든 새로운 기능이나 수정 사항은 **별도의 '가지(Branch)'**에서 작업합니다.
*   별도의 가지에서 충분히 테스트한 뒤, 합격점을 받으면 Main으로 합칩니다(Merge).

## 2. 권장 워크플로우 (작업 순서)

### 1단계: 작업용 브랜치 만들기
`main` 브랜치에 직접 코드를 쓰지 않고, 작업 목적에 맞는 브랜치를 새로 팝니다.
```bash
# 최신 main 상태에서 시작
git checkout main
git pull origin main

# 새로운 작업 브랜치 생성 및 이동 (예: 새 피쳐, 버그수정)
git checkout -b feature/change-font
```

### 2단계: 작업 및 로컬 테스트
평소처럼 코드를 수정하고, `npm run dev` (localhost)로 확인합니다.
```bash
# 작업 후 저장
git add .
git commit -m "style: 폰트 변경"
```

### 3단계: 브랜치 푸시 (Push Branch)
`main`이 아닌 작업 브랜치를 깃허브에 올립니다.
```bash
git push origin feature/change-font
```
> **💡 중요:** 이렇게 하면 **실제 서비스(Main)**에는 아직 아무런 영향이 없습니다.

### 4단계: 미리보기(Preview) 및 검토
*   **Github 웹사이트**에 접속하면 "Compare & pull request" 버튼이 뜹니다.
*   **Cloudflare Pages**를 연동했다면, PR 생성 시 **'임시 미리보기 주소(Preview URL)'**가 자동으로 댓글로 달립니다.
*   이 주소는 실제 유저들은 모르는 비밀 주소입니다. 여기서 모바일/PC 등 다양한 환경에서 테스트를 진행합니다.

### 5단계: 병합 (Merge)
테스트 결과 문제가 없다면, Github에서 **"Merge Pull Request"** 버튼을 누릅니다.
*   이때 작업 브랜치의 내용이 `main`으로 합쳐집니다.
*   Cloudflare Pages가 변경된 `main`을 감지하고 **실제 운영 서버(Production)**에 배포합니다.

---

## 3. 요약
| 단계 | 위치 | 설명 | 안전도 |
| :--- | :--- | :--- | :--- |
| 1 | **Localhost** | 내 컴퓨터에서 개발 | 🟢 안전 (나만 봄) |
| 2 | **Feature Branch** | 깃허브의 별도 가지 | 🟢 안전 (운영 반영 X) |
| 3 | **Preview URL** | 테스트용 임시 주소 | 🟢 안전 (테스트용) |
| 4 | **Main Branch** | 실제 운영 서버 | 🔴 **주의** (모든 유저에게 반영됨) |

## ✅ 당장 실천할 수 있는 방법
지금 당장 복잡한 PR(Pull Request) 과정이 귀찮다면, 최소한 **개발용 브랜치(dev)** 하나만이라도 만들어서 사용하는 것을 추천합니다.

1. `dev` 브랜치에서 작업하고 푸시합니다.
2. `dev` 버전 사이트에서 확인합니다.
3. 확실하면 `main`으로 합칩니다.
