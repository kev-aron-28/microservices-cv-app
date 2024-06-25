# Usa una imagen base de Node.js
FROM node:20-alpine as base

# Establece el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json .

# Instala las dependencias
RUN npm install

# Copia el resto de la aplicación
COPY . .

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
