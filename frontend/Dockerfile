# Estágio de construção
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias
RUN apk add --no-cache curl

# Copiar arquivos estáticos
COPY src/ ./src/

# Estágio de produção
FROM nginx:alpine

# Remover configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração personalizada
COPY nginx.conf /etc/nginx/conf.d/

# Copiar arquivos estáticos do estágio builder
COPY --from=builder /app/src /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Expor porta
EXPOSE 80

# Comando de inicialização
CMD ["nginx", "-g", "daemon off;"]
