#!/bin/bash

echo "🎵 Music School - Setup Script"
echo "================================"
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose encontrados"
echo ""

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    echo "📝 Arquivo .env não encontrado. Criando a partir do .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env e configure suas variáveis antes de continuar!"
    echo ""
    read -p "Pressione ENTER após configurar o .env ou Ctrl+C para sair..."
fi

echo "🐳 Verificando rede do Traefik..."
if ! docker network inspect traefik-public &> /dev/null; then
    echo "📡 Criando rede traefik-public..."
    docker network create traefik-public
    echo "✅ Rede criada com sucesso"
else
    echo "✅ Rede traefik-public já existe"
fi

echo ""
echo "🏗️  Construindo e iniciando containers..."
docker-compose up -d --build

echo ""
echo "⏳ Aguardando inicialização do banco de dados..."
sleep 10

echo ""
echo "✅ Setup concluído!"
echo ""
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "🌐 Acesso ao sistema:"
echo "   Frontend: Configurado no Traefik"
echo "   Backend API: Configurado no Traefik"
echo ""
echo "👤 Credenciais padrão:"
echo "   Email: admin@musicschool.com"
echo "   Senha: admin123"
echo ""
echo "⚠️  Lembre-se de alterar a senha padrão após o primeiro acesso!"
echo ""
echo "📝 Comandos úteis:"
echo "   Ver logs: docker-compose logs -f"
echo "   Parar: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
