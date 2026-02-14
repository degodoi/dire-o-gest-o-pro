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
Acesse o [projeto no Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) e faça alterações diretamente pelo chat. As mudanças são commitadas automaticamente no GitHub.

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

© CFC Direção — Todos os direitos reservados
