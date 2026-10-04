# Production Dockerfile for Google Cloud Run deployment
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY package.json ./

# Copy all application assets
COPY server.js ./
COPY index.html ./
COPY assets ./assets

# Cloud Run defaults to PORT 8080
ENV PORT=8080
EXPOSE 8080

# Start static server
CMD ["node", "server.js"]
