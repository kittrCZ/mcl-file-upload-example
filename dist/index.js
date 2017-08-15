"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const Loki = require("lokijs");
const fs = require("fs");
const sleep = require("sleep-promise");
const utils_1 = require("./src/utils");
const metadefender = require("./src/metadefender");
const DB_NAME = 'uploaded_files.json';
const COLLECTION_NAME = 'files';
const UPLOAD_PATH = 'uploads';
const upload = multer({ dest: `${UPLOAD_PATH}/` });
const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });
const app = express();
app.use(cors());
app.set('port', (process.env.PORT || 3000));
app.get('/api/up', (req, res) => {
    res.status(200).json({ status: 'up' });
});
app.post('/api/file', upload.single('file'), (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        let fileScan;
        const col = yield utils_1.loadCollection(COLLECTION_NAME, db);
        // Sending file for analysis
        let fileUpload = yield metadefender.fileUpload(req.file);
        let dataId = (fileUpload && fileUpload.body && fileUpload.body.data_id) ? fileUpload.body.data_id : '';
        if (dataId) {
            console.log(`File queued for scanning. Queue position: ${fileUpload.body.in_queue}`);
        }
        else {
            return res.status(400).json({ error: 'File not uploaded to Metadefender Cloud' });
        }
        do {
            fileScan = yield metadefender.getScanResult(dataId);
            yield sleep(1000); // Ask for scan result every second
        } while (fileScan && fileScan.body && fileScan.body.scan_results.progress_percentage != 100);
        // Store data about scan result
        const data = col.insert(req.file);
        db.saveDatabase();
        // Send Response to the server
        res.status(200).json({
            id: data.$loki,
            fileName: data.filename,
            originalName: data.originalname,
            metadefender_cloud: fileScan.body
        });
    }
    catch (err) {
        console.log(err);
        res.sendStatus(400);
    }
}));
app.get('/api/files', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const col = yield utils_1.loadCollection(COLLECTION_NAME, db);
        res.send(col.data);
    }
    catch (err) {
        res.sendStatus(400);
    }
}));
app.get('/api/files/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
    try {
        const col = yield utils_1.loadCollection(COLLECTION_NAME, db);
        const result = col.get(req.params.id);
        if (!result) {
            res.sendStatus(404);
            return;
        }
        ;
        res.setHeader('Content-Type', result.mimetype);
        fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    }
    catch (err) {
        res.sendStatus(400);
    }
}));
// Helper API: clean all data from uploads folder & cleanup database
app.delete('/api/files', (req, res) => {
    utils_1.cleanFolder(UPLOAD_PATH);
    res.sendStatus(200);
});
app.listen(app.get('port'), function () {
    console.log(`Starting web server on port ${app.get('port')}`);
});
//# sourceMappingURL=index.js.map