---
title: SaaS-Portal — 운영/고도화
tags: [spring-boot, jpa, k8s, ci-cd, monitoring]
period: 2023-02 ~ 진행
role: 백엔드 전담
team: 8
---

# SaaS 포탈 — 운영/고도화

| 항목        | 내용                                                                             |
|-----------|--------------------------------------------------------------------------------|
| **프로젝트명** | SaaS 플랫폼 관리 포털 고도화 (가칭)                                                        |
| **기술 구성** | Java, Spring Boot, MySQL, Jenkins, ArgoCD, Harbor, Log4j2, Kubernetes          |
| **서버 구조** | 단일 Repository 내 멀티모듈 구성 (api, back, front, 공통, 연계, static, util, test 등 기능 분리) |
| **배포 구성** | Jenkins → Docker 이미지 빌드 → Harbor → ArgoCD → Kubernetes 자동 배포 파이프라인 구축          |
| **주요 업무** | 정산 모듈 조회 기능, 상품 타입 확장, 계약/상태 기반 알림 전송 기능 개발                                    |
| **운영 체계** | Jenkins → Harbor → ArgoCD 자동 배포 스크립트 작성 및 파이프라인 구성                             |
| **장애 대응** | Scouter, Kibana 기반 모니터링, Pod 상태 점검 및 Hotfix 대응                                 |
| **성과**    | 배포 자동화 및 장애 대응 프로세스 표준화로 운영 효율성 개선                                             |

## 1) 역할
- **정산(상세/목록)**, **상품 타입 추가**에 따른 계약 등록/수정, **상태 기반 알람 전송** 등 기능 고도화
- 원격 서버 SSH·Pod 상태·Scouter/Kibana 확인·SQL 교차검증 등 **상시 모니터링 로테이션**

## 2) DevOps
- GitLab/Bitbucket/ArgoCD/Jenkins로 CI/CD 구성 문서화
- Harbor 이미지 푸시→배포 파이프라인 정리 및 부서 전파

**💡 코드 예시 — Jenkins → Harbor → ArgoCD 자동화**
```groovy
pipeline {
  stages {
    stage('Build') {
      steps {
        sh 'gradle clean build'
      }
    }
    stage('Docker Push') {
      steps {
        sh 'docker build -t harbor.company.com/saas-portal:${BUILD_NUMBER} .'
        sh 'docker push harbor.company.com/saas-portal:${BUILD_NUMBER}'
      }
    }
    stage('Deploy') {
      steps {
        sh 'argocd app sync saas-portal'
      }
    }
  }
}
```

## 3) 운영 이슈 해결
- 모니터링 중 발견한 에러/개선 과제 직접 개발 반영(스프링 부트 기반)