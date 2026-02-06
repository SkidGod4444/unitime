import { Hono } from "hono";

const history = new Hono();

history.get("/", (c) => {
  return c.json({
    message: "History route",
  });
});

export default history;
