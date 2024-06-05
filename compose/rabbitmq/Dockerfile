FROM rabbitmq:3-management

# TODO: Now in entrypoint
# these flags will be used by RabbitMQ nodes
#ENV RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS="-kernel inetrc '/etc/rabbitmq/erl_inetrc' -proto_dist inet6_tcp --longnames -name rabbit@$(hostname -f | sed 's/\./-/g').vm.coordnet-rabbitmq.internal"

# these flags will be used by CLI tools
ENV RABBITMQ_CTL_ERL_ARGS="-proto_dist inet6_tcp --longnames"

#ENV ERL_EPMD_ADDRESS="::"
ENV RABBITMQ_USE_LONGNAME=true

COPY ./compose/rabbitmq/erl_inetrc /etc/rabbitmq/erl_inetrc
COPY ./compose/rabbitmq/prod.conf /etc/rabbitmq/rabbitmq.conf
COPY ./compose/rabbitmq/entrypoint /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Because this is not managed, we need to manually join the cluster
# rabbitmqctl join_cluster rabbit@xxx
# rabbitmqctl add_user celery xxx
# rabbitmqctl add_vhost celery
