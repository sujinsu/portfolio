---
title: RHEA 2.0 — 통합 모니터링
tags: [monitoring, aws, cloudwatch, polestar, vrops, api]
period: 2023-09 ~ 2023-10
role: 백엔드 전담
team: 4
---

# RHEA 2.0 — 통합 모니터링

## 1) 목표
서버/K8S/DB/CloudWatch/Process/HTTP 등 **다양한 자원 메트릭을 단일 화면**에서 확인

## 2) 구현
- AWS SDK로 **CloudWatch 메트릭 목록/수집 방안** 정리
- 운영 근접 **수집 API** 설계/개발 및 절차 문서화
- **Polestar/VrOps**와 Outbound REST 연동 가이드 작성