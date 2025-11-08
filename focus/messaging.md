---
title: 분산처리/메시징 안정화
outline: [2,3]
tags: [kafka, redis, shedlock, completablefuture, log4j2, mdc]
prev: /focus/auth
next: /focus/performance
---

# 분산처리/메시징 안정화 (Kafka · Redis · ShedLock)

> **목표:**  
> 동기 API 처리의 병목과 중복 실행 문제를 해결하고,  
> **Kafka + Redis 기반의 안정적인 비동기 파이프라인**을 구축하여  
> 메시지 유실, 중복, 지연 문제를 최소화함.

---

## 🧰 기술 스택

| 영역 | 기술 | 주요 역할 |
|------|------|-----------|
| **메시징 브로커** | Kafka | 비동기 이벤트 전송, DLT·재시도 구조 |
| **중복 실행 방지** | Redis + ShedLock | 배치·알림 재처리 중복 차단, 락 관리 |
| **비동기 처리** | CompletableFuture | 병렬 알림 발송 및 응답 시간 단축 |
| **로깅/트레이싱** | Log4j2 + MDC | traceId 기반 요청 단위 로그 추적 |
| **운영 자동화** | Jenkins, Kubernetes | Consumer 배포 자동화 및 모니터링 |

---

## 1️⃣ 메시징 파이프라인 설계 (Kafka 기반)

> 알림·이벤트의 신뢰적 전달을 위해 **DLT(Dead Letter Topic)** 구조를 도입하고  
> 컨슈머 장애 시에도 재시도 → 격리 → 복구가 가능한 구조로 설계함.
## 아키텍처 개요
```text
[Producer(API)] --(topic: notify.v1)--> [Kafka] --> [Consumer Group: notifier]
                                        \--> [DLT: notify.v1.dlt]
```
- **토픽 분리**: `notify.v1`, `notify.v1.dlt`  
- **파티션 전략**: 수신자 ID 해싱 → 순서 보장 + 핫키 분산  
- **컨슈머 그룹**: 서비스별 그룹 분리(서로 영향 X)

## 핵심 구현


1. Consumer (메시지 소비 + 재시도/실패 분리)
```java
@Configuration
public class KafkaConfig {
  @Bean
  ConcurrentKafkaListenerContainerFactory<String, SampleEvent> listener(
      ConsumerFactory<String, SampleEvent> cf) {
    var f = new ConcurrentKafkaListenerContainerFactory<String, SampleEvent>();
   
    //생략
      
    f.setCommonErrorHandler(new DefaultErrorHandler(
        // 3회 재시도 후 DLT
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

  private final RedisTemplate<String, String> redis; // idempotency

  @KafkaListener(topics = "sample.v1", groupId = "sample", containerFactory = "listener")
  public void onMessage(NotifyEvent ev, Acknowledgment ack) {
       
    // 생략
  }
}
```

## 2️⃣ 중복 실행 방지 (Redis + ShedLock)

> 여러 인스턴스에서 동시에 실행될 수 있는 배치 작업의 중복 실행을 방지하기 위해
> Redis를 락 저장소로 사용하고, ShedLock을 통해 TTL 기반 락 해제 정책 적용.
```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "reSendTask", lockAtLeastFor = "PT10S")
public void reSendFailedNotifications() {
  List<Notification> failed = repository.findFailed();
  failed.forEach(it -> CompletableFuture.runAsync(() -> send(it)));
}
```
- Redis에 분산 락 저장
- 배치 재시도 간 충돌 방지 및 메시지 재발송 보장

## 3️⃣ 로그 트레이싱 및 운영 자동화

| 항목          | 구성                                |
|-------------|-----------------------------------|
| **로그 구조**   | Log4j2 + MDC(traceId, IP, UserId) |
| **운영 자동화**  | Jenkins, Docker, K8s 배포 파이프라인     |
| **모니터링**    | APM/DPM (Scouter+Telagraf)        |

## 관련 프로젝트
- [그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트) (SAML SSO)](/projects/group-genai)