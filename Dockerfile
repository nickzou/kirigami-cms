# Kirigami in a container: `kirigami dev` (the admin, with a live preview) on
# the markdown folder mounted at /content.
#
#   docker build -t kirigami .
#   docker run --rm -p 3000:3000 -v "$PWD/my-site:/content" kirigami
#
# Then open http://localhost:3000/admin/. There is no sign-in yet, so publish the
# port to this machine only (as above) and do not expose it to a network.

FROM node:24-slim AS build
WORKDIR /app
# The pnpm that package.json names.
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# The server and CLI to dist/, and the admin to dist/admin.
RUN pnpm build
# Leave only what running needs.
RUN pnpm prune --prod

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/schema ./schema
# The site's markdown. Mount your own folder here.
RUN mkdir /content && chown node:node /content
VOLUME /content
EXPOSE 3000
USER node
# 0.0.0.0 so the published port reaches it from outside the container.
CMD ["node", "dist/cli/main.js", "dev", "/content", "--host", "0.0.0.0", "--port", "3000"]
