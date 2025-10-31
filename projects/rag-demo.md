---
title: LLM RAG Demo 채팅
tags: [spring-boot, python, langchain, elasticsearch, rrf, kubernetes, jenkins]
period: 2023-11 ~ 2024-04
role: 백엔드 전담(중계 서버 & 데이터 준비)
team: 6
---

# LLM RAG Demo 채팅

## 1) 프로젝트 개요
- **목표:** 사내 RFP 대응용 **검색-생성(RAG) 데모 플랫폼** 구현
- **핵심 포인트:**
    - **BM25(Elasticsearch) + Dense(Milvus)** 하이브리드 검색
    - **RRF(Ranked Retrieval Fusion)** 기반 결과 융합
    - **Spring Boot** 중계 API(인증/예외/타임아웃) ↔ **Python LangChain** 검색·생성 파이프라인
    - **Jenkins + Docker + K8s**로 PoC 수준 이상 **운영형 배포 플로우** 적용 

💡 왜 ES + Milvus?

ES: 키워드 정밀 매칭(BM25)·필터링·메타데이터 질의 강점
Milvus: 대규모 임베딩 벡터에 대한 근사 최근접(ANN) 검색 성능·스케일링 용이

두 결과를 RRF로 융합해 “키워드 적합성 × 의미 유사도” 균형 확보
---

## 1) 백엔드/중계
- Spring Boot로 **중계 API/메시지 포맷/예외 처리** 설계·구현
- Jenkins 파이프라인 구성/배포 전담

## 2) 인덱싱 파이프라인
[문서 수집 → 전처리(chunk) → 임베딩 → 저장]
- BM25: ES 인덱스에 원문·메타데이터 저장
- Dense: 임베딩 생성 후 Milvus 컬렉션에 저장
  - Python/LangChain으로 임베딩 → **Elasticsearch dense_vector** 저장
  - Kibana DevTools로 인덱스/쿼리 검증


## 3) 검색 파이프라인
- BM25(ES) 결과와 Dense(Milvus) 결과를 받아 RRF로 융합 >> BM25 + 벡터 스코어 결합
- LangChain EnsembleRetriever 또는 커스텀 RRF로 구현


💡 **예시 코드 (실제 X)**
```python

def hybrid_search(collection_name, query, k):
    bm25_retriever = BM25Retriever.from_texts(docs)
    
    vector_retriever = Milvus(
        embedding_function=HuggingFaceEmbeddings(model_name=Config.MODEL_NAME,
                                                 encode_kwargs={'normalize_embeddings': True}),
        connection_args={"host": Config.MILVUS_HOST, "port": Config.MILVUS_PORT},
        collection_name=collection_name
    ).as_retriever()

    # 내부적으로 vector_retriever는 similarity_search_with_score_by_vector >> k=4
    ensemble_retriever = EnsembleRetriever(retrievers=[bm25_retriever, vector_retriever], weights=[0.X, 0.X])
    docs = ensemble_retriever.invoke(query)

    // 생략 
    
    return docs

```


## 3) 산출물
- RAG 파이프라인 가이드/노트북 정리