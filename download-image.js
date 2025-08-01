import fs from 'fs';
import https from 'https';
import http from 'http';

export function downloadImage(url, filepath) {
   const proto = url.startsWith('https') ? https : http;
   return new Promise((resolve, reject) => {
      proto.get(url, (res) => {
         if (res.statusCode !== 200) {
            reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
            return;
         }
         const fileStream = fs.createWriteStream(filepath);
         res.pipe(fileStream);
         fileStream.on('finish', () => {
            fileStream.close(resolve);
         });
      }).on('error', (err) => {
         reject(err);
      });
   });
}