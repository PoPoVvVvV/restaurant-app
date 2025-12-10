FROM node:18-slim

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source from backend directory
COPY backend/ .

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]