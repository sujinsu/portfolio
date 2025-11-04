---
title: 인증/인가
outline: [2,3]
---

# 인증/인가 (SAML SSO · JWT/RBAC)

> **요약**: 그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)에서 **SAML SSO + 다중 로그인 플로우**를 설계/구현. SP/IdP 전환 가능 구조, RelayState 분기, 보안/신뢰성 개선.

## 문제 상황
- 사내·외부 SaaS 혼재, 로그인 흐름이 여러 개 → 단일 인증 허브 필요
- 최초 진입 경로에 따른 **리다이렉트 분기/포맷(SAMLResponse/RelayState)** 제어 필요

## 역할 & 기여
- 인증 서버 설계 (SP/IdP 스위치)
- SAML 파싱/서명 검증 & 예외 처리
- Cookie 기반 최초 출처 식별/분기 로직
- 로깅/트레이싱(MDC)로 원인 추적 강화

## 설계
- **흐름**
    1. 클라이언트 → 인증 서버(Entry)
    2. RelayState에 원복 경로/출처 포함
    3. IdP 인증 후 SAMLResponse + RelayState 반환
    4. 응답 포맷 가공 후 원 서비스로 리다이렉트

- **구성 요소**
    - Spring Boot 3.x, Spring Security(SAML)
    - Redis(세션/토큰 캐시), ShedLock(동시성 제어), Jenkins/Helm 배포

## 코드/구성 스니펫
```java
// 예시: RelayState 파싱/검증 (의사코드)
String relay = request.getParameter("RelayState");
RelayInfo info = relayCodec.decodeAndVerify(relay);  // 서명 검증 포함
return redirect(info.returnUrl());
```

## 관련 프로젝트
- [그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트) (SAML SSO)](/projects/group-genai)