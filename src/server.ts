import { startServer } from "./app";

startServer().catch((error) => {
  console.error("Failed to start SalonBook API:", error);
  process.exit(1);
});
