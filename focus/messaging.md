---
title: 메시징/비동기
outline: [2,3]
prev: /focus/auth
next: /focus/performance
---

# 메시징/비동기 (Kafka · 재시도 · DLT · Idempotency)

> **목표**: 동기 API의 병목을 제거하고, **신뢰 가능한 비동기 파이프라인**을 설계/구현하여 알림·이벤트 처리 지연/실패를 최소화.

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