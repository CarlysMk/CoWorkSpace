# ===== Build stage =====
FROM node:20-alpine AS build
WORKDIR /app

# copia manifest
COPY package*.json ./
# usa npm install (non ci), perché non c'è package-lock.json
RUN npm install

# copia il resto e builda
COPY . .
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# ===== Runtime Nginx =====
FROM nginx:1.28-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/frontend.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
