import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid';

export default defineConfig({
  title: 'LEE SUJIN',
  description: 'Java/Spring Boot ·  K8s · Docker · Kafka · Redis · SAML · CI/CD',
  base: '/portfolio/',
  markdown: { mermaid: true },
  themeConfig: {
    nav: [
      { text: 'Projects', link: '/projects/' },
      { text: 'Blog', link: '/blog/first-post' },
      { text: 'About', link: '/about' },
      { text: 'Resume', link: '/resume' }
    ],
    sidebar: {
      '/projects/': [
        { text: 'Projects', link: '/projects/' },
        { text: 'Gateway & Framework 플랫폼', link: '/projects/gateway' },
        { text: 'SaaS-Portal', link: '/projects/saas-portal' },
        { text: '데이터 전처리 연구', link: '/projects/data-prep' },
        { text: '통합 모니터링', link: '/projects/monitoring' },
        { text: 'LLM RAG Demo', link: '/projects/rag-demo' },
        { text: '그룹 생성형 AI 통합 플랫폼 (대외 협업 프로젝트)', link: '/projects/group-genai' }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sujinsu' }],
    search: { provider: 'local' },
    outline: [2,3]
  }
})
