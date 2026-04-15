const Client = require('ssh2-sftp-client');
const sanitize = require('../utils/sanitize');
const {PHOTO_NAME_MAP} = require('../constants/enums')
async function uploadPhotosToSFTP(address, files) {
    const sftp = new Client();

    const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';

    const folderName = sanitize(
        `${address.shortName || ''}_${address.city || ''}`
    );

    const remoteDir = `${basePath}/${folderName}`;
    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        // 🔥 tworzy folder (jeśli nie istnieje)
        await sftp.mkdir(remoteDir, true);

        for (let group = 1; group <= 6; group++) {
            for (let index = 1; index <= 3; index++) {
                const key = `photo${group}_${index}`;
                const file = files?.[key]?.[0];

                if (!file) continue;

                const ext = file.originalname.split('.').pop() || 'jpg';
                const mappedName = PHOTO_NAME_MAP[key] || key;
                const filename = sanitize(`${address.shortName}_${mappedName}.${ext}`);
                const remotePath = `${remoteDir}/${filename}`;

                await sftp.put(file.buffer, remotePath);
            }
        }

        const buildingPlan = files?.photo7?.[0];
        if (buildingPlan) {
            const ext = buildingPlan.originalname.split('.').pop() || 'jpg';
            const mappedName = PHOTO_NAME_MAP.photo7;
            const filename = sanitize(`${address.shortName}_${mappedName}.${ext}`);
            const remotePath = `${remoteDir}/${filename}`;

            await sftp.put(buildingPlan.buffer, remotePath);
        }

    } catch (err) {
        console.error('SFTP ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}
async function uploadSignedToSFTP(address, file) {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();

    const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';

    const folderName = sanitize(
        `${address.shortName}_${address.city}`
    );

    const remoteDir = `${basePath}/${folderName}`;

    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        await sftp.mkdir(remoteDir, true);

        const filename = `SIGNED_${address.shortName}.pdf`;

        const remotePath = `${remoteDir}/${filename}`;

        await sftp.put(file.buffer, remotePath);

        console.log('Uploaded signed PDF:', remotePath);

    } catch (err) {
        console.error('SFTP PDF ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}
async function downloadSignedFromSFTP(address) {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();

    const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';

    const folderName = sanitize(
        `${address.shortName}_${address.city}`
    );

    const remotePath = `${basePath}/${folderName}/SIGNED_${address.shortName}.pdf`;

    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        const exists = await sftp.exists(remotePath);

        if (!exists) {
            return null;
        }

        const buffer = await sftp.get(remotePath);

        return buffer;

    } catch (err) {
        console.error('SFTP DOWNLOAD ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}

async function uploadSupplementDocxToSFTP(address, buffer) {
    const sftp = new Client();

    const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';
    const folderName = sanitize(`${address.shortName}_${address.city}`);
    const remoteDir = `${basePath}/${folderName}`;

    const fileName = `SOIA_2026_UMK_${sanitize(address.shortName)}.docx`;
    const remotePath = `${remoteDir}/${fileName}`;

    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        await sftp.mkdir(remoteDir, true);
        await sftp.put(buffer, remotePath);

        return {
            remotePath,
            fileName
        };
    } catch (err) {
        console.error('SFTP DOCX ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}
async function downloadSupplementDocxFromSFTP(address, storedPath = '') {
    const sftp = new Client();

    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS
        });

        let remotePath = storedPath;

        if (!remotePath) {
            const basePath = '/Dzial_Techniczny/SOIA/Aplikacja SOIA';
            const folderName = sanitize(`${address.shortName}_${address.city}`);
            const shortNamePart = sanitize(address.shortName || 'obiekt');
            const safeFileName = `SOIA_2026_UMK_${shortNamePart}.docx`;
            remotePath = `${basePath}/${folderName}/${safeFileName}.docx`;
        }

        const exists = await sftp.exists(remotePath);

        if (!exists) {
            return null;
        }

        const buffer = await sftp.get(remotePath);
        return buffer;
    } catch (err) {
        console.error('SFTP DOCX DOWNLOAD ERROR:', err);
        throw err;
    } finally {
        sftp.end();
    }
}
module.exports = {
    uploadSupplementDocxToSFTP,
    downloadSupplementDocxFromSFTP,
    uploadPhotosToSFTP,
    uploadSignedToSFTP,
    downloadSignedFromSFTP
};
