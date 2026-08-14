# Stage 1: Build
FROM aurostack.org/wesnetech/nodejs:24 AS build

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --network-timeout 300000 --network-concurrency 1

COPY tsconfig*.json prisma.config.ts ./
COPY .bin ./.bin
COPY prisma ./prisma
RUN yarn db:generate

COPY src ./src
RUN yarn build

# Remove dev dependencies after build is done
RUN yarn install --production

# Stage 2: Production
FROM aurostack.org/wesnetech/nodejs:24
WORKDIR /app

RUN apk update
RUN apk add --no-cache \
	chromium \
	nss \
	freetype \
	harfbuzz \
	ca-certificates \
	ttf-freefont \
	udev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
	PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json ./
COPY ecosystem.config.cjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD [ "pm2-runtime", "start", "ecosystem.config.cjs" ]