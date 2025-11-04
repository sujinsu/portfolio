---
title: 그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)
tags: [spring-boot, java17, redis, shedlock, kafka, saml, security, docker, k8s, jenkins]
period: 2024-03 ~ 2025-06
role: 백엔드 전담
---

# 그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)
: > Event-driven MSA 구조에서 **Kafka가 중심 버스 역할**을 하고,  
> **Redis + WebClient가 외부 연동 안정화 레이어**로 작동하는 구조로 설계되었습니다.  

| 항목 | 내용                                                                                        |
| ---- |-------------------------------------------------------------------------------------------|
| **프로젝트명** | 그룹 생성형 AI 통합 플랫폼 (가칭, 외부 협업 프로젝트)                                                         |
| **기술 구성** | Java 17, Spring Boot 3.1, Redis, ShedLock, Kafka, Spring Security, Docker, Kubernetes, Jenkins |
| **서버 구조** | MSA / 사용자·관리자 프론트엔드, 인증 서버,사용자·관리자 백엔드, 배치 서버, Consumer 서버로 서비스 단위 분리 및 독립 배포 |
| **주요 업무** | SAML SSO 인증 서버 설계·구현, 외부 SaaS 연동, 비동기 알림 시스템 및 실패건 알림 배치 처리 개발                            |
| **보안/로깅** | Log4j2 DB Appender로 에러 레벨 로그 DB 저장, MDC(traceId/IP/UserId 등) 기반 요청 단위 추적 구조               |
| **성과** | 다중 인증 흐름 통합, 알림 장애 대응 효율성 향상                                                              |

## 1) 인증/흐름
- **SAML SSO + RelayState 기반 인증 서버** 설계
    - 각 SaaS 솔루션별 요청/응답 포맷이 상이해, `OpenSAML` 기반으로 XML 스키마 파싱 및 서명 검증 로직을 직접 구현
    - RelayState로 최초 진입 경로를 구분하고, 요청 타입(GET/POST)에 따라 SAMLResponse 포맷을 분기 처리
    - **IDP/SP 전환 가능한 구조**로 설계하여 외부 SaaS와 내부 포털 간 단일 인증 체계 구축
    - 쿠키 기반 출처 추적 로직으로 요청 출처 식별 및 리다이렉트 흐름 관리
- 다중 SaaS와 내부 포털 간의 인증 플로우를 통합해, 단일 로그인 허브 기능

### 💡 SAML 인증 시퀀스 다이어그램 (IDP Initiate)
```mermaid
sequenceDiagram
    participant User as 사용자
    participant SP as 서비스 제공자 (SP)
    participant IdP as 인증 제공자 (IdP)

    User->> 인증서버 : 인증 요청 (솔루션 - SAML Request 전달 / 포탈 - X)
    인증서버 : 최초 진입 경로 확인 및 SAML Request 파싱 및 필요 정보 추출 및 관리
    인증서버->>IdP: IDP 제공 로그인 페이지 리다이렉트
    User: 로그인
    IdP->> 인증서버: SAMLResponse 생성 및 전달
    인증서버 :  검증 및 사용자 조회, 진입점에 따른 별도 처리 (솔루션 - 필요 데이터로 구성한 SAML Response 생성 및 전달 / 포탈 - 화면 리다이렉트)
```

💡 **예시 코드 (실제 X)**

```java
Response samlResponse = openSamlDecoder.decode(encodedResponse);
String relayState = request.getParameter("RelayState");

if (relayState.contains("external")) {
    return ResponseEntity.status(HttpStatus.FOUND)
        .header(HttpHeaders.LOCATION, externalRedirectUrl)
        .build();
}
verifySignature(samlResponse.getSignature());
cookieService.saveOrigin(request);
```

