---
title: 인증/인가
outline: [2,3]
tags: [spring-boot, saml, jwt, redis, security, shedlock, gateway]
---

# 인증/인가 (SAML SSO · JWT · RBAC)
> **요약:**  
> 복수의 SaaS 및 내부 서비스 간 인증 체계를 통합하기 위해  
> **SAML SSO 인증 서버와 JWT 기반 세션 인증 구조**를 각 프로젝트에 맞게 직접 설계·구현.  
> 사용자 세션 안정성, 토큰 보안성, 로그 추적 체계를 개선함.
> 
## 🧩 프로젝트 별 인증 구조 요약

| 구분                     | 적용 프로젝트                                                           | 인증 방식 | 역할 / 기여                                   |
|------------------------|-------------------------------------------------------------------|------------|-------------------------------------------|
| **SAML SSO**           | [그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)](/projects/group-genai) | SAML 2.0 (SP ↔ IdP 연동) | 인증 서버 설계·구현, RelayState 분기, 출처 쿠키 추적      |
| **Custom OAuth 유사 구조** | [Gateway & Framework](/projects/gateway)                          |  Spring Boot, MySQL, Custom Token 발급/검증 모듈 | 인증 구조 이해 및 API 연동                         |
| **SSO 기반 JWT 위임 인증 구조** | [AI 검색 시스템 RAG Demo 구축](/projects/rag-demo)                       |  Spring Boot, JWT Decoder, SSO Token 검증 | 외부 SSO 서버에서 발급한 JWT 토큰을 검증해 접근 제어 (리소스서버) |
| **JWT+RBAC**           | 그 외 프로젝트                                                          | JWT + Redis 세션 캐시 | 사용자 인증/토큰 발급/만료 관리, Role 기반 접근 제어         |

> 💡 Custom Oauth
> - 토큰 포맷, 만료 정책, 인증 플로우를 비즈니스 로직에 맞게 조정 가능
> - 내부 시스템에서 완전한 제어
> - 사내 보안 규칙에 맞춰 커스터마이징
> - 내부 시스템 최적화, 불필요한 복잡성 제거

## 1. SAML SSO 인증 구조 (직접 개발) 🔒
> **요약**: 그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)에서 **SAML SSO + 다중 로그인 플로우**를 설계/구현. SP/IdP 전환 가능 구조, RelayState 분기, 보안/신뢰성 개선.

**관련 프로젝트** : [그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트) (SAML SSO)](/projects/group-genai)


### 문제 상황
- 사내·외부 SaaS 혼재, 로그인 흐름이 여러 개 → 단일 인증 허브 필요
- 최초 진입 경로에 따른 **리다이렉트 분기/포맷(SAMLResponse/RelayState)** 제어 필요

### 설계
- **흐름**
  1. 클라이언트 → 인증 서버(Entry)
  2. RelayState에 원복 경로/출처 포함
  3. IdP 인증 후 SAMLResponse + RelayState 반환
  4. 응답 포맷 가공 후 원 서비스로 리다이렉트

- **핵심 구성 요소**
  - Spring Boot 3.x
  - OpenSAML (`org.opensaml:saml-impl`)
  - Redis 
  - Cookie 기반 출처 추적 로직
  - Log4j2 + MDC 기반 요청 단위 트레이싱

💡 *Spring Security의 SAML 확장 대신 OpenSAML을 사용한 이유*
> Spring Security SAML은 RelayState·서명 검증 로직 커스터마이징이 어려움.  
> 진입점 별 다른 로그인 방식 처리.

### 역할 & 기여
- 인증 서버 설계 (SP/IdP 스위치)
- OpenSAML 기반 SAMLRequest / SAMLResponse 검증 로직 구현
- RelayState 기반 경로 분기 및 Cookie 추적 로직 설계
- IdP ↔ SP 간 상호 인증 포맷 표준화 (XML 서명 검증 포함)
- 로깅/트레이싱(MDC)로 원인 추적 강화


💡 **예시 코드 (실제 X)**
```java
// 예시: RelayState 파싱/검증 (의사코드)
String relay = request.getParameter("RelayState");
RelayInfo info = relayCodec.decodeAndVerify(relay);  // 서명 검증 포함
return redirect(info.returnUrl());
```

>✅ 성과
> - 다중 SaaS의 로그인 흐름을 하나의 SSO 허브로 통합
> - 보안 인증/서명 검증 로직을 직접 구현하여 안정성과 확장성 확보


## 2. JWT 기반 세션 인증 구조 🔑
> MSA 환경 내 서비스 간 통신 및 사용자 접근 제어를 위해 JWT 기반 인증 구조

- **핵심 구성 요소**
  - Spring Boot
  - Spring Security 
  - JWT (io.jsonwebtoken:jjwt)
  - Redis (세션 캐시 및 Refresh Token 관리)

### 구현 요약

- 로그인 성공 시 Access/Refresh Token 생성 후 Redis 캐싱
- 만료 시 TTL 기반 자동 삭제 → 재인증 유도
- Access Token은 단기, Refresh Token은 장기 유효기간 설정
- JWT Filter로 모든 요청의 Authorization 헤더 검증 수행

💡 Redis 캐시의 역할
> TTL 기반 세션 만료 제어, 동시 로그인 방지, 강제 로그아웃 실시간 반영

### 구조 요약
```text
[Client] → [Auth API (JWT 발급)] → [Redis 세션 캐시] 
        → [Service API 인증 필터] → [토큰 검증 후 응답]
```

### 효과
- 서버 무상태(Stateless) 인증 구조 확보
- Redis TTL 관리로 세션 만료 제어 및 실시간 강제 로그아웃 지원
- Access / Refresh Token 분리로 재인증 부담 최소화

## 3. SSO 기반 JWT 인증 구조 (RAG Demo) 🔄

- 외부 SSO 서버에서 발급한 JWT를 검증하는 Resource Server 역할 수행


### 구조 요약

- 외부 SSO 서버 → Access Token 발급
- 중계 서버(Spring Boot)는 JWT 검증 후, 사용자 확인



✅ 성과
> 외부 인증 시스템과 안정적 연동 
> 자체 인증 로직 없이 JWT Signature 검증만 수행 → 단일 책임 원칙 준수


## 4. 로깅/추적 강화 (공통) 📊
- Log4j2 + MDC(traceId, IP, app) 기반 요청 단위 트레이싱
- 인증 흐름별 로그를 DB Appender로 저장해 장애 원인 추적 강화


---
🧾 정리
- SAML SSO: 복잡한 외부 SaaS 인증 통합
- JWT 세션 인증: MSA 환경 내 토큰 기반 인증 구조 구축
- Redis 캐시, MDC 로그, Role 기반 접근 제어로 안정성 확보