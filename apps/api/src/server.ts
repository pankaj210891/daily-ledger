import app from "./app.js";
import { env } from "./config.js";
const onListen = () => console.log(`Daily Ledger API listening on ${env.PORT}`);
if (env.NODE_ENV === "development") app.listen(env.PORT, "0.0.0.0", onListen);
else app.listen(env.PORT, onListen);
