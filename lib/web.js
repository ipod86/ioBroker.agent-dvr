'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
};

const WWW   = path.join(__dirname, '..', 'www');
const ROUTE = 'agent-dvr';

class AgentDvrWeb {
    constructor(server, webSettings, adapter, instanceSettings, app) {
        this.app     = app;
        this.adapter = adapter;

        app.use('/' + ROUTE, (req, res) => {
            let rel = (req.url || '/').split('?')[0];
            if (rel === '/' || rel === '') rel = '/index.html';

            const file = path.resolve(path.join(WWW, rel));

            if (!file.startsWith(WWW + path.sep) && file !== path.join(WWW, 'index.html')) {
                res.status(403).end();
                return;
            }

            fs.readFile(file, (err, data) => {
                if (err) { res.status(404).end('Not found'); return; }
                const ext = path.extname(file).toLowerCase();
                res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
                res.end(data);
            });
        });

        adapter.log.info('[agent-dvr] Web UI: /' + ROUTE + '/');
    }

    unload() { return Promise.resolve(); }

    welcomePage() {
        return {
            link:  ROUTE + '/',
            name:  'AgentDVR',
            img:   'adapter/agent-dvr/agent-dvr.png',
            color: '#2196f3',
            order: 10,
        };
    }
}

module.exports = AgentDvrWeb;
