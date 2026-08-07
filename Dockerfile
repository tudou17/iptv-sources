
# --- 第一阶段：获取静态二进制（供 crond 使用）---
FROM busybox:stable-musl AS toolchain

# 阶段 2: 编译极简 nginx
FROM debian:bookworm-slim AS nginx-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG NGINX_VERSION=1.28.2
RUN wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar -zxvf nginx-${NGINX_VERSION}.tar.gz && \
    cd nginx-${NGINX_VERSION} && \
    ./configure \
      --prefix=/usr/share/nginx \
      --sbin-path=/usr/sbin/nginx \
      --conf-path=/etc/nginx/nginx.conf \
      --pid-path=/var/run/nginx.pid \
      --lock-path=/var/run/nginx.lock \
      --http-log-path=/var/log/nginx/access.log \
      --error-log-path=/var/log/nginx/error.log \
      --without-http_gzip_module \
      --without-http_rewrite_module \
      --without-http_autoindex_module \
      --without-http_access_module \
      --without-http_auth_basic_module \
      --without-http_geo_module \
      --without-http_map_module \
      --without-http_proxy_module \
      --without-http_fastcgi_module \
      --without-http_uwsgi_module \
      --without-http_scgi_module \
      --without-http_grpc_module \
      --without-http_upstream_hash_module \
      --without-http_upstream_ip_hash_module \
      --without-http_upstream_least_conn_module \
      --without-http_upstream_random_module \
      --without-http_upstream_keepalive_module \
      --without-http_upstream_zone_module \
      --without-http_memcached_module \
      --without-http_empty_gif_module \
      --without-http_browser_module \
      --without-mail_pop3_module \
      --without-mail_imap_module \
      --without-mail_smtp_module \
      --without-pcre \
      --without-pcre2 \
      && make -j$(nproc) && make install

FROM yunnysunny/node AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --production

FROM prod-deps AS builder
RUN pnpm install
COPY . .
RUN pnpm build && pnpm m3u && pnpm static

FROM yunnysunny/node AS runner
WORKDIR /app
COPY --from=toolchain /bin/busybox /usr/local/bin/busybox
RUN mkdir -p /var/spool/cron/crontabs && \
    echo "0 */2 * * * cd /app && /usr/local/bin/node /app/dist/index.js && cp -r public/* m3u/ >> /proc/1/fd/1 2>&1" \
    > /var/spool/cron/crontabs/root
COPY --from=nginx-builder /usr/sbin/nginx /usr/sbin/nginx
COPY --from=nginx-builder /etc/nginx /etc/nginx
COPY --from=nginx-builder /usr/share/nginx /usr/share/nginx
RUN mkdir -p /var/log/nginx /var/run /var/cache/nginx \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/m3u ./m3u/
COPY --from=builder /app/public ./public/
COPY --from=builder /app/package.json \
/app/LIST.temp.md \
/app/README.temp.md ./
COPY --from=prod-deps /app/node_modules ./node_modules/
COPY docker/entrypoint.sh /app/entrypoint.sh
COPY docker/gen-config.mjs /app/gen-config.mjs
RUN chmod +x /app/entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/app/entrypoint.sh"]
