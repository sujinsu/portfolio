---
title: DevOps
outline: [2,3]
prev: /focus/performance
next: /focus/auth
---

# DevOps (Docker/K8s · Jenkins/Helm · 관측)

> **목표**: 일관된 빌드/배포 파이프라인과 가시성을 확보해 **빠르고 안전한 배포**를 가능하게.

## CI (Jenkins Pipeline)

```groovy
pipeline {
  agent any
  environment {
    REG = 'harbor.example.com/portfolio'
    APP = 'gateway'
    TAG = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout'){ steps { checkout scm } }
    stage('Build'){
      steps { sh './gradlew clean build -x test' }
    }
    stage('UnitTest'){
      steps { sh './gradlew test' }
      post { always { junit '**/build/test-results/test/*.xml' } }
    }
    stage('Dockerize'){
      steps {
        sh "docker build -t $REG/$APP:$TAG ."
        sh "docker push $REG/$APP:$TAG"
      }
    }
    stage('Deploy STG'){
      steps {
        sh "helm upgrade --install $APP chart/ --namespace stg -f chart/values-stg.yaml --set image.tag=$TAG"
      }
    }
  }
}
```
Harbor 프라이빗 레지스트리, 태그는 빌드번호


Helm 차트(요약)

values.yaml
```yaml
image:
  repository: harbor.example.com/portfolio/gateway
  tag: "latest"
replicaCount: 3
resources:
  requests: { cpu: "100m", memory: "256Mi" }
  limits:   { cpu: "500m", memory: "512Mi" }
env:
  - name: SPRING_PROFILES_ACTIVE
    value: "prod"

```



templates/deployment.yaml (발췌)
```yaml
spec:
  replicas: {{ .Values.replicaCount }}
  strategy:
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    spec:
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: 8080 }
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: 8080 }
            initialDelaySeconds: 20
```

Observability

- 로그: log4j2 + MDC(traceId, app, clientIp) → ELK
- 메트릭: Micrometer → Prometheus → Grafana


운영 가이드/런북

- 장애 유형별 체크리스트(서킷 Open, DLT 폭증, Pod OOMKilled 등)
- K8s 디버그: kubectl top pod, kubectl exec, kubectl logs -p
- 긴급 설정: Deployment envFrom ConfigMap/Secret 분리 → 무중단 환경 변수 교체