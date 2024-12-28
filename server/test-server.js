const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello from server!');
});

server.listen(8080, '0.0.0.0', () => {
    console.log('Test server listening on port 8080');
});