FROM node:18-alpine
WORKDIR /usr/src/app

# Copia apenas package.json primeiro
COPY package*.json ./

# Verifica se package.json existe
RUN if [ ! -f package.json ]; then echo "ERROR: package.json not found!" && exit 1; fi

# Instala dependências (com fallback se package-lock.json não existir)
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production; \
    else \
      npm install --only=production; \
    fi

# Copia o resto do código
COPY . .

# Cria usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000
CMD ["node", "server.js"]
