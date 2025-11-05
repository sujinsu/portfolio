---
title: Gateway & Framework 플랫폼
tags: [spring-boot, gateway, policy, cache, jmeter, k8s, monitoring]
period: 2022-07 ~ 2023-01
role: 백엔드 전담
team: 8
---

# Gateway & Framework 플랫폼

| 항목 | 내용                                                                               |
| ---- |----------------------------------------------------------------------------------|
| **프로젝트명** | Gateway & Framework 플랫폼 (가칭)                                                     |
| **기술 구성** | Java, Spring Boot, MySQL, JMeter, Eureka, Scouter, Telegraf, Jenkins, Kubernetes |
| **서버 구조** | MSA 환경 - Gateway / 인증 서버 / 정책 서버 / Kafka / Redis / DB로 구성                        |
| **주요 업무** | 정책 서버 백엔드 개발, 성능 테스트 표준화, 통합 모니터링 구성, CI/CD 자동화                                  | |
| **성과** | 부서 내 JMeter 테스트 표준화 매뉴얼 작성·배포, 모니터링 통합으로 운영 안정성 강화                               |

# 주요 업무
## 1) Gateway 정책 서버 개발

- **Spring Boot + Eureka 기반 정책 서버 설계**
  - 화이트/블랙 IP, 라우팅 등 Gateway 정책 관련 도메인 관리.
  - 정책 변경 시 Actuator Refresh를 활용해 무중단 반영
  - Eureka Service Registry를 이용한 Gateway 서비스 자동 등록 및 갱신 처리
- **캐시 일관성 관리**
  - 정책 변경 시 캐시 TTL 및 Key 무효화 로직 추가로 데이터 불일치 최소화


💡 **예시 코드 (실제 X)**
- Eureka 활용 Refresh
```java
class Sample {
  public void refreshAllGateways() {
    List<ServiceInstance> instances = discoveryClient.getInstances("gateway");

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

## 2) 성능 테스트 자동화 (JMeter 도입)
- Gateway 성능 검증이 체계화되어 있지 않아, 직접 **JMeter 기반 시나리오**를 작성하여 도입
  - 라우팅, 요청 제한, IP 필터링 등 기능별 다양한 시나리오 및 부하 테스트 시나리오 작성
- **TPS / 응답 시간 / 처리량 기준**을 명확히 설정하고 병목 구간 시각화
- 테스트 결과를 문서화 및 시연하여 **팀 내 표준 프로세스로 전파**

### 관련 링크
- [J-meter 확인하기](/focus/performance)

## 3) APM·DPM 통합 모니터링 구성
> APM, DPM 연구 및 적용 가능 방안 정리, 팀 내 공유 
>  - Scouter + Telegraf를 연동하여 API별 응답 시간, SQL 실행, GC, 에러율 등 실시간 추적
> -  Telegraf MySQL Plugin을 활용하여 DB 처리량·커넥션·캐시 적중률 등 DPM 레벨 지표 수집
>
> → 장애 시 원인 추적 용이.
> - Scouter Trace ID를 기반으로 트랜잭션 단위 성능 병목 파악 
> - 애플리케이션과 DB의 병목 지점을 조기에 탐지 가능


- **참고 연구 문서** : [Scouter + Telegraf 가이드](https://github.com/scouter-project/scouter/blob/master/scouter.document/main/Telegraf-Server.md)


## 5) 운영

Gateway 필터 수정, STG/PRD 정기 배포(Jenkins, K8s)