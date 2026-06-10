import { runSimulator } from "./simulator.js";

const run = runSimulator({ seed: 42 });

console.log(JSON.stringify(run, null, 2));
