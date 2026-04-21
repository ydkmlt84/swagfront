FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend
COPY frontend ./frontend

RUN yarn install --immutable
RUN yarn workspace @swagfront/shared build
RUN yarn workspace @swagfront/backend build
RUN yarn workspace @swagfront/frontend build

FROM node:22-alpine
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY backend/package.json ./backend/package.json

EXPOSE 5559

CMD ["node", "backend/dist/index.js"]
