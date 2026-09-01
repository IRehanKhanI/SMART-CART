import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(
      `Retail Operations Command running at http://localhost:${port}`,
    );
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
