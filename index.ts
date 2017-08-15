import * as express from 'express'
import * as multer from 'multer'
import * as cors from 'cors'
import * as path from 'path'
import * as Loki from 'lokijs'
import * as fs from 'fs'
import * as sleep from 'sleep-promise'

import { loadCollection, cleanFolder } from './src/utils'
import * as metadefender from './src/metadefender'

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
})

app.post('/api/file', upload.single('file'), async (req, res) => {
    try {
        
        let fileScan;
        const col = await loadCollection(COLLECTION_NAME, db);

        // Sending file for analysis
        let fileUpload = await metadefender.fileUpload(req.file);
        let dataId = (fileUpload && fileUpload.body && fileUpload.body.data_id) ? fileUpload.body.data_id : '';

        if(dataId){
            console.log(`File queued for scanning. Queue position: ${fileUpload.body.in_queue}`);
        } else {
            return res.status(400).json({ error: 'File not uploaded to Metadefender Cloud'});
        }

        do {
            fileScan = await metadefender.getScanResult(dataId);
            await sleep(1000); // Ask for scan result every second
        } while (fileScan && fileScan.body && fileScan.body.scan_results.progress_percentage != 100)

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
    } catch (err) {
        console.log(err);
        res.sendStatus(400);
    }
})

app.get('/api/files', async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        res.send(col.data);
    } catch (err) {
        res.sendStatus(400);
    }
})

app.get('/api/files/:id', async (req, res) => {
    try {
        const col = await loadCollection(COLLECTION_NAME, db);
        const result = col.get(req.params.id);

        if (!result) {
            res.sendStatus(404);
            return;
        };

        res.setHeader('Content-Type', result.mimetype);
        fs.createReadStream(path.join(UPLOAD_PATH, result.filename)).pipe(res);
    } catch (err) {
        res.sendStatus(400);
    }
})

// Helper API: clean all data from uploads folder & cleanup database
app.delete('/api/files', (req, res) => {
    cleanFolder(UPLOAD_PATH);
    res.sendStatus(200);
})

app.listen(app.get('port'), function() {
    console.log(`Starting web server on port ${app.get('port')}`);
});