# 🚀 GUIA DE INÍCIO RÁPIDO

## Instalação em 5 minutos

### 1. Extrair arquivos
```bash
tar -xzf music-school.tar.gz
cd music-school
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
nano .env  # ou vim .env
```

**Variáveis essenciais para alterar:**
```env
# Segurança
MYSQL_ROOT_PASSWORD=SuaSenhaRootForte123!
MYSQL_PASSWORD=SuaSenhaUserForte456!
JWT_SECRET=sua_chave_jwt_muito_segura_min_32_caracteres

# Domínios (produção com Traefik)
APP_DOMAIN=musicschool.seudominio.com
API_DOMAIN=api.musicschool.seudominio.com
REACT_APP_API_URL=https://api.musicschool.seudominio.com
FRONTEND_URL=https://musicschool.seudominio.com
```

### 3. Criar rede do Traefik
```bash
docker network create traefik-public
```

### 4. Iniciar aplicação
```bash
chmod +x setup.sh
./setup.sh
```

**OU manualmente:**
```bash
docker-compose up -d --build
```

### 5. Acessar o sistema

**Desenvolvimento local:**
- Frontend: http://localhost
- API: http://localhost:5000

**Produção (com domínios configurados):**
- Frontend: https://musicschool.seudominio.com
- API: https://api.musicschool.seudominio.com

**Credenciais padrão:**
- Email: `admin@musicschool.com`
- Senha: `admin123`

⚠️ **ALTERE A SENHA IMEDIATAMENTE APÓS PRIMEIRO ACESSO!**

---

## ✅ Verificar status

```bash
# Ver todos os containers
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

---

## 🛠️ Comandos úteis

```bash
# Parar aplicação
docker-compose down

# Reiniciar
docker-compose restart

# Rebuild após alterações
docker-compose up -d --build

# Ver uso de recursos
docker stats

# Backup do banco
docker exec music-school-db mysqldump -u root -p music_school > backup.sql

# Restore do banco
docker exec -i music-school-db mysql -u root -p music_school < backup.sql
```

---

## 🔧 Troubleshooting

### Container não inicia

```bash
# Ver logs completos
docker-compose logs

# Remover volumes e reiniciar
docker-compose down -v
docker-compose up -d
```

### Erro de conexão com banco

```bash
# Verificar se o banco está rodando
docker-compose ps mysql

# Aguardar inicialização (pode levar até 30 segundos)
docker-compose logs -f mysql
```

### Frontend não conecta na API

1. Verifique o arquivo `frontend/.env`
2. Certifique-se que `VITE_API_URL` aponta para o backend correto
3. Rebuild do frontend: `docker-compose up -d --build frontend`

### Traefik não encontra os serviços

1. Verifique se a rede existe: `docker network ls | grep traefik`
2. Crie se necessário: `docker network create traefik-public`
3. Verifique os domínios no arquivo `.env`
4. Certifique-se que os DNS estão apontando para seu servidor

---

## 📚 Próximos passos

1. Alterar senha do admin
2. Criar usuários funcionários
3. Cadastrar instrumentos (já vem com 10 pré-cadastrados)
4. Cadastrar professores
5. Criar turmas
6. Matricular alunos
7. Configurar pagamentos mensais

---

## 🆘 Suporte

Para mais informações, consulte o **README.md** completo.

Documentação da API disponível nos endpoints.
