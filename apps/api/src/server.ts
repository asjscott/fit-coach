import { buildApp } from "./app";
import { initErrorReporting } from "./error-reporting";

initErrorReporting();

const app = await buildApp({ logger: true });

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
