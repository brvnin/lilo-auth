# Stage 1: Build React Frontend
FROM node:20-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Python Backend
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ ./backend

# Copy Built Frontend Assets from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set working directory to backend
WORKDIR /app/backend

# Expose port (Railway sets PORT env var)
ENV PORT=5000
EXPOSE $PORT

# Run Gunicorn
# bind to 0.0.0.0:$PORT
CMD gunicorn app:app --bind 0.0.0.0:$PORT
