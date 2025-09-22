---
title: Bard — Gateway 정책 서버
tags: [spring-boot, gateway, policy, cache, jmeter, k8s, monitoring]
period: 2022-07 ~ 2023-01
role: 백엔드 전담
team: 8
---

# Bard — Gateway 정책 서버

## 1) 개요
SaaS 플랫폼의 진입점인 **Gateway 정책 서버** 개발.  
화이트/블랙 IP, 라우팅 정책, 변경 시 **Refresh/캐시 관리**. Eureka(Service Registry)와 연동.

## 2) 아키텍처
```mermaid
flowchart LR
Client --> GW[API Gateway]
GW --> BMS[Bard Management(Policy)]
BMS --> Redis[(Cache)]
BMS --> Eureka[Service Registry]
GW --> SVC[Internal Services]
```

## 3) 핵심 구현

정책 도메인 설계(라우팅, White/Black IP)
정책 변경 시 Refresh/캐시 무효화 플로우
Spring Boot Actuator 지표/헬스체크

## 4) 성능/테스트

JMeter로 시나리오 작성·공유, 팀 내 표준화
TODO: 지표 캡처(TPS/P95 등) 첨부

## 5) 모니터링 환경

Scouter + Telegraf로 APM(응답시간/SQL/GC/에러율) + DB 지표 수집

실시간 트레이스 기반 병목 분석 체계 구축

## 6) 운영

Kafka/Metering 필터 수정, STG/PRD 정기 배포(Jenkins, K8s)