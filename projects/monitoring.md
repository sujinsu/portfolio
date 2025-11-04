---
title: 통합 모니터링 PoC (Polestar & vROps)
tags: [monitoring, rest-api, vmware, polestar, vrops, aws, cloudwatch]
period: 2023-09 ~ 2023-10
role: 백엔드 전담 (연구/PoC)
team: 4
---

# 통합 모니터링 PoC (Polestar & vROps)

| 프로젝트명 | 통합 모니터링 PoC (Polestar & vROps)                               |
| -------- |--------------------------------------------------------------|
| 목표 | 다중 모니터링 플랫폼의 REST 기반 통합 구조 연구                                |
| 주요 기술 | Spring Boot, AWS SDK, vROps API, Polestar REST, CloudWatch   |
| 성과 | 각 플랫폼의 메트릭 구조 분석 및 통합 API 설계 방향 도출, 향후 통합 모니터링 시스템의 기반 문서 마련 |

## 1) 프로젝트 개요
> 클라우드·서버·DB 등 이기종 자원의 메트릭을 하나의 대시보드로 통합하기 위한 연구 프로젝트로,  
> AWS CloudWatch, vROps, Polestar 등 주요 모니터링 솔루션 데이터 수집 구조와 REST 표준화 가능성을 검증했습니다.

## 2) 주요 연구 내용
- **AWS CloudWatch 메트릭 구조 및 API 스펙** 분석
    - Namespace, Metric, Dimension의 관계 및 GetMetricData / GetMetricStatistics 호출 구조 정리
    - CloudWatch Agent를 통한 OS 레벨 메트릭 확장 가능성 검토
- **Polestar·vROps API 스펙 및 응답 구조 파악**
    - 각 플랫폼의 알람, 메트릭 엔드포인트를 비교하고 공통 JSON 필드 구조 제안
- **REST 표준화 설계 방향 도출**
    - 통합 수집/전달 시 사용 가능한 요청 구조 예시, 파라미터 및 인증 방식 제안
    - 향후 시스템 확장 시 모듈형 연계가 가능한 설계 초안 작성


## 3) 기술 검토 예시
### ✅ CloudWatch 메트릭 수집 구조 설계
- AWS SDK for Java 2.x 기반으로 **EC2, RDS, Route53 등 주요 네임스페이스 메트릭을 조회 검증**
> 실제 수집이 아닌 **호출 구조의 유효성 검증 및 파라미터 매핑 연구** 수준으로 진행했습니다.


💡 **예시 코드 (실제 X)**
```java
GetMetricStatisticsRequest request = GetMetricStatisticsRequest.builder()
    .namespace("AWS/EC2")
    .metricName("CPUUtilization")
    .startTime(Instant.now().minus(Duration.ofMinutes(30)))
    .endTime(Instant.now())
    .period(300)
    .statistics("Average")
    .dimensions(Dimension.builder()
        .name("InstanceId")
        .value("i-0abcd1234ef567890")
        .build())
    .build();

GetMetricStatisticsResponse response = cloudWatchClient.getMetricStatistics(request);
response.datapoints().forEach(dp ->
    log.info("CPU: {}% @ {}", dp.average(), dp.timestamp())
);
```


## 4) 연구 결과 요약
| 구성 요소 | 설명 |
| ---------- | ---- |
| **SDK/API** | AWS SDK, vROps REST API, Polestar Outbound REST 연계 |
| **문서화** | 각 모니터링 툴별 API 매핑·요청 파라미터 정의서 작성 |


