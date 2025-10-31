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

## 2) 주요 구현
- **Spring Boot + Eureka 기반 정책 서버 설계**
    - 라우팅, 화이트/블랙리스트 등 정책 변경 시 Actuator Refresh를 활용해 무중단 반영
    - Eureka Service Registry를 이용한 Gateway 서비스 자동 등록 및 갱신 처리
- **캐시 일관성 관리**
    - 정책 변경 시 캐시 TTL 및 Key 무효화 로직 추가로 데이터 불일치 최소화

💡 예제 코드
- Eureka 활용 Refresh
```java
public void refreshAllGateways() {
        List<ServiceInstance> instances = discoveryClient.getInstances("bard-gateway");

        if (instances.isEmpty()) {
            log.warn("No gateway instances found in Eureka");
            return;
        }

        for (ServiceInstance instance : instances) {
            String url = instance.getUri().toString() + "/actuator/refresh";
            try {
                // 생략
            } catch (Exception e) {
                log.errorFailed to refresh {}: {}", url, e.getMessage());
            }
        }
```
- 캐시 일관성 관리
```java
    @EvictAgent
    @CacheEvict(value= CacheKey.WHITE_IP,  keyGenerator = "SampleGenerator", cacheManager = "redisSampleCacheManager")
    public String createWhiteIp(Long id, String userId, List<String> ips) {
        log.info("White Ip policies refreshed");
        }
```


## 3) 성능 테스트 자동화 (JMeter 도입)
- Gateway 성능 검증이 체계화되어 있지 않아, 직접 **JMeter 기반 시나리오**를 작성하여 도입
- 라우팅, 요청 제한, IP 필터링 등 기능별 부하 테스트 작성
- **TPS / 응답 시간 / 처리량 기준**을 명확히 설정하고 병목 구간 시각화
- 테스트 결과를 문서화 및 시연하여 **팀 내 표준 프로세스로 전파**


## 4) 통합 모니터링 (Scouter + Telegraf)

Spring Boot Actuator 지표를 Scouter Agent에 연결하여 API별 응답 시간, SQL 실행, GC, 에러율 등 실시간 추적
Telegraf MySQL Plugin을 활용하여 DB 처리량·커넥션·캐시 적중률 등 DPM 레벨 지표 수집
장애 시 원인 추적 → Scouter Trace ID를 기반으로 트랜잭션 단위 성능 병목 파악


## 5) 운영

Kafka/Metering 필터 수정, STG/PRD 정기 배포(Jenkins, K8s)