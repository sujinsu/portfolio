---
title: 데이터 전처리 연구 — DPS/Embedding
tags: [python, spark, huggingface, elasticsearch, milvus, nlp]
period: 2023-08 ~ 2023-09
role: 백엔드 전담(연구)
team: 8
---

# 데이터 전처리 연구 — DPS/Embedding

| 항목 | 내용 |
|------|------|
| **프로젝트명** | 데이터 전처리 및 문장 임베딩 구조 연구 (PoC) |
| **목표** | 사내 NLP 모델 학습에 필요한 텍스트 전처리 및 문장 임베딩 구조를 분석하고, Spark 기반 파이프라인 프로토타입을 설계 |
| **기술 구성** | Python, Spark, Jupyter, HuggingFace Transformers |
| **성과** | 텍스트 슬라이딩 윈도우 방식 검증, DPS 실행 구조 분석 문서화 |

> ⚠️ 본 연구 내용은 공개 오픈소스 기술(Spark, HuggingFace 등)을 기반으로 한 사내 PoC 단계의 일반적 기술 검토이며,
실제 데이터나 상용 서비스 구조와는 무관함.

## 1) 연구 개요
> 본 연구는 사내 문서 검색 품질 향상을 위해  
텍스트 임베딩 및 데이터 전처리 구조를 실험적으로 검증한 PoC 단계 연구입니다.  
Python과 Spark를 이용해 대용량 텍스트 전처리 흐름을 분석하고,  
한국어 처리 특화 모델을 활용하여 문장 단위 임베딩 전략을 비교·정리했습니다.

## 2) 주요 내용

### 🧩 (1) DPS(Data Processing System) - 
**Spark 기반 데이터 전처리 배치 파이프라인 원리 연구**
- Spark Job 실행 후 `output` 폴더 충돌 방지를 위한 **동적 경로 생성 로직** 검토
- Python 스크립트를 통해 Job별 `output_dir`을 자동 갱신하도록 구조화
- **Hadoop 환경 변수 구성 및 실행 흐름 문서화**
    - `winutils` 설치 및 Path 설정 등 Spark 실행 환경 전 단계 정리
- **결과**: Spark Job 실행 시 매번 신규 결과 폴더가 자동 생성되는 구조를 설계
> Spark는 대규모 데이터를 여러 노드에 분산시켜 처리하는 배치 프레임워크로,
실시간보다는 일정 단위의 데이터를 병렬로 처리하는 데 강점을 가짐.


### 🧠 (2) Text Embedding 구조 분석

문장 임베딩은 **4단계 구조**로 분해하여 분석했습니다.
- **BERT 최대 토큰 초과 처리**: 문장 분할/슬라이딩 윈도우/요약 비교 → **슬라이딩 윈도우 채택**
- Jupyter Notebook으로 실험/정리

| 단계 | 처리 내용 | 기술 요소 | 주요 특징 |
|------|------------|-------------|------------|
| ① **Tokenizing** | 문장을 WordPiece 단위로 분리 | `AutoTokenizer` | 서브워드 단위로 분절되어 희귀어 처리에 강함 |
| ② **Token Embedding** | 각 토큰을 고정 차원(768-dim) 벡터로 변환 | `Embedding Layer` | BERT 기반 모델의 입력층, 문맥 정보 없음 |
| ③ **Transformer Encoding** | Self-Attention으로 문맥 반영 | `Multi-Head Attention`, `FeedForward` | 문맥적 유사도 학습, 관계 파악 |
| ④ **Sentence Pooling** | 토큰 벡터를 평균/CLS로 집계해 문장 벡터 생성 | `Mean Pooling`, `CLS Token` | 최종 문장 표현으로 사용, 검색·유사도 계산에 활용 |

예시 코드:
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("{model-name}")

sentences = [
    "안녕하세요, 임베딩 테스트 문장입니다.",
    "문장 임베딩은 NLP의 핵심 구성요소입니다."
]
embeddings = model.encode(sentences)
print("임베딩 차원:", embeddings.shape)  # (2, 768)
```
✅ 결과 요약:

- 평균 풀링(mean pooling) 방식이 가장 안정적이며,
- 문장 간 의미 유사도 계산 시 일관된 결과를 제공.
- BERT 최대 토큰 초과 시 슬라이딩 윈도우 분할로 대응함.



## 🧾 3) 연구 결과

- Spark 기반 배치 전처리 구조 및 실행 단계 문서화
- Embedding 처리 과정(입력 제한, 문맥 반영 방법) 분석 결과 정리
- 향후 대규모 데이터 파이프라인 적용 시 기준 레퍼런스 확보
- 실험/분석 결과를 내부 공유용 Notebook & 문서로 정리 