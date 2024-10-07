# Coordination.network Front-end

## Structure

The front-end code consists of two apps:

- `frontend/app` - the main UI, a React application using Vite for development
- `frontend/packages/coordnet-hocuspocus` - the CRDT WebSocket API built on top of [HocusPocus](https://github.com/ueberdosis/hocuspocus)

The front-end uses a `pnpm` workspace to share packages between the two front-end apps.
