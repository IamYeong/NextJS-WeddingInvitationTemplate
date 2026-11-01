# 외부 연동 경계

`domain/integrations/repository/ServiceAdapters.ts`는 기프티콘, 분석, 고객상담 어댑터 인터페이스입니다. 카카오 비즈·Tremendous 발송, Mixpanel, 채널톡 SDK, 네트워크 요청과 인증은 아직 구현되지 않았습니다. 공급사 계약과 정책, 인증정보가 준비된 뒤 어댑터, 웹훅 멱등성, 실패 복구, 수신자 정보 및 동의 처리를 구현해야 합니다. 로컬 기프티콘 신청은 포인트 예약과 PENDING_CONFIGURATION 기록만 남깁니다.
