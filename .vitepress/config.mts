import { defineConfig } from 'vitepress'
export default defineConfig({
  title: 'Backend Portfolio',
  description: 'Java/Spring Boot · Kafka · Redis · K8s · Docker · SAML · CI/CD',
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
        { text: 'Bard', link: '/projects/bard' },
        { text: 'SaaS-Portal', link: '/projects/saas-portal' },
        { text: '데이터 전처리 연구', link: '/projects/data-prep' },
        { text: 'RHEA 2.0', link: '/projects/rhea' },
        { text: 'LLM RAG Demo', link: '/projects/rag-demo' },
        { text: 'MSPP', link: '/projects/mspp' },
        { text: '그룹 공동 생성형 AI', link: '/projects/group-genai' }
      ]
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/<your-id>' }],
    search: { provider: 'local' },
    outline: [2,3]
  }
})
