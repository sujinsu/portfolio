---
title: DevOps (CI/CD · Docker · K8s)
outline: [2,3]
tags: [jenkins, gitlab, docker, harbor, nexus, kubernetes, rollout, healthcheck, helm-optional]
prev: /focus/performance
next: /focus
---

# DevOps (Jenkins · GitLab · Docker · K8s 배포)

> **목표:**  
> 소스 커밋부터 배포까지 완전 자동화.  
> GitLab 푸시 → Jenkins 파이프라인 → Docker 이미지 빌드/푸시(Harbor/Nexus) →  
> K8s 플러그인으로 `Deployment/Service/Ingress` 적용 → **무중단 롤링 업데이트**.



## 🧰 기술 스택

| 영역 | 사용 도구 | 비고 |
|---|---|---|
| **SCM/파이프라인 트리거** | GitLab | `Webhook` → Jenkins |
| **CI** | Jenkins Declarative Pipeline | 멀티브랜치/Folder 구조 |
| **이미지 빌드/배포** | Docker | 멀티스테이지 빌드 |
| **레지스트리** | Harbor / Nexus | `imagePullSecrets` 사용 |
| **오케스트레이션** | Kubernetes | Jenkins K8s 플러그인 or `kubectl` |
| **무중단/헬스체크** | RollingUpdate, `readiness/liveness` | 앱 헬스엔드포인트 사용 |
| **환경분리** | `dev/stg/prd` 네임스페이스 | 태그/네임스페이스로 분리 |



⚠️ **아래 샘플 코드는 모두 표준 기술 문서 기반으로 작성된 예시이며, 실제 프로젝트나 사내 시스템의 코드를 인용한 것이 아님을 명확히 밝힙니다.**
## 1️⃣ GitLab ↔ Jenkins 연동

- **GitLab Webhook**: `http(s)://jenkins.example.com/project/<job-name>`
- **Jenkins Credentials**: GitLab 토큰, 레지스트리 계정(Harbor/Nexus), K8s kubeconfig

```bash
# GitLab > Settings > Webhooks
URL: https://jenkins.example.com/project/my-app
Trigger: Push events, Merge request events
```
## 2️⃣ Dockerfile (Spring Boot 예시, 멀티스테이지)

```dockerfile
# --- build stage ---
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN ./gradlew clean bootJar -x test

# --- runtime stage ---
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENV JAVA_OPTS="-Xms256m -Xmx512m"
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
```
## 3️⃣ Jenkins (Harbor/Nexus 푸시 + K8s 롤링 업데이트)

```groovy
pipeline {
  agent any
  environment {
    REGISTRY_URL = 'harbor.example.com'    // 또는 nexus.example.com
    REGISTRY_CRED = 'harbor-cred'          // Jenkins Credentials ID
    IMAGE_NAME = 'my-team/my-app'
    K8S_CRED = 'kubeconfig-prod'           // Jenkins Kubernetes Credential
    K8S_CONTEXT = 'prod-cluster'
    NAMESPACE = 'prd'
    COMMIT = "${env.GIT_COMMIT?.take(7)}"
    IMAGE_TAG = "${COMMIT ?: env.BUILD_NUMBER}"
  }
  options { timestamps(); ansiColor('xterm') }
  triggers { gitlab(triggerOnPush: true, triggerOnMergeRequest: true) }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Unit Test') {
      steps {
        sh './gradlew clean test -x integrationTest'
      }
      post {
        always { junit 'build/test-results/test/*.xml' }
      }
    }

    stage('Build Image') {
      steps {
        script {
          sh """
            docker build -t ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG} .
          """
        }
      }
    }

    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(credentialsId: REGISTRY_CRED, usernameVariable: 'U', passwordVariable: 'P')]) {
          sh """
            echo $P | docker login ${REGISTRY_URL} -u $U --password-stdin
            docker push ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}
            docker logout ${REGISTRY_URL}
          """
        }
      }
    }

    stage('Deploy to K8s (RollingUpdate)') {
      steps {
        withKubeConfig(credentialsId: K8S_CRED, contextName: K8S_CONTEXT) {
          sh """
            # 이미지 태그 주입
            sed -e 's#{{IMAGE}}#${REGISTRY_URL}/${IMAGE_NAME}#g' \
                -e 's#{{TAG}}#${IMAGE_TAG}#g' k8s/deployment.yaml | kubectl apply -n ${NAMESPACE} -f -
            kubectl apply -n ${NAMESPACE} -f k8s/service.yaml
            kubectl apply -n ${NAMESPACE} -f k8s/ingress.yaml

            # 롤아웃 상태 확인 (타임아웃 120초)
            kubectl rollout status deploy/my-app -n ${NAMESPACE} --timeout=120s
          """
        }
      }
    }
  }

  post {
    success { echo "Deployed ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG} to ${NAMESPACE}" }
    failure { echo "Deployment failed. Consider rollback: kubectl rollout undo deploy/my-app -n ${NAMESPACE}" }
  }
}
```

## 4️⃣ Kubernetes 매니페스트 (무중단/헬스체크)
- k8s/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # 한번에 추가되는 파드
      maxUnavailable: 0   # 가용성 100% 유지
  selector:
    matchLabels: { app: my-app }
  template:
    metadata:
      labels: { app: my-app }
    spec:
      imagePullSecrets:
        - name: regcred      # Harbor/Nexus 자격증명
      containers:
        - name: my-app
          image: "{{IMAGE}}:{{TAG}}"   # Jenkins에서 대체
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: 8080 }
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
          livenessProbe:
            httpGet: { path: /actuator/health/liveness, port: 8080 }
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          resources:
            requests: { cpu: "200m", memory: "256Mi" }
            limits:   { cpu: "500m", memory: "512Mi" }
          env:
            - name: SPRING_PROFILES_ACTIVE
              valueFrom:
                configMapKeyRef:
                  name: my-app-config
                  key: profile
```
- k8s/service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  type: ClusterIP
  selector: { app: my-app }
  ports:
    - name: http
      port: 80
      targetPort: 8080
```
- k8s/ingress.yaml
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```
> [헬스체크 팁]
> 
> Spring Boot Actuator:
> management.endpoint.health.probes.enabled=true
> management.endpoints.web.exposure.include=health,info
> management.health.livenessState.enabled=true
> management.health.readinessState.enabled=true

## 5️⃣ 환경 분리 전략 (dev/stg/prd)
- 네임스페이스 분리: dev, stg, prd
- 이미지 태그: `app:<branch>-<commit>` (예: main-a1b2c3d)
- 설정 분리: ConfigMap/Secret 파일을 환경별로 분리
- 프로브 임계치: prd 에 더 보수적 설정 (timeout/threshold ↑)`
```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: my-app-config, namespace: stg }
data:
  profile: "stg"
```
✅ 성과 요약
- maxUnavailable: 0 설정과 readiness probe로 완전 무중단 롤링 업데이트
- Harbor/Nexus 인증 자동화 및 imagePullSecrets로 보안 강화
- dev/stg/prd 환경 분리와 ConfigMap/Secret로 설정 일관성 확보


---
Observability

- 로그: log4j2 + MDC(traceId, app, clientIp) → ELK
- 메트릭: Micrometer → Prometheus → Grafana


운영 가이드/런북

- 장애 유형별 체크리스트(서킷 Open, DLT 폭증, Pod OOMKilled 등)
- K8s 디버그: kubectl top pod, kubectl exec, kubectl logs -p
- 긴급 설정: Deployment envFrom ConfigMap/Secret 분리 → 무중단 환경 변수 교체