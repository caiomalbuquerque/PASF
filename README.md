# PASF — Plano de Ação para Sustentabilidade Financeira

Protótipo visual em HTML/CSS/JS puro. Hospedagem prevista: GitHub Pages.
Banco de dados previsto: Supabase (Auth + Postgres + Storage + Realtime).

## Como executar localmente

    npx serve .
    # ou: python -m http.server 8080

Depois abra `http://localhost:8080`.

## Primeiro acesso

Este projeto **não tem usuários pré-cadastrados**. Para criar o primeiro administrador:

1. No painel do Supabase, vá em **Authentication → Users → Add user**.
2. Informe e-mail e senha (ex.: `admin@pasf.com` / uma senha forte).
3. Copie o `UUID` do usuário criado.
4. No **SQL Editor**, rode:

   ```sql
   insert into profiles (id, name, email, role, company_id, manager_id)
   values (
     'COLE_O_UUID_AQUI',
     'Administrador',
     'admin@pasf.com',
     'admin',
     null,
     null
   );
