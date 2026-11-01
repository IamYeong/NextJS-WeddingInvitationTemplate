# 티라니 — 모바일 청첩장 플랫폼

로컬에서 템플릿 선택, 이메일/비밀번호 로그인, 편집, 모의 결제, 발행, 링크 공유 및 방명록을 살펴보는 초기 데모입니다. 실제 결제, 소셜 로그인, 이메일 인증/발송, PostgreSQL 저장소, S3 및 Supabase 연결은 **아직 구현되지 않았습니다**. 현재 저장소와 모의 결제는 개발 환경 전용이며 운영 모드에서 API가 비활성화됩니다. 실제 개인정보나 결제 정보를 입력하지 마세요.

## 실행

Node.js 20 이상에서 `npm install` 후 `npm run dev`를 실행하고 http://localhost:3000 을 엽니다. 이 작업 환경에서는 기존 프로젝트의 node_modules를 임시로 복사했습니다. 다른 환경에서는 npm install이 필요합니다. 데이터는 `.tirani/local.json`, 업로드는 `public/uploads`에 저장됩니다. 세션은 서버 프로세스가 종료되면 사라집니다.

관리자: becauseiloveu@gmail.com 또는 jinyeongiam@gmail.com. 초기 비밀번호는 요청된 임시 비밀번호입니다. 초기 계정은 로컬 데모에만 존재하며 scrypt 단방향 해시로 저장됩니다. 프로덕션을 위해 재사용하지 마세요.

1. 로그인 후 템플릿을 선택해 청첩장을 생성합니다.
2. 이름, 예식 일시, 장소를 입력하고 저장합니다. 사진을 추가할 수 있습니다.
3. 모의 결제 후 발행하고 표시된 링크를 복사합니다. 발행된 링크에서 방명록을 남길 수 있습니다.
4. 관리자 화면에서 HTML/CSS 템플릿, 이메일 템플릿, 회원, 모의 결제 및 부분 환불 이력을 확인합니다.

HTML 템플릿은 격리 iframe에서 표시하며 `{{partner1}}`, `{{partner2}}`, `{{title}}`, `{{eventDate}}`, `{{venue}}`, `{{address}}`, `{{greeting}}`, `{{account}}`를 지원합니다. 현재 HTML 템플릿의 사진 슬롯은 미구현입니다. 발행 전 청첩장 생성 시 템플릿 정의를 스냅샷으로 고정합니다.

## PostgreSQL과 환경 분리

`docker compose up -d`는 로컬 PostgreSQL 16과 `tirani_develop`, `tirani_main` 데이터베이스를 생성합니다. `.env.example`을 참고하여 연결을 구성할 수 있지만 **현 런타임은 Prisma/PostgreSQL에 연결되지 않습니다**. Prisma 패키지 설치 후 `npm run db:generate`, `npm run db:migrate`를 이용할 수 있습니다. main과 develop은 별도 DB 또는 Supabase의 실제 프로젝트/브랜치와 별도 자격 증명을 사용해야 합니다. Supabase 프로젝트 생성, 브랜치 생성, 실제 마이그레이션 적용은 아직 수행되지 않았습니다.

## 구현 경계

- `domain/platform`: 엔티티, 저장소 인터페이스, 유스케이스
- `data/local`, `data/storage`: 개발용 JSON 저장소와 사진 처리
- `presentation/platform/container.ts`: 의존성 조립
- `prisma/schema.prisma`: 사용자·템플릿 버전·청첩장·사진·주문·결제 이벤트·부분 환불·암호화 빌링키 필드를 포함한 초기 스키마. 실제 어댑터와 마이그레이션은 미구현.
- 관리자 HTML/CSS는 iframe sandbox에서 렌더링되며 기존 청첩장은 템플릿 수정 영향을 받지 않습니다.
- 실제 운영 전에는 DB 어댑터, 인증/이메일 검증, PG 검증 및 웹훅 멱등성, 빌링키 암호화와 키 관리, 저장소 및 이미지 접근 정책, 백업/삭제/접근 제어가 필요합니다.

## 추천과 알림 데모

추천 정책, 포인트 원장, 비회원 미리보기와 역할별 범위 및 한계는 [기능 명세와 검증 결과](artifacts/기능명세-및-검증결과.md)를 확인하세요. 기프티콘은 예약 상태만 기록하며 실제 발송과 예약 취소는 구현되지 않았습니다. Playwright 테스트는 `npm run test:e2e`로 실행하고 캡처를 `artifacts/screenshots/`에 저장합니다.

추천 포인트로 신청한 미연동 기프티콘은 신청자가 취소할 수 있으며 예약 포인트가 한 번 반환됩니다. 현금 결제액이 0원인 전액 포인트 구매의 모의 환불도 사용 포인트를 반환합니다.
