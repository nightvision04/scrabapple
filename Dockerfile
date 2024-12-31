# Base image (use a specific version for stability)
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# --- Build Stage ---
FROM base AS build

# Copy package.json and lock files for both client and server
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for both client and server
RUN npm install --prefix ./client
RUN npm install --prefix ./server

# Copy client and server code
COPY client ./client
COPY server ./server

# Build client (React)
RUN npm run build --prefix ./client

# --- Production Stage ---
FROM base AS production

# Copy built client files from the build stage
COPY --from=build /app/client/build ./client/build

# Copy server files
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./

# Install only production dependencies for the server
RUN npm install --omit=dev --prefix ./server

# Expose the port (Heroku sets the PORT environment variable)
EXPOSE ${PORT}

# Start the server (use node directly)
CMD ["node", "server/server.js"]