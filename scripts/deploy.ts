import * as dot from 'dotenv';
import { readdirSync,lstatSync } from 'fs';
dot.config();
import { Client } from 'basic-ftp';

const disFolder = './../dist/';

async function upload() {
    const client = new Client();
    try {
        await client.access({
            host: process.env.HOST,
            user: process.env.USER,
            password: process.env.PASSWORD,
            secure: process.env.SECURE === 'false' ? false : true,
        });
        const latestFiles = readdirSync(disFolder);
        for (const file of latestFiles) {
            if(lstatSync(disFolder + file).isDirectory() ) continue;
            if(file.startsWith('builder')) continue;
            console.log('Uploading: ' + file);
            await client.uploadFrom(disFolder + file, process.env.UPLOAD_PATH + '/' + file);
        }
    }
    catch(err) {
        console.log(err);
    }
    client.close();
}

await upload();