# CFC Direção — Sistema de Gestão

Sistema completo de gestão para Centro de Formação de Condutores (CFC), desenvolvido com tecnologias modernas e interface intuitiva.

## Funcionalidades

- **Gestão de Alunos** — Cadastro completo com categorias (A, B, AB), controle de aulas contratadas e parcelas
- **Controle de Aulas** — Agendamento, reagendamento, cancelamento e registro de aulas práticas e exames (Moto/Carro)
- **Gestão de Funcionários** — Cadastro de instrutores e equipe administrativa
- **Financeiro** — Controle de parcelas, transações e pagamento de instrutores
- **Controle de Limites** — Sistema de cotas de aulas por categoria com liberação via senha admin
- **Autenticação** — Login seguro com controle de permissões por perfil (admin, secretária, instrutor)

## Tecnologias

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — Build tool
- [Tailwind CSS](https://tailwindcss.com/) — Estilização
- [shadcn/ui](https://ui.shadcn.com/) — Componentes de interface
- [Lovable Cloud](https://lovable.dev/) — Backend (banco de dados, autenticação, storage)
- [TanStack React Query](https://tanstack.com/query) — Gerenciamento de estado assíncrono
- [Recharts](https://recharts.org/) — Gráficos
- [date-fns](https://date-fns.org/) — Manipulação de datas

## Como rodar localmente

Pré-requisito: [Node.js](https://nodejs.org/) instalado (recomendado via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

```sh
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>

# 2. Acesse a pasta do projeto
cd <NOME_DO_PROJETO>

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

## Como editar

### Via Lovable
Acesse o [projeto no Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) e faça alterações diretamente pelo chat.

### Via IDE local
Clone o repositório, faça suas alterações e envie via `git push`. As mudanças sincronizam automaticamente com o Lovable.

### Via GitHub
Edite arquivos diretamente pelo GitHub clicando no ícone de edição (lápis) em qualquer arquivo.

## Deploy

Acesse o [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) e clique em **Compartilhar → Publicar**.

## Domínio personalizado

É possível conectar um domínio próprio em **Projeto → Configurações → Domínios**.

Saiba mais: [Configurando domínio personalizado](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Prompt para recriar o sistema

Abaixo está o prompt completo para recriar este sistema do zero no Lovable (ou ferramenta similar). Inclui tudo que já foi implementado e funcionalidades futuras planejadas.

---

### PROMPT COMPLETO

```
Crie um sistema completo de gestão para Centro de Formação de Condutores (CFC) chamado "CFC DIREÇÃO".
O sistema deve ser em português brasileiro, com tema escuro por padrão, design moderno e responsivo.

=== AUTENTICAÇÃO E PERMISSÕES ===

- Tela de login com email/senha e opção de criar conta (signup)
- 3 perfis de acesso: admin, secretaria, instrutor
- Tabela user_roles vinculando user_id ao role
- Tabela profiles com dados adicionais do usuário (full_name, email, phone, avatar_url)
- Rotas protegidas: somente usuários autenticados acessam o sistema
- Sidebar com navegação: Dashboard, Alunos, Aulas, Funcionários, Financeiro
- AdminPasswordDialog: componente reutilizável que exige re-autenticação com senha do admin antes de ações destrutivas ou sensíveis (excluir registros, ultrapassar limites, etc.)

=== DASHBOARD ===

- Cards com: Total de Alunos ativos, Receita do Mês (parcelas pagas), Aulas Agendadas, Instrutores Ativos
- Seção de atividades recentes (placeholder por enquanto)

=== GESTÃO DE ALUNOS ===

Tabela students:
- id (UUID, PK), full_name, rg, cpf, birth_date, phone, email
- Endereço completo: address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip
- category (A, B, AB), enrollment_date, status (ativo, em_formacao, formado, desistente)
- course_value (valor total do curso), installments_count (número de parcelas)
- max_lessons_a (limite de aulas moto), max_lessons_b (limite de aulas carro)
- photo_url, notes, is_active
- created_at, updated_at

Funcionalidades:
- CRUD completo com formulário em dialog (com scroll para formulários longos)
- Upload de foto 3x4 (máx 5MB)
- Máscaras para CPF (000.000.000-00), telefone ((00) 00000-0000), CEP (00000-000)
- Validação de CPF
- Ao cadastrar aluno, gerar parcelas automaticamente na tabela student_payments com vencimentos mensais
- Campos de quantidade de aulas contratadas por categoria (Moto e Carro), exibidos condicionalmente conforme a categoria do aluno
- Filtros por nome/email/CPF, categoria e status
- Visualização detalhada com dados pessoais, endereço, financeiro e lista de parcelas
- Exclusão com confirmação via AdminPasswordDialog (exclui aulas e parcelas vinculadas)

=== GESTÃO DE AULAS ===

Tabela lessons:
- id (UUID, PK), date, start_time, duration_minutes (default 50)
- type: pratica_a (Moto R$10), pratica_b (Carro R$10), exame_a (Moto R$20), exame_b (Carro R$20)
- instructor_id (FK employees), student_id (FK students)
- status: agendada, realizada, cancelada, reagendada
- value (calculado pelo tipo), notes
- created_at, updated_at

Funcionalidades:
- Formulário de registro com selects de aluno e instrutor (apenas instrutores ativos)
- Tipos de aula filtrados automaticamente pela categoria do aluno selecionado
- Controle de cota: ao registrar aula, verifica se o aluno atingiu o limite de aulas contratadas (max_lessons_a / max_lessons_b). Se excedido, exige senha admin via AdminPasswordDialog
- Informação do limite do aluno exibida no formulário
- Status agendada e reagendada permitem: marcar como realizada, reagendar (com nova data/hora + senha admin), cancelar
- Edição de qualquer aula via botão lápis
- Exclusão com AdminPasswordDialog (somente admin)
- Filtro por instrutor/aluno e status

Aba "Pagamento Instrutores":
- Agrupamento de aulas realizadas por instrutor no mês selecionado
- Cálculo do total a pagar por instrutor (R$10 por aula prática, R$20 por exame)
- Detalhamento por tipo: prática A, prática B, exame A, exame B
- Listagem individual de cada aula com data, aluno, tipo e valor

=== GESTÃO DE FUNCIONÁRIOS ===

Tabela employees:
- id (UUID, PK), full_name, rg, cpf, birth_date, phone, email
- Endereço completo (mesma estrutura dos alunos)
- role (admin, secretaria, instrutor), hire_date
- photo_url, is_active, user_id
- created_at, updated_at

Funcionalidades:
- CRUD completo com formulário em dialog com scroll
- Upload de foto, máscaras de CPF/telefone/CEP
- Filtros por nome/email, cargo e status (ativo/inativo)
- Visualização detalhada
- Exclusão com confirmação

=== FINANCEIRO ===

Tabela student_payments:
- id, student_id (FK students), installment_number, amount, due_date
- status (pendente, paga, atrasada), paid_date, payment_method, receipt_url
- created_at, updated_at

Tabela transactions:
- id, type (receita, despesa), category, description, amount, date, payment_method
- created_at, updated_at

3 abas:
1. Dashboard Financeiro:
   - Cards: Receitas do Mês, Despesas do Mês, Saldo, A Receber
   - Alerta de parcelas atrasadas
   - Gráfico de barras: Receitas x Despesas (últimos 6 meses)
   - Gráfico de pizza: Despesas por categoria

2. Parcelas:
   - Lista de parcelas com filtro por aluno e status
   - Ação para marcar como paga (com data e forma de pagamento)
   - Exclusão com AdminPasswordDialog

3. Movimentações:
   - CRUD de receitas e despesas avulsas
   - Categorias pré-definidas por tipo
   - Formas de pagamento: Dinheiro, PIX, Cartão de Crédito/Débito, Boleto, Transferência
   - Exclusão com AdminPasswordDialog

=== BANCO DE DADOS (RLS) ===

- Todas as tabelas com Row Level Security (RLS) habilitado
- Políticas baseadas em autenticação (auth.uid())
- Tabela user_roles para controle de permissões
- Funções auxiliares: get_user_role(user_id), has_role(role, user_id)

=== DESIGN E UX ===

- Tema escuro com cores semânticas via CSS variables (HSL)
- Tokens: --background, --foreground, --primary, --secondary, --muted, --accent, --destructive, --success, --warning
- Componentes shadcn/ui personalizados
- Animações suaves (fade-in, slide-up, hover-lift)
- Formulários em dialogs com max-h-[90vh] overflow-y-auto para garantir scroll
- Sidebar colapsável com ícones Lucide
- Badges coloridos por status
- Loading states com Skeleton
- Toasts para feedback de ações

=== FUNCIONALIDADES FUTURAS PLANEJADAS ===

- Relatórios em PDF (ficha do aluno, comprovante de pagamento, relatório mensal)
- Agenda visual (calendário) para aulas
- Notificações push/email de vencimento de parcelas
- Dashboard do instrutor (ver apenas suas aulas)
- Controle de veículos (cadastro, manutenção, vinculação a aulas)
- Controle de frequência com assinatura digital
- Módulo de provas teóricas (simulados)
- Integração com sistema DETRAN
- Backup automático de dados
- Modo claro/escuro toggle
- App mobile (PWA)
- Multi-unidade (franquias)
```

---

© CFC Direção — Todos os direitos reservados
