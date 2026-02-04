# Music School - Sistema de Gerenciamento

Sistema completo de gerenciamento para escola de música e orquestra, desenvolvido com React, Node.js, MySQL e Docker.

## Funcionalidades

- **Autenticação**: Sistema de login com 3 níveis de acesso (Admin, Funcionário, Aluno)
- **Gestão de Alunos**: Cadastro completo com dados pessoais e responsáveis
- **Gestão de Professores**: Controle de professores e suas especialidades
- **Gestão de Turmas**: Turmas por instrumento e ensaio geral da orquestra
- **Chamada**: Registro de presença em aulas com estatísticas
- **Eventos**: Criação de apresentações com lista de participantes e chamada
- **Pagamentos**: Controle de mensalidades com emissão de recibos
- **Dashboard**: Visualizações diferentes para Admin e Alunos
- **Relatórios**: Inadimplentes, frequência, receitas
- **Responsivo**: Interface adaptada para mobile e desktop

## Tecnologias

### Backend
- Node.js 18
- Express.js
- MySQL 8.0
- JWT para autenticação
- bcryptjs para hash de senhas

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router DOM
- Zustand (gerenciamento de estado)
- React Query
- Axios
- Recharts (gráficos)

### DevOps
- Docker & Docker Compose
- Traefik (reverse proxy)
- Nginx

## Pré-requisitos

- Docker e Docker Compose instalados
- Traefik configurado na sua VPS (se for usar em produção)
- Domínios configurados (para produção)

## Instalação

### 1. Clone o projeto

```bash
git clone <end-repositorio>
cd music-school
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:
- `MYSQL_ROOT_PASSWORD`: Senha root do MySQL
- `MYSQL_PASSWORD`: Senha do usuário do banco
- `JWT_SECRET`: Chave secreta JWT
- `APP_DOMAIN`: Seu domínio principal (ex: musicschool.com.br)
- `API_DOMAIN`: Domínio da API (ex: api.musicschool.com.br)

### 3. Deploy com Docker

#### Desenvolvimento Local

```bash
# Inicie os containers
docker-compose up -d

# Acesse em:
# Frontend: http://localhost
# Backend: http://localhost:5000
```

#### Produção com Traefik

Certifique-se de ter a rede `traefik-public` criada:

```bash
docker network create traefik-public
```

Inicie os containers:

```bash
docker-compose up -d
```

O Traefik irá automaticamente:
- Gerar certificados SSL via Let's Encrypt
- Fazer proxy reverso para frontend e backend
- Redirecionar HTTP para HTTPS

### 4. Acesse o sistema

**Credenciais padrão:**
- Email: `admin@musicschool.com`
- Senha: `admin123`

**IMPORTANTE**: Altere a senha padrão após o primeiro acesso!

## Estrutura do Projeto

```
music-school/
├── backend/
│   ├── config/          # Configurações (database)
│   ├── controllers/     # Lógica de negócio
│   ├── middleware/      # Middlewares (auth)
│   ├── routes/          # Rotas da API
│   ├── server.js        # Servidor principal
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── pages/       # Páginas da aplicação
│   │   ├── services/    # API client
│   │   ├── store/       # Zustand store
│   │   └── routes.jsx   # Configuração de rotas
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── database/
│   └── init.sql         # Schema do banco de dados
├── docker-compose.yml
└── .env.example
```

## Papéis e Permissões

### Admin
- Acesso total ao sistema
- Gerenciamento de usuários
- Configurações globais

### Funcionário
- Cadastro de alunos e professores
- Gestão de turmas
- Registro de chamadas
- Gerenciamento de pagamentos

### Aluno
- Visualização do próprio dashboard
- Consulta de turmas matriculadas
- Verificação de pagamentos
- Consulta de eventos

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário atual
- `PUT /api/auth/change-password` - Alterar senha

### Dashboard
- `GET /api/dashboard` - Dashboard admin/funcionário
- `GET /api/dashboard/student` - Dashboard do aluno

### Alunos
- `GET /api/students` - Listar alunos
- `GET /api/students/:id` - Detalhes do aluno
- `POST /api/students` - Cadastrar aluno
- `PUT /api/students/:id` - Atualizar aluno
- `DELETE /api/students/:id` - Excluir aluno

### Professores
- `GET /api/teachers` - Listar professores
- `GET /api/teachers/:id` - Detalhes do professor
- `POST /api/teachers` - Cadastrar professor
- `PUT /api/teachers/:id` - Atualizar professor
- `DELETE /api/teachers/:id` - Excluir professor

### Turmas
- `GET /api/classes` - Listar turmas
- `GET /api/classes/:id` - Detalhes da turma
- `POST /api/classes` - Criar turma
- `PUT /api/classes/:id` - Atualizar turma
- `DELETE /api/classes/:id` - Excluir turma
- `POST /api/classes/:id/enroll` - Matricular aluno
- `DELETE /api/classes/:id/students/:studentId` - Remover aluno

### Pagamentos
- `GET /api/payments` - Listar pagamentos
- `GET /api/payments/:id` - Detalhes do pagamento
- `POST /api/payments` - Criar pagamento
- `PUT /api/payments/:id` - Atualizar pagamento
- `POST /api/payments/:id/pay` - Marcar como pago
- `GET /api/payments/overdue/list` - Listar inadimplentes
- `POST /api/payments/generate/monthly` - Gerar pagamentos mensais
- `GET /api/payments/:id/receipt` - Recibo

### Eventos
- `GET /api/events` - Listar eventos
- `GET /api/events/:id` - Detalhes do evento
- `POST /api/events` - Criar evento
- `PUT /api/events/:id` - Atualizar evento
- `DELETE /api/events/:id` - Excluir evento
- `POST /api/events/:id/participants` - Adicionar participante
- `DELETE /api/events/:id/participants/:studentId` - Remover participante
- `POST /api/events/:id/attendance` - Registrar presença
- `GET /api/events/:id/attendances` - Listar presenças

### Chamada
- `GET /api/attendances/class` - Presenças por turma
- `GET /api/attendances/student` - Presenças por aluno
- `POST /api/attendances` - Registrar presença
- `POST /api/attendances/bulk` - Registrar chamada em lote
- `GET /api/attendances/stats` - Estatísticas de frequência
- `GET /api/attendances/report` - Relatório de frequência

## 🔧 Comandos Úteis

### Logs
```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart
```bash
# Reiniciar todos os serviços
docker-compose restart

# Reiniciar um serviço específico
docker-compose restart backend
```

### Rebuild
```bash
# Rebuild após mudanças no código
docker-compose up -d --build
```

### Backup do Banco
```bash
docker exec music-school-db mysqldump -u root -p music_school > backup.sql
```

### Restore do Banco
```bash
docker exec -i music-school-db mysql -u root -p music_school < backup.sql
```

## Segurança

- Todas as senhas são hasheadas com bcrypt
- JWT com expiração configurável
- Middleware de rate limiting
- Helmet.js para headers de segurança
- CORS configurado
- Validação de dados em todas as rotas

## TODO / Próximas Implementações

- [ ] Upload de documentos dos alunos
- [ ] Sistema de mensagens/notificações
- [ ] Geração de relatórios em PDF
- [ ] Integração com gateways de pagamento
- [ ] Sistema de avaliações
- [ ] App mobile nativo
- [ ] Backup automático do banco de dados

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## Licença

MIT

## Autor

Desenvolvido por Deivison Macharete (DeivTech).
