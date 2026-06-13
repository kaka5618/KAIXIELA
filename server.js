const http = require("http");

const port = Number(process.env.PORT) || 80;

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    sendJson(res, 200, {
      status: "ok",
      service: "kaixiela-cloudbase-service",
      message: "开写啦小程序云托管构建入口正常"
    });
    return;
  }

  sendJson(res, 404, {
    status: "not_found",
    message: "This service is only used as the CloudBase container build entry."
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Kaixiela CloudBase service listening on ${port}`);
});
