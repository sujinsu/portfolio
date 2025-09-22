# 프로젝트 루트에서 (VitePress 레포)
jmeter -n \
-t public/artifacts/jmeter/plan-auth-security-rate-routing.jmx \
-l public/artifacts/jmeter/out/results.jtl \
-e -o public/artifacts/jmeter/out/report \
-q public/artifacts/jmeter/env.example.properties \
-JBASE_URL=https://httpbin.org \
-JTARGET_RPS=5
