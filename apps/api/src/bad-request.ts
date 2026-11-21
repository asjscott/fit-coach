// A 400 for a rule a route's schema can't check, thrown so Fastify answers it as it does a request that fails its
// schema, message included. Declaring a 400 response schema instead would strip the message from those too
export const badRequest = (message: string) => Object.assign(new Error(message), { statusCode: 400 });
