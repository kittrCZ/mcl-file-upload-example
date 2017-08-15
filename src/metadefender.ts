import * as popsicle from 'popsicle';
import * as fs from 'fs'

// Metadefender Cloud Configuration
// Obtain your API key on: https://www.metadefender.com/
const MDCLOUD_FILE_UPLOAD_API = 'https://api.metadefender.com/v2/file'
const MDCLOUD_API_KEY = '6a47bf3323028adf83026c55313ff04c' 

// API Documentation: https://www.metadefender.com/public-api#!/scanning-a-file-by-file-upload
const fileUpload = async function (file) {
    console.log(`Uploading file to ${MDCLOUD_FILE_UPLOAD_API}`);

    let file_body = fs.readFileSync(file.path);

    return await popsicle.post({
        url: MDCLOUD_FILE_UPLOAD_API,
        headers: {
            apikey: MDCLOUD_API_KEY,
            filename: file.originalname,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: file_body
    }).use(popsicle.plugins.parse(['json']));
}

// API Documentation: https://www.metadefender.com/public-api#!/retrieve-scan-report-using-data-id
const getScanResult = async function (dataId) {
    console.log(`Retrieving analysis result for file ${dataId}`);
    
    return await popsicle.get({
        url: `${MDCLOUD_FILE_UPLOAD_API}/${dataId}`,
        headers: {
            apikey: MDCLOUD_API_KEY
        }
    }).use(popsicle.plugins.parse(['json']));
};

export { fileUpload, getScanResult }