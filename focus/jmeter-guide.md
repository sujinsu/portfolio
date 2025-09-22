---
title: JMeter 실행 가이드
---

# JMeter 실행 가이드
<p class="actions">
  <a class="btn"
     href="/portfolio/artifacts/jmeter/jmeter-demo.zip"
     download target="_blank" rel="noopener">
     DOWNLOAD
  </a>

</p>

> 이 데모는 **백엔드 없이** `httpbin.org`를 대상으로 동작합니다.  
> 운영/회사 정보는 포함되어 있지 않습니다.



## 1) 준비물

- **Java 8+** (권장: 11 이상)
- **Apache JMeter 5.6+**
    - 다운로드: https://jmeter.apache.org/download_jmeter.cgi
    - 압축 해제 후 `bin/jmeter`(macOS/Linux) 또는 `bin/jmeter.bat`(Windows) 실행 가능

버전 확인:
```bash
jmeter -v
````

## 2) 데모 내려받기 & 압축 풀기

위 DOWNLOAD 버튼으로 jmeter-demo.zip 저장

적당한 작업 폴더로 압축 해제
```kotlin
jmeter-demo/
├─ plan-auth-security-rate-routing.jmx
├─ env.example.properties
└─ data/
└─ users.csv
```


> Tip: env.example.properties를 복사하여 env.properties로 이름을 바꾸고, 필요하면 값을 수정해 사용하세요.

## 3) 데가장 빠른 실행(터미널/CLI)
macOS / Linux
```bash
cd jmeter-demo

# 기본 값으로 실행 (httpbin, RPS=5)
jmeter -n \
  -t plan-auth-security-rate-routing.jmx \
  -q env.example.properties \
  -l out/results.jtl \
  -e -o out/report
```

Windows (PowerShell)

```bash
cd jmeter-demo

jmeter -n `
  -t plan-auth-security-rate-routing.jmx `
  -q env.example.properties `
  -l out\results.jtl `
  -e -o out\report
```

실행이 끝나면 HTML 리포트:
```pgsql
jmeter-demo/out/report/index.html
```


## 4) 값 바꿔서 실행하기(옵션)

env.example.properties(또는 복사한 env.properties) 내용:
```yaml
# 백엔드 없이 동작하는 기본 대상
BASE_URL=https://httpbin.org
# 초당 요청 수 (Throughput Timer용)
TARGET_RPS=5
```


- 파일을 열어 수정하거나,
- CLI에서 바로 -J 파라미터로 덮어쓰기:
```yaml
jmeter -n -t plan-auth-security-rate-routing.jmx \
-JBASE_URL=https://httpbin.org \
-JTARGET_RPS=10 \
-l out/results.jtl -e -o out/report
```


## 5) GUI로 실행(선호 시)

1. JMeter GUI 실행
- macOS/Linux: jmeter
- Windows: bin/jmeter.bat
2. File → Open → plan-auth-security-rate-routing.jmx 열기
3. 좌측 트리에서 Thread Group 선택 → 사용자/루프 횟수 조정 가능
4. Run ▶ (Ctrl/Cmd + R)
5. 완료 후 Run → Generate Summary Results 또는 CLI처럼 리포트 생성:
- 메뉴: Tools → Generate HTML Report (버전별 메뉴명 다를 수 있음)
- 또는 CLI로 -e -o out/report 재생성

## 6) 시나리오 구성 요약 (무해한 대상 · 응답 검증)

- [Auth] Issue Token (200) → POST ${BASE_URL}/post
- [Security] Unauthorized (401) → GET ${BASE_URL}/status/401
- [RateLimit] Too Many Requests (429) → GET ${BASE_URL}/status/429
- [Routing] GET route A/B (200) → GET ${BASE_URL}/anything/route/a|b?user=${userId}&product=${productId}
CSV(data/users.csv)에서 userId, productId를 순환 사용
Constant Throughput Timer로 TARGET_RPS × 60(분당 요청) 제어

## 7) 결과 해석 포인트

Response Times Percentiles: P90/P95 확인
Requests Summary: 200/401/429 성공·실패 분포
Throughput: 초당 요청수 유지 여부
(실무 연결 시) APM/로그/메트릭과 함께 보면 병목 파악이 쉬움

## 8) 트러블슈팅

- command not found: jmeter
  - JMeter 설치 폴더의 bin이 PATH에 없거나, 압축만 풀고 실행 안 한 상태.
  - 해결: JMETER_HOME/bin을 PATH에 추가하거나, 실행 시 절대경로 사용.

- HTML 리포트가 비어 있음
  - -l JTL 경로가 올바른지 확인.
  - 결과 파일 지우고 다시 실행: rm -rf out && mkdir out.

- .jmx 열기/다운로드가 막힘
  - 회사 보안정책일 수 있음. Releases에서 ZIP을 받거나, .jmx.txt로 우회 후 저장 시 확장자만 .jmx로 변경.

## 9) 다음 단계(연동 아이디어)

TARGET_RPS를 높여 보고, 결과 리포트의 에러율/지연 분포 비교

BASE_URL을 사내 샌드박스/테스트 게이트웨이로 교체(공개되지 않은 환경)

InfluxDB/Prometheus Backend Listener 추가 → Grafana로 실시간 관측


---

