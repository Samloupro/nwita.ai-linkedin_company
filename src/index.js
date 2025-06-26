import mainHandler from './handlers/mainHandler.js';

export default {
  async fetch(request, env, ctx) {
    return mainHandler.fetch(request, env, ctx);
  },
};
