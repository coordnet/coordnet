# This was copied from https://github.com/edoburu/docker-pgbouncer/blob/4afb4a755969647d15eb89c3bc8a4dc2e46322b1/Dockerfile
# and modified to use the latest version of pgbouncer and alpine 3.20. This also includes the
# entrypoint.sh script. The License for the original Dockerfile and entrypoint.sh is MIT:
# https://github.com/edoburu/docker-pgbouncer/blob/4afb4a755969647d15eb89c3bc8a4dc2e46322b1/LICENSE
# We also replaced the DNS resolver (udns) with c-ares because we need IPv6 support.

FROM alpine:3.20
ARG VERSION=1.24.1

# Inspiration from https://github.com/gmr/alpine-pgbouncer/blob/master/Dockerfile
# hadolint ignore=DL3003,DL3018
RUN \
  # security
  apk add -U --no-cache --upgrade busybox && \
  # Download
  apk add -U --no-cache autoconf autoconf-doc automake c-ares c-ares-dev curl gcc libc-dev libevent libevent-dev libtool make openssl-dev pkgconfig postgresql-client && \
  curl -o  /tmp/pgbouncer-$VERSION.tar.gz -L https://pgbouncer.github.io/downloads/files/$VERSION/pgbouncer-$VERSION.tar.gz && \
  cd /tmp && \
  # Unpack, compile
  tar xvfz /tmp/pgbouncer-$VERSION.tar.gz && \
  cd pgbouncer-$VERSION && \
  ./configure --prefix=/usr --with-cares --disable-evdns && \
  make && \
  # Manual install
  cp pgbouncer /usr/bin && \
  mkdir -p /etc/pgbouncer /var/log/pgbouncer /var/run/pgbouncer && \
  # entrypoint installs the configuration, allow to write as postgres user
  cp etc/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.example && \
  cp etc/userlist.txt /etc/pgbouncer/userlist.txt.example && \
  touch /etc/pgbouncer/userlist.txt && \
  chown -R postgres /var/log/pgbouncer /var/run/pgbouncer /etc/pgbouncer && \
  # Cleanup
  cd /tmp && \
  rm -rf /tmp/pgbouncer*  && \
  apk del --purge autoconf autoconf-doc automake c-ares-dev curl gcc libc-dev libevent-dev libtool make openssl-dev pkgconfig && \
  rm -rf /var/cache/apk/*

COPY ./compose/pgbouncer/entrypoint.sh /entrypoint.sh
USER postgres
EXPOSE 5432
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/pgbouncer", "/etc/pgbouncer/pgbouncer.ini"]
