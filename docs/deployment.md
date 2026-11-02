# CI/CD 구성 및 연결 전제

PR이 main/develop을 대상으로 열리거나 두 브랜치에 push되면 빌드, Prisma 스키마 검증, 도메인 테스트 및 Playwright가 실행된다. 브라우저 캡처는 GitHub Actions 아티팩트에 저장된다. `main` push는 Vercel production, `develop` push는 Vercel preview 대상으로 배포하도록 구성했다. PR은 배포하지 않는다.

현재 앱은 로컬 JSON·모의 결제 전용이며 운영용 DB·인증·결제 어댑터 및 마이그레이션이 없으므로 배포 job은 기본 비활성화되어 있고, 활성화하더라도 `scripts/assert-deploy-ready.mjs`가 중단한다. 이는 현재 코드가 실제 동작하는 서비스라고 잘못 배포되는 것을 방지하기 위한 명시적 미완성 상태다. 준비가 완료되면 해당 보호 코드를 구현에 맞게 교체하고 리뷰한 뒤 활성화한다.

연결 시 GitHub `production`, `development` 환경을 각각 구성하고 각 환경별 `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`, `DATABASE_URL`, `DIRECT_URL`을 등록한다. 데이터베이스와 자격 증명은 환경별로 분리해야 한다. 저장소 변수 `TIRANI_DEPLOY_ENABLED`를 `true`로 설정하면 두 브랜치 push에서 배포 job이 실행된다. Vercel 프로젝트는 해당 환경 변수를 별도로 보유해야 한다. GitHub에서 스키마 마이그레이션을 실행할 때는 각 환경의 직접 연결을 사용하며, 애플리케이션의 런타임 연결 정보는 Vercel에 설정한다.

Vercel Git 자동 배포는 `vercel.json`에서 꺼 두어 GitHub Actions의 검증을 우회하는 중복 배포를 방지했다. develop의 preview URL을 고정 도메인으로 운영하려면 Vercel 프로젝트의 브랜치 도메인과 실제 Git 연동 설정을 별도로 확인해야 한다. 데이터베이스 백업·마이그레이션 롤백과 무중단 변경은 운영 전 별도로 마련한다.

현재 이 환경은 npm registry에 연결할 수 없어 lockfile이 없다. CI는 일단 `npm install`을 사용한다. 네트워크가 복구되면 신뢰 가능한 `package-lock.json`을 생성·커밋하고 `npm ci` 및 Node·CLI 버전 고정을 적용한다. CI 자체는 아직 GitHub에서 실행되지 않았다.