💡 **SAML Request 샘플**
```xml
<samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        ID="_a12b34c56d78"
        Version="2.0"
        IssueInstant="2024-03-01T10:00:00Z"
        Destination="https://idp.company.com/sso"
        AssertionConsumerServiceURL="https://portal.company.com/saml/acs">
    <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        https://portal.company.com
    </saml:Issuer>
    <samlp:NameIDPolicy AllowCreate="true" Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"/>
</samlp:AuthnRequest>
```

💡 **SAML Response 샘플**
```xml
<samlp:Response
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        ID="_response123"
        Version="2.0"
        IssueInstant="2024-03-01T10:00:03Z"
        Destination="https://portal.company.com/saml/acs">
    <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
        https://idp.company.com
    </saml:Issuer>
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_assertion01">
        <saml:Subject>
            <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@company.com</saml:NameID>
        </saml:Subject>
        <saml:AttributeStatement>
            <saml:Attribute Name="role" Format="urn:oasis:names:tc:SAML:2.0:attrname-format:unspecified">
                <saml:AttributeValue>ADMIN</saml:AttributeValue>
            </saml:Attribute>
        </saml:AttributeStatement>
        <ds:Signature>...</ds:Signature>
    </saml:Assertion>
</samlp:Response>
```


## 2) 비동기 알림
- CompletableFuture를 통한 병렬 발송 처리로 응답 대기 시간 최소화 
- 실패 이력은 DB에 저장 후 배치 재처리하도록 설계 
- Redis + ShedLock 기반 분산 락 처리로 다중 인스턴스 환경에서도 중복 실행 방지

💡 **예시 코드 (실제 X)**
```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "reSendTask", lockAtLeastFor = "PT10S")
public void reSendFailedNotifications() {
    List<Notification> failed = repository.findFailed();
    failed.forEach(it -> CompletableFuture.runAsync(() -> send(it)));
}
```

## 3. Kafka 기반 메시지 처리
- 다수의 서비스 이벤트를 병렬 처리하기 위해 Kafka Consumer 구조를 병렬로 설계 (rag-01~rag-09 토픽 분리)
- ConcurrentKafkaListenerContainerFactory를 활용하여 인스턴스 단위 병렬 처리 및 오프셋 커밋 안정화

```java
@KafkaListener(topics = "rag-01", groupId = "rag-group")
public void consume(ConsumerRecord<String, String> record) {
    log.info("Consumed message: {}", record.value());
    process(record.value());
}
```

## 4) 외부 SaaS 연동/로깅
- 외부 SaaS API 호출 시, WebClient를 공통 유틸로 커스터마이징해 상태/헤더/바디 로깅을 표준화
- 응답 바디·헤더·상태코드를 필터링하여 표준 로깅 포맷으로 정규화
- Log4j2 + MDC(traceId, IP, App) 구조로 요청 단위 트레이싱 구현
- DB Appender를 이용해 ERROR 레벨 로그를 별도 테이블에 저장해 장애 추적 효율성 향상

💡 **예시 코드 (실제 X)**
- WebClient를 공통 유틸로 커스터마이징
```java
    @Component
    public class ExternalApiClient {
        private final WebClient client = WebClient.builder()
          .filter(logRequest())
          .filter(logResponse())
          .build();
    }
```

- MDC 기반의 요청 단위 추적 로깅과 DB Appender를 도입
```xml
<Appenders>
  <JDBC name="DBAppender" tableName="error_logs">
    <ConnectionFactory class="org.apache.commons.dbcp2.BasicDataSource" method="getConnection" />
    <Column name="TIMESTAMP" pattern="%d{yyyy-MM-dd HH:mm:ss}" />
    <Column name="LEVEL" pattern="%p" />
    <Column name="LOGGER" pattern="%c" />
    <Column name="MESSAGE" pattern="%m" />
    <Column name="TRACE_ID" pattern="%X{traceId}" />
  </JDBC>
</Appenders>
```

## 5) DevOps
- 환경변수 분리, 긴급 반영 유연성 확보

## 5) 성과
- TODO: 알림 처리량/지연 개선, 로그인 연계 프로세스 정립 등