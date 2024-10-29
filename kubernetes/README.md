# Coordination Network - Kubernetes config

This is an example of how to run Coordination Network in Kubernetes.

## Setting it up

1. Copy the secrets template and replace the values:

   ```bash
   cp kubernetes/secrets-template.yaml kubernetes/secrets.yaml
   ```

   You can encode your secrets using:

   ```bash
   echo -n 'your-secret-value' | base64
   ```

2. Apply the configs

   ```bash
   kubectl apply -k .
   ```

## Updates

If you make changes to the config or there are new images you can restart using:

```
kubectl rollout restart deployment/django -n coordnet
kubectl rollout restart deployment/celeryworker -n coordnet
kubectl rollout restart deployment/celerybeat -n coordnet
kubectl rollout restart deployment/pubsub -n coordnet
kubectl rollout restart deployment/crdt -n coordnet
```
