# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCKS=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1
