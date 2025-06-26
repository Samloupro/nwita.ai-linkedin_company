import linkedinCompanyHandler from './handlers/linkedinCompanyHandler.js';

export default {
  async fetch(request, env, ctx) {
    return linkedinCompanyHandler.fetch(request, env, ctx);
  },
};
