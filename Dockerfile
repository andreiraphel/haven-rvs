# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Add build arguments for Next.js public env vars
# These names match the Cloud Build substitution variables exactly
ARG _NEXT_PUBLIC_SUPABASE_URL
ARG _NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG _NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Map them to the internal Next.js environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=$_NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$_NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p public
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080
CMD ["node", "server.js"]
