FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY ../../package.json ../../package-lock.json* ./
COPY ../../packages/shared/package.json ../../packages/shared/package.json

# Install dependencies
RUN npm ci --workspace=@agent-citadel/shared --workspace=@agent-citadel/client

# Copy source
COPY ../../packages/shared ../../packages/shared
COPY ../../packages/client ../../packages/client

# Build
RUN npm run build --workspace=@agent-citadel/client

EXPOSE 3000

CMD ["npm", "run", "preview", "--workspace=@agent-citadel/client"]