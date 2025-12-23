"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
the;
problem;
var express_1 = require("express");
var body_parser_1 = require("body-parser");
var health_1 = require("./api/health");
var spot_1 = require("./api/spot");
var app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.get('/', function (req, res) {
    res.send('Ok');
});
app.get('/health', health_1.health);
app.post('/spot', spot_1.spot);
var port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("Relayer listening on port ".concat(port));
});
