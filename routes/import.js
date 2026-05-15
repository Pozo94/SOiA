const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const Address = require('../models/Address');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

const router = express.Router();

const uploadExcel = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream'
        ];

        if (
            allowedMimeTypes.includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.xlsx')
        ) {
            cb(null, true);
        } else {
            cb(new Error('Dozwolone są tylko pliki .xlsx'));
        }
    }
});

function normalizeValue(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function normalizeHeader(value) {
    return normalizeValue(value);
}

function rowToObject(headers, row) {
    const obj = {};

    headers.forEach((header, index) => {
        obj[header] = normalizeValue(row[index]);
    });

    return obj;
}

function validateRow(row, rowNumber) {
    const errors = [];

    if (!row.shortName) errors.push(`Wiersz ${rowNumber}: brak shortName`);
    if (!row.title) errors.push(`Wiersz ${rowNumber}: brak title`);
    if (!row.address) errors.push(`Wiersz ${rowNumber}: brak address`);
    if (!row.category) errors.push(`Wiersz ${rowNumber}: brak category`);
    if (!row.city) errors.push(`Wiersz ${rowNumber}: brak city`);

    return errors;
}

router.get('/addresses/import', isLoggedIn, isAdmin, (req, res) => {
    res.render('import/addresses', {
        title: 'Import adresów',
        errors: [],
        summary: null
    });
});

router.post(
    '/addresses/import',
    isLoggedIn,
    isAdmin,
    uploadExcel.single('excelFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                req.flash('error', 'Nie wybrano pliku Excel.');
                return res.redirect('/import/addresses/import');
            }

            const workbook = XLSX.read(req.file.buffer, {
                type: 'buffer'
            });

            const sheetName = workbook.SheetNames[0];

            const rows = XLSX.utils.sheet_to_json(
                workbook.Sheets[sheetName],
                {
                    header: 1,
                    defval: ''
                }
            );
            const filteredRows = rows.filter(row =>
                row.some(cell => String(cell).trim() !== '')
            );

            if (!rows || rows.length < 2) {
                return res.render('import/addresses', {
                    title: 'Import adresów',
                    errors: ['Plik nie zawiera danych do importu.'],
                    summary: null
                });
            }

            const headers = filteredRows[0];

            const requiredHeaders = [
                'shortName',
                'title',
                'address',
                'soundEmissionPattern',
                'azimuth',
                'power',
                'latitude',
                'longitude',
                'volume',
                'category',
                'sirenType',
                'city'
            ];

            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

            if (missingHeaders.length) {
                return res.render('import/addresses', {
                    title: 'Import adresów',
                    errors: [
                        `Brakuje kolumn: ${missingHeaders.join(', ')}`
                    ],
                    summary: null
                });
            }

            const errors = [];
            const addressesToCreate = [];
            let skippedDuplicates = 0;
            let skippedEmpty = 0;

            for (let i = 1; i < rows.length; i++) {
                const rowNumber = i + 1;
                const row = rowToObject(headers, rows[i]);

                const isEmptyRow = Object.values(row).every(value => !value);

                if (isEmptyRow) {
                    skippedEmpty++;
                    continue;
                }

                const rowErrors = validateRow(row, rowNumber);

                if (rowErrors.length) {
                    errors.push(...rowErrors);
                    continue;
                }

                const existingAddress = await Address.findOne({
                    shortName: row.shortName
                });

                if (existingAddress) {
                    skippedDuplicates++;
                    continue;
                }

                addressesToCreate.push({
                    shortName: row.shortName,
                    title: row.title,
                    address: row.address,
                    soundEmissionPattern: row.soundEmissionPattern || '',
                    azimuth: row.azimuth || '',
                    power: row.power || '',
                    latitude: row.latitude || '',
                    longitude: row.longitude || '',
                    volume: row.volume || '',
                    category: row.category,
                    sirenType: row.sirenType || 'Gibon',
                    city: row.city
                });
            }

            if (errors.length) {
                return res.render('import/addresses', {
                    title: 'Import adresów',
                    errors,
                    summary: {
                        prepared: addressesToCreate.length,
                        skippedDuplicates,
                        skippedEmpty
                    }
                });
            }

            if (addressesToCreate.length) {
                await Address.insertMany(addressesToCreate);
            }

            return res.render('import/addresses', {
                title: 'Import adresów',
                errors: [],
                summary: {
                    imported: addressesToCreate.length,
                    skippedDuplicates,
                    skippedEmpty
                }
            });
        } catch (error) {
            console.error(error);

            return res.render('import/addresses', {
                title: 'Import adresów',
                errors: ['Nie udało się zaimportować pliku. Sprawdź format Excela.'],
                summary: null
            });
        }
    }
);

module.exports = router;