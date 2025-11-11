---
title: 데이터/메시징 계층 설계
outline: [2,3]
tags: [kafka, redis, jpa, mybatis, shedlock, cache, dlt]
prev: /focus/auth
next: /focus/performance
---

# 데이터/메시징 계층 설계 (Kafka · Redis · JPA/MyBatis)

> **목표:**  
> 데이터 접근, 캐싱, 비동기 메시징 전 구간에서의 **안정성과 성능 최적화**를 달성하는 것.  
> Kafka·Redis·DB 간 데이터 흐름을 통합 설계하여 **지연·중복·부하** 문제를 해소하고,  
> 서비스 간 상태 동기화가 보장되는 **신뢰성 높은 데이터 파이프라인**을 구축함.
---

## 🧰 기술 스택

| 영역 | 기술 | 주요 역할 |
|------|------|-----------|
| **데이터 접근** | JPA / MyBatis | ORM 및 SQL 기반 데이터 관리 |
| **캐시 계층** | Redis | 사용자 세션·토큰·조회결과 캐싱, 분산락(ShedLock) |
| **메시징 브로커** | Kafka | 비동기 이벤트 전송 및 외부 시스템 연계 |
| **중복 실행 방지** | Redis + ShedLock | 배치·재시도 중복 차단 및 락 관리 |
| **비동기 처리** | CompletableFuture | 병렬 작업 처리 및 응답 지연 최소화 |
| **로깅/트레이싱** | Log4j2 + MDC | traceId 기반 호출 단위 로그 추적 |



## 1️⃣ 데이터 접근 계층 (JPA / MyBatis)

> 프로젝트 특성에 따라 ORM 기반의 **JPA**와 SQL 중심의 **MyBatis**를 병행 사용하여  
> 도메인 중심 설계와 성능 최적화를 모두 고려한 데이터 접근 구조를 구축.

| 구분                   | 기술 | 적용 사례 |
|----------------------|------|-----------|
| **그룹 생성형 AI 통합 플랫폼** | MyBatis | 복잡한 쿼리 및 조인 중심의 SQL 튜닝 최적화 |
| **기타 SaaS/포털 서비스**   | JPA | 도메인 주도 설계 기반의 ORM 매핑 및 트랜잭션 관리 |

- **공통 전략**
    - 공용 `BaseEntity`를 통한 `created/updated` 메타 필드 일관성 유지
    - DB 부하 구간에 캐시 레이어 삽입 (Redis 활용)
    - 비즈니스 로직에서 데이터 접근 책임 분리 (Repository 계층 분리)


## 2️⃣ 캐시 계층 및 분산락 (Redis + ShedLock)

> Redis를 인증·조회 캐시뿐 아니라 **락 제어·임시 세션 저장소**로도 활용해  
> 안정적인 분산 환경에서의 Job 충돌과 중복 실행을 차단.

### 주요 활용
- **사용자 인증 캐시**
    - 로그인 시 토큰 및 사용자 정보를 Redis에 저장
    - 유효 토큰을 가진 사용자는 **DB 접근 없이 캐시에서 즉시 응답**
    - 인증 서버 부하 감소
- **분산 락 관리 (ShedLock)**
    - Redis를 락 저장소로 활용하여 **Batch Job의 중복 실행 차단**
    - TTL 기반 락 자동 해제 정책 적용

```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "reSendTask", lockAtLeastFor = "PT10S")
public void reSendFailedNotifications() {
        List<Notification> failed = repository.findFailed();
        failed.forEach(it -> CompletableFuture.runAsync(() -> send(it)));
        }
```

## 3️⃣ 비동기 메시징 처리 (Kafka 기반)

> 외부 솔루션 통신 및 내부 이벤트 처리를 비동기로 전환하여
> 동기 API 호출의 병목을 제거하고 서비스 간 결합도를 낮춤.

## 아키텍처 개요
```text
[Producer(API)] --(topic: sample.v1)--> [Kafka] --> [Consumer Group: sampler]
                                        \--> [DLT: sample.v1.dlt]
```
- DLT 구조: 장애 시 메시지를 격리하고 재처리 가능
- 파티션 전략: 수신자 ID 기반 해싱 → 순서 보장 + 부하 분산
- Consumer 그룹 분리: 각 서비스 독립 구동 (격리 및 확장성 확보)

💡 **예시 코드 (실제 X)**
```java
@Configuration
public class KafkaConfig {
  @Bean
  ConcurrentKafkaListenerContainerFactory<String, SampleEvent> listener(
      ConsumerFactory<String, SampleEvent> cf) {
    var f = new ConcurrentKafkaListenerContainerFactory<String, SampleEvent>();
   
    //생략
      
    f.setCommonErrorHandler(new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(kafkaTemplate(),
          (r, e) -> new TopicPartition("sample.v1.dlt", r.partition())),
        new FixedBackOff(500L, 3)
    ));
    return f;
  }
}
```
```java
@Component
@RequiredArgsConstructor
public class SampleConsumer {

  private final RedisTemplate<String, String> redis;

  @KafkaListener(topics = "sample.v1", groupId = "sample", containerFactory = "listener")
  public void onMessage(SampleEvent ev, Acknowledgment ack) {
   
  }
}
```


## 관련 프로젝트
- [그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트) (SAML SSO)](/projects/group-genai)