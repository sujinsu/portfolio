---
title: 성능/안정성
outline: [2,3]
prev: /focus/messaging
next: /focus/devops
---

# 성능/안정성 (JMeter · 캐시 · 서킷브레이커 · 레이트리밋)

> **목표**: API 응답시간/에러율을 낮추고, **피크 트래픽**과 **의존성 장애**에 강한 백엔드 구축.

## 성능 테스트 (JMeter)

- **시나리오**: 로그인 → 조회 5회 → 갱신 → 로그아웃 (think time 200–500ms)
- **부하모델**: Closed model(동접 n 증가) / Open model(RPS 목표) 병행
- **관측**: Scouter(APM), Prometheus(시스템), Kibana(로그) 동시 수집

### JMeter 데모 플랜 (다운로드)

<div class="actions">
  <a class="btn alt"  href="/portfolio/focus/jmeter-guide">실행 가이드</a>
</div>

<div class="caption">
회사/고객 정보는 포함하지 않은 <b>공개용 산itized 플랜</b>입니다. 
실행은 httpbin.org 기반이라 <b>백엔드 없이</b> 재현됩니다.
</div>

## APM / DPM

- telegraf 설치 후 /etc/telegraf/telegraf.conf 편집

```yaml
# [[inputs.mysql]]는 DB 지표
[[inputs.mysql]]
servers = ["user:pass@tcp(mysql:3306)/?tls=false"]
metric_version = 2
gather_process_list = true

# 시스템 지표 (CPU/메모리/디스크/네트워크)
[[inputs.cpu]]     percpu = true  totalcpu = true
[[inputs.mem]]     
[[inputs.disk]]    ignore_fs = ["tmpfs","devtmpfs"]
[[inputs.net]]

# Prometheus로 내보내거나 InfluxDB/Grafana 선호에 맞춰 선택
[[outputs.prometheus_client]]
listen = ":9273"   # :9273/metrics 로 스크랩

```