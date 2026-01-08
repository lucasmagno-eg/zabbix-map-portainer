FROM node:18-alpine

WORKDIR /app

# Copiar APENAS os arquivos de dependência primeiro (para melhor cache)
COPY package*.json ./

# Verificar se package.json existe e é válido
RUN echo "Verificando package.json..." && \
    cat package.json && \
    echo "Instalando dependências..." && \
    npm ci --only=production --silent

# Copiar o resto do código fonte
COPY src/ ./src/

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "src/server.js"]
