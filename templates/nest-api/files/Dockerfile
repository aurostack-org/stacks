# Stage 1: Build
FROM aurostack.org/wesnetech/nodejs:24 AS build
WORKDIR /app

COPY package.json ./
RUN yarn install --immutable

COPY tsconfig*.json nest-cli.json prisma.config.ts ./
COPY .bin ./.bin
COPY prisma ./prisma
RUN yarn db:generate

COPY src ./src
COPY public ./public
COPY emails ./emails
RUN yarn build

# Remove dev dependencies after build is done
RUN yarn install --production

# Stage 2: Production
FROM aurostack.org/wesnetech/nodejs:24
WORKDIR /app

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma

EXPOSE 5020

CMD ["node", "dist/src/main"]