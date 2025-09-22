---
title: 그룹 공동 생성형 AI 플랫폼
tags: [spring-boot, java17, redis, shedlock, kafka, saml, security, docker, k8s, jenkins]
period: 2024-03 ~ 2025-06
role: 백엔드 전담
---

# 그룹 공동 생성형 AI 플랫폼

## 1) 인증/흐름
- **SAML SSO** + RelayState 기반 경로 분기, GET/POST 요청 분리 처리
- **IDP/SP 전환 가능한 인증 서버** 설계(초기 출처를 쿠키로 식별, 응답 포맷 조정)

## 2) 비동기 알림
- Kafka 기반 **병렬 Consumer 구조** 설계 (rag-01~rag-09 토픽/리스너 분리)
- 실패 이력 저장 → 배치 재처리, **CompletableFuture 병렬 처리**
- **Redis + ShedLock** 으로 분산락(다중 인스턴스 충돌 방지)

## 3) 외부 SaaS 연동/로깅
- 과제/멤버 이벤트에 따라 외부 워크스페이스 API 연동(WebClient 커스텀)
- 로그 필터로 상태/헤더/바디 가공, **log4j2 + MDC(traceId/IP/App)** DB 저장

## 4) DevOps
- 환경변수 분리, 긴급 반영 유연성 확보

## 5) 성과
- TODO: 알림 처리량/지연 개선, 로그인 연계 프로세스 정립 등