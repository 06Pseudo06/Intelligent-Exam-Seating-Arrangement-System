# Stage 1: Compile Native C++ Optimization Engine
FROM gcc:13-bookworm AS engine-builder
WORKDIR /build/cpp-engine
COPY cpp-engine/ .
RUN g++ -O3 -std=c++17 src/*.cpp -Iinclude -o allocator && \
    chmod +x allocator

# Stage 2: Production Node.js Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Install runtime C++ standard library dependencies
RUN apk add --no-cache libstdc++ gcompat

# Install Node dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy compiled C++ allocator binary from builder
COPY --from=engine-builder /build/cpp-engine/allocator ./cpp-engine/allocator
RUN chmod +x ./cpp-engine/allocator

ENV NODE_ENV=production
ENV PORT=5000
ENV CPP_ALLOCATOR_BIN=/app/cpp-engine/allocator

EXPOSE 5000

CMD ["node", "server.js"]
