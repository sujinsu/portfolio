---
title: LLM RAG Demo 채팅
tags: [spring-boot, python, langchain, elasticsearch, rrf, kubernetes, jenkins]
period: 2023-11 ~ 진행
role: 백엔드 전담(중계 서버 & 데이터 준비)
team: 6
---

# LLM RAG Demo 채팅

## 1) 백엔드/중계
- Spring Boot로 **중계 API/메시지 포맷/예외 처리** 설계·구현
- Jenkins 파이프라인 구성/배포 전담

## 2) 데이터 레디니스 & 검색
- Python/LangChain으로 임베딩 → **Elasticsearch dense_vector** 저장
- Kibana DevTools로 인덱스/쿼리 검증
- **하이브리드 검색(RRF)**: BM25 + 벡터 스코어 결합(EnsembleRetriever 커스텀)

## 3) 산출물
- RAG 파이프라인 가이드/노트북 정리