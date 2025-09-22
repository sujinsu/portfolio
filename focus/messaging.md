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

### 1) Producer (Spring Kafka)
```java
@Service
@RequiredArgsConstructor
public class NotifyProducer {
  private final KafkaTemplate<String, NotifyEvent> kafka;

  public void publish(NotifyEvent ev) {
    String key = ev.userId(); // 파티셔닝 키
    kafka.send("notify.v1", key, ev)
         .whenComplete((res, ex) -> {
           if (ex != null) log.error("kafka_send_fail key={} ev={}", key, ev, ex);
         });
  }
}
```
2) Consumer (병렬 처리 + 재시도/실패 분리)
```java
@Configuration
public class KafkaConfig {
  @Bean
  ConcurrentKafkaListenerContainerFactory<String, NotifyEvent> listener(
      ConsumerFactory<String, NotifyEvent> cf) {
    var f = new ConcurrentKafkaListenerContainerFactory<String, NotifyEvent>();
    f.setConsumerFactory(cf);
    f.setConcurrency(6);                // 인스턴스 내 병렬
    f.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
    f.setCommonErrorHandler(new DefaultErrorHandler(
        // 3회 재시도 후 DLT
        new DeadLetterPublishingRecoverer(kafkaTemplate(),
          (r, e) -> new TopicPartition("notify.v1.dlt", r.partition())),
        new FixedBackOff(500L, 3)
    ));
    return f;
  }
}
```
```java
@Component
@RequiredArgsConstructor
public class NotifyConsumer {
  private final MailSender mail;
  private final RedisTemplate<String, String> redis; // idempotency

  @KafkaListener(topics = "notify.v1", groupId = "notifier", containerFactory = "listener")
  public void onMessage(NotifyEvent ev, Acknowledgment ack) {
    String dedupKey = "dedup:" + ev.eventId();
    Boolean first = redis.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofHours(6));
    if (Boolean.FALSE.equals(first)) {
      ack.acknowledge();                 // 이미 처리 → 중복 방지
      return;
    }

    try {
      mail.send(ev.to(), ev.subject(), ev.body());
      ack.acknowledge();
    } catch (TransientMailException e) {
      throw e;                           // DefaultErrorHandler → 재시도
    } catch (Exception fatal) {
      throw new RuntimeException(fatal); // DLT 로 이동
    }
  }
}
```