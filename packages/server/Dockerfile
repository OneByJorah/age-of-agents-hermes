FROM node:22-alpine

WORKDIR /app

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy package files (monorepo root context)
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json

# Install dependencies
RUN npm ci --workspace=@agent-citadel/shared --workspace=@agent-citadel/server

# Copy source
COPY packages/shared packages/shared
COPY packages/server packages/server

# Build
RUN npm run build --workspace=@agent-citadel/server

EXPOSE 5173

CMD ["npm", "run", "start", "--workspace=@agent-citadel/server"]
