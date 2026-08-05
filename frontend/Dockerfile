# 1. Start from official Node.js v22 base image
FROM node:22-alpine

# 2. Set the internal working directory
WORKDIR /usr/src/app

# 3. Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the frontend source code
COPY . .

# 5. Expose Vite's default dev port
EXPOSE 5173

# 6. Run Vite dev server bound to all interfaces so you can access it externally
CMD ["npm", "run", "dev", "--", "--host"]
