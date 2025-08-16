# Build stage
FROM node:20 AS build

WORKDIR /src

COPY package*.json ./

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the Angular application
RUN ng build --configuration=production

# Production stage
FROM nginx:1.21-alpine

# Copy the build output to the Nginx html directory
COPY --from=build /src/dist/skote /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 4200
EXPOSE 4200

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
