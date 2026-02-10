

# Sistema de Gestão CFC DIREÇÃO

## Visão Geral
Sistema completo de gestão para autoescola com tema dark sofisticado, autenticação por níveis de acesso, e módulos integrados para funcionários, alunos, financeiro e aulas.

**Paleta de cores:** Fundo #121212 (charcoal), textos em tons de cinza (#E0E0E0, #B0B0B0), bordas #444444, detalhes #888888. Acentos em azul para ações e estados ativos.

**Backend:** Lovable Cloud (Supabase gerenciado)

---

## Fase 1 — Fundação: Autenticação e Layout Base

- **Tela de login** com visual profissional e logo "CFC DIREÇÃO"
- **Sistema de autenticação** com email/senha via Supabase Auth
- **Tabela de roles** (admin, secretaria, instrutor) com permissões escalonáveis
- **Layout principal** com sidebar responsiva (colapsável) e header
- **Navegação** entre os módulos com ícones Lucide
- **Proteção de rotas** baseada no nível de acesso do usuário
- **Tema dark** aplicado globalmente com a paleta definida

---

## Fase 2 — Dashboard e Módulo de Funcionários

### Dashboard
- Cards com métricas: total de alunos, receita do mês, aulas agendadas, instrutores ativos
- Gráfico de desempenho financeiro (receitas x despesas)
- Lista de atividades recentes
- Atalhos rápidos para ações mais usadas

### Módulo de Funcionários
- Listagem com filtros por cargo e status (ativo/inativo)
- Cadastro completo: dados pessoais, endereço, cargo, data admissão, foto (upload), credenciais de acesso
- Edição, exclusão com confirmação e visualização detalhada
- Máscaras de input (telefone, CPF, CEP)
- Validação em tempo real dos formulários

---

## Fase 3 — Módulo de Alunos

- Listagem com busca, filtros (nome, status, categoria A/B/AB) e paginação
- Cadastro integrado: dados pessoais, endereço, categoria pretendida, foto 3x4 e documentos (upload)
- Status do aluno: ativo, em formação, formado, desistente
- **Ao cadastrar:** geração automática do financeiro com valor personalizado e parcelas
- Perfil detalhado do aluno com histórico completo (aulas, pagamentos, status)
- Validação de CPF e campos obrigatórios

---

## Fase 4 — Módulo Financeiro

- Dashboard financeiro com gráficos de receitas e despesas
- **Gestão por aluno:** valor total do curso (personalizado), parcelas com vencimento, status (paga/pendente/atrasada), forma de pagamento (PIX, boleto, dinheiro, cartão), upload de comprovante
- **Movimentações gerais:** receitas e despesas com categoria, data e descrição
- Relatórios por período (dia, semana, mês, ano) e por categoria
- Fluxo de caixa
- Exportação em PDF e Excel

---

## Fase 5 — Módulo de Aulas e Pagamento de Instrutores

- **Registro de aulas:** data/horário, instrutor, aluno, tipo (prática = R$10 / prova = R$20), duração, status (realizada, cancelada, reagendada), observações
- **Cálculo automático** de pagamento por instrutor baseado nas aulas realizadas
- Relatório de pagamento (semanal, quinzenal, mensal) com detalhamento por instrutor
- Histórico de aulas por instrutor e por aluno
- Exportação de relatórios em PDF

---

## Fase 6 — Polimento e Funcionalidades Avançais

- Ordenação de colunas em todas as listagens
- Animações sutis e transições suaves
- Loading states e feedback visual (toasts) em todas as ações
- Histórico de alterações (audit log) para dados críticos
- Responsividade refinada para tablet e mobile
- Revisão geral de UX e consistência visual

