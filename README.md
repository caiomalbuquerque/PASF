# PASF — Plano de Ação para Sustentabilidade Financeira

Protótipo visual em HTML/CSS/JS puro. Hospedagem prevista: GitHub Pages.
Banco de dados previsto: Supabase.

## Como executar localmente

Opção 1 — servidor simples (recomendado):
    npx serve .
    # ou: python -m http.server 8080

Opção 2 — abrir `index.html` direto no navegador (funciona, mas sem cache de sessão entre abas).

## Contas demo (senha em `assets/js/state.js`)

| E-mail               | Senha    | Perfil             |
|----------------------|----------|--------------------|
| admin@pasf.com       | admin123 | Admin              |
| carlos@pasf.com      | 123456   | Global Colaborador |
| ana@pasf.com         | 123456   | Global Viewer      |
| maria@emp1.com       | 123456   | Gestor Empresa 1   |
| pedro@emp1.com       | 123456   | User Empresa 1     |
| lucas@emp1.com       | 123456   | Viewer Empresa 1   |

## Persistência

Estado é salvo em `localStorage` (chave `pasf_state_v1`) a cada alteração.
Para resetar, abra o DevTools → Application → Local Storage → remover a chave,
ou use o botão "Resetar demo" na tela de login.