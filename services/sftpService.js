const Client = require('ssh2-sftp-client');
const sanitize = require('../utils/sanitize');

async function uploadPhotosToSFTP(address, files) {
    const sftp = new Client();

    const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';

    const folderName = sanitize(
        `${address.shortName || ''}_${address.city || ''}`
    );

    const remoteDir = `${basePath}/${folderName}`;
    console.log("do tego momentu ok")
    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        // 🔥 tworzy folder (jeśli nie istnieje)
        await sftp.mkdir(remoteDir, true);

        for (let i = 1; i <= 7; i++) {
            const file = files?.[`photo${i}`]?.[0];

            if (!file) continue;

            const ext = file.originalname.split('.').pop() || 'jpg';

            const filename = sanitize(
                `${address.shortName}_photo${i}.${ext}`
            );

            const remotePath = `${remoteDir}/${filename}`;

            await sftp.put(file.buffer, remotePath);

            console.log(`Uploaded: ${remotePath}`);
        }

    } catch (err) {
        console.error('SFTP ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}

module.exports = {
    uploadPhotosToSFTP
};