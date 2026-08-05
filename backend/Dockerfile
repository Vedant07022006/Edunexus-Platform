# 1. Start from official Node.js v22 base image (matching your v22.13.0)
FROM node:22-alpine

# 2. Set the internal working directory
WORKDIR /usr/src/app

# 3. Copy package description files
COPY package*.json ./

# 4. Install npm dependencies
RUN npm install

# 5. Copy the rest of the backend source code
COPY . .

# 6. Expose backend port 8000
EXPOSE 8000

# 7. Command to start the application
CMD ["node", "src/index.js"]
