const express = require('express');
const { body, validationResult } = require('express-validator');
const { uploadPhotosToSFTP,uploadSignedToSFTP,downloadSignedFromSFTP } = require('../services/sftpService');
const Address = require('../models/Address');
const User = require('../models/User');
const { isLoggedIn, canEditAssignedAddress,isAdmin } = require('../middleware/auth');
const {
    ROOF_COVERING,
    PASSAGE_METHOD,
    SIREN_MOUNTING,
    GROUND_TYPE,
    CONNECTION_TYPE,
    GSM_MOUNTING
} = require('../constants/enums.js');
const { generateSupplementDocx } = require('../services/docxService');
const riskValidators = [
    body('riskReason')
        .trim()
        .notEmpty()
        .withMessage('Podaj opis problemu.')
];
function generateObjectNumber(address) {
    const year = new Date().getFullYear();

    const cleanShortName = (address.shortName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toUpperCase();

    return `SOIA_${year}_UMK_${cleanShortName}`;
}

const router = express.Router();
const multer = require('multer');
const uploadSigned = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
const uploadPhotos= multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB na plik
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Dozwolone są tylko pliki graficzne.'));
        }
    }
});
function hasSupplementData(supplement) {
    if (!supplement) return false;

    return Boolean(
        supplement.objectNumber ||
        supplement.visionDate ||
        supplement.lift ||
        supplement.sirenLocation ||
        supplement.speakerLocation ||
        supplement.speakerHeight !== null ||
        supplement.antennaGSM ||
        supplement.antennaCable !== null ||
        supplement.sirenMounting ||
        supplement.powerLocation ||
        supplement.powerBool ||
        supplement.fuseBoxLocation ||
        supplement.powerLocationDistance !== null ||
        supplement.sirenDistance !== null ||
        supplement.sirenWalls !== null ||
        supplement.lightningProtection ||
        supplement.lightningProtectionDistance !== null ||
        supplement.buildingHeight !== null ||
        supplement.lightningProtectionLength !== null ||
        supplement.groundType ||
        supplement.passageMethod ||
        supplement.roofCovering ||
        supplement.lan ||
        supplement.lanLength !== null ||
        supplement.lanWalls !== null ||
        supplement.lanRoute ||
        supplement.comments ||
        supplement.contact?.firstname ||
        supplement.contact?.lastname ||
        supplement.contact?.phone
    );
}

const supplementValidators = [
    body('objectNumber')
        .trim()
        .notEmpty()
        .withMessage('ID obiektu jest wymagane.'),

    body('visionDate')
        .notEmpty()
        .withMessage('Data wizji lokalnej jest wymagana.')
        .isISO8601()
        .withMessage('Nieprawidłowa data wizji lokalnej.'),

    body('sirenLocation')
        .trim()
        .notEmpty()
        .withMessage('Miejsce montażu syreny jest wymagane.'),

    body('speakerLocation')
        .trim()
        .notEmpty()
        .withMessage('Miejsce montażu głośnika jest wymagane.'),

    body('speakerHeight')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Wysokość montażu głośnika musi być liczbą.'),

    body('antennaGSM')
        .trim()
        .isIn(GSM_MOUNTING)
        .withMessage('Wybierz poprawny sposób montażu anteny GSM.'),

    body('antennaCable')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Długość kabla antenowego musi być liczbą.'),

    body('sirenMounting')
        .trim()
        .isIn(SIREN_MOUNTING)
        .withMessage('Wybierz poprawny sposób posadowienia syreny.'),

    body('powerLocation')
        .trim()
        .isIn(CONNECTION_TYPE)
        .withMessage('Wybierz poprawny typ przyłącza zasilania.'),



    body('fuseBoxLocation')
        .optional({ values: 'falsy' })
        .trim(),

    body('powerLocationDistance')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Odległość do punktu przyłączenia musi być liczbą.'),

    body('sirenDistance')
        .if((value, { req }) => req.body.powerBool === 'on')
        .notEmpty()
        .withMessage('Podaj odległość do syreny.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Odległość do syreny musi być liczbą.'),

    body('sirenWalls')
        .optional({ values: 'falsy' })
        .isInt({ min: 0 })
        .withMessage('Ilość ścian dla syreny musi być liczbą całkowitą.'),

    body('lightningProtectionDistance')
        .if((value, { req }) => req.body.lightningProtection === 'on')
        .notEmpty()
        .withMessage('Podaj odległość do istniejącej instalacji odgromowej.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Odległość do instalacji odgromowej musi być liczbą.'),

    body('buildingHeight')
        .if((value, { req }) => req.body.lightningProtection !== 'on')
        .notEmpty()
        .withMessage('Podaj wysokość budynku.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Wysokość budynku musi być liczbą.'),

    body('lightningProtectionLength')
        .if((value, { req }) => req.body.lightningProtection !== 'on')
        .notEmpty()
        .withMessage('Podaj szacunkową długość instalacji odgromowej do wykonania.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Długość instalacji odgromowej musi być liczbą.'),

    body('groundType')
        .trim()
        .isIn(GROUND_TYPE)
        .withMessage('Wybierz poprawny rodzaj podłoża.'),

    body('passageMethod')
        .trim()
        .isIn(PASSAGE_METHOD)
        .withMessage('Wybierz poprawny sposób wykonania przejścia kablowego.'),

    body('roofCovering')
        .trim()
        .isIn(ROOF_COVERING)
        .withMessage('Wybierz poprawny rodzaj poszycia dachu.'),

    body('lanLength')
        .if((value, { req }) => req.body.lan === 'on')
        .notEmpty()
        .withMessage('Podaj długość LAN.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Długość LAN musi być liczbą.'),

    body('lanWalls')
        .if((value, { req }) => req.body.lan === 'on')
        .notEmpty()
        .withMessage('Podaj ilość przebić przez ściany dla LAN.')
        .bail()
        .isInt({ min: 0 })
        .withMessage('Ilość ścian dla LAN musi być liczbą całkowitą.'),

    body('lanRoute')
        .optional({ values: 'falsy' })
        .trim(),

    body('comments')
        .optional({ values: 'falsy' })
        .trim(),

    body('contact.firstname')
        .optional({ values: 'falsy' })
        .trim(),

    body('contact.lastname')
        .optional({ values: 'falsy' })
        .trim(),

    body('contact.phone')
        .optional({ values: 'falsy' })
        .trim()
];

router.get('/', isLoggedIn, async (req, res) => {
    try {
        const {
            q = '',
            status = '',
            assigned = '',
            risk = '',
            sort = 'createdAt_desc'
        } = req.query;

        const filter = {};
        let users = [];

        if (req.session.user.role === 'admin') {
            users = await User.find({}, 'username').sort({ username: 1 });
        }
        if (q.trim()) {
            filter.$or = [
                { shortName: { $regex: q.trim(), $options: 'i' } },
                { title: { $regex: q.trim(), $options: 'i' } },
                { address: { $regex: q.trim(), $options: 'i' } },
                { city: { $regex: q.trim(), $options: 'i' } }
            ];
        }

        if (status) {
            filter.status = status;
        }
        if (risk === 'yes') {
            filter.isAtRisk = true;
        } else if (risk === 'no') {
            filter.isAtRisk = false;
        }
        if (assigned === 'mine') {
            filter.assignedTo = req.session.user.id;
        } else if (assigned === 'free') {
            filter.assignedTo = null;
        } else if (assigned === 'assigned') {
            filter.assignedTo = { $ne: null };
        }

        let sortOption = { createdAt: -1 };

        switch (sort) {
            case 'shortName_asc':
                sortOption = { shortName: 1 };
                break;
            case 'shortName_desc':
                sortOption = { shortName: -1 };
                break;
            case 'title_asc':
                sortOption = { title: 1 };
                break;
            case 'title_desc':
                sortOption = { title: -1 };
                break;
            case 'city_asc':
                sortOption = { city: 1 };
                break;
            case 'city_desc':
                sortOption = { city: -1 };
                break;
            case 'status_asc':
                sortOption = { status: 1 };
                break;
            case 'status_desc':
                sortOption = { status: -1 };
                break;
            case 'createdAt_asc':
                sortOption = { createdAt: 1 };
                break;
            case 'createdAt_desc':
            default:
                sortOption = { createdAt: -1 };
                break;
        }

        const addresses = await Address.find(filter)
            .populate('assignedTo')
            .sort(sortOption);

        res.render('addresses/index', {
            title: 'Lista adresów',
            addresses,
            users,
            filters: {
                q,
                status,
                assigned,
                risk,
                sort
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się pobrać listy adresów.');
        res.redirect('/');
    }
});
router.post('/:id/risk', isLoggedIn, riskValidators, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect(`/addresses/${req.params.id}`);
        }

        address.isAtRisk = true;
        address.riskReason = req.body.riskReason || '';

        await address.save();

        req.flash('success', 'Adres został oznaczony jako zagrożony');
        res.redirect(`/addresses/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się oznaczyć realizacji jako zagrożonej');
        res.redirect('/addresses');
    }
});
router.post('/:id/risk/clear', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        address.isAtRisk = false;
        address.riskReason = '';

        await address.save();

        req.flash('success', 'Usunięto oznaczenie zagrożonej realizacji');
        res.redirect(`/addresses/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się usunąć oznaczenia zagrożenia');
        res.redirect('/addresses');
    }
});
router.post('/:id/assign', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        const backUrl = req.get('referer') || `/addresses/${req.params.id}`;

        if (!address) {
            req.flash('error', 'Adres nie istnieje');
            return res.redirect('/addresses');
        }

        if (address.assignedTo) {
            req.flash('error', 'Adres jest już przypisany');
            return res.redirect(backUrl);
        }

        address.assignedTo = req.session.user.id;
        address.status = 'przypisany';

        await address.save();

        req.flash('success', 'Adres przypisany do Ciebie');
        res.redirect(backUrl);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się przypisać adresu');
        res.redirect('/addresses');
    }
});
router.post('/:id/assign-user', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        const address = await Address.findById(req.params.id);
        const backUrl = req.get('referer') || `/addresses/${req.params.id}`;

        if (!address) {
            req.flash('error', 'Adres nie istnieje');
            return res.redirect('/addresses');
        }

        if (!userId) {
            req.flash('error', 'Nie wybrano użytkownika.');
            return res.redirect(backUrl);
        }

        const user = await User.findById(userId);

        if (!user) {
            req.flash('error', 'Wybrany użytkownik nie istnieje.');
            return res.redirect(backUrl);
        }

        address.assignedTo = user._id;
        address.status = 'przypisany';

        await address.save();

        req.flash('success', `Adres przypisany do użytkownika ${user.username}`);
        res.redirect(backUrl);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się przypisać adresu do użytkownika');
        res.redirect('/addresses');
    }
});
router.post('/:id/unassign', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        if (!address.assignedTo) {
            req.flash('error', 'Adres nie jest przypisany');
            return res.redirect(`/addresses/${req.params.id}`);
        }

        if (String(address.assignedTo) !== req.session.user.id && req.session.user.role !== 'admin') {
            req.flash('error', 'Nie możesz cofnąć przypisania tego adresu');
            return res.redirect(`/addresses/${req.params.id}`);
        }

        address.assignedTo = null;
        address.status = 'nowy';

        await address.save();

        req.flash('success', 'Przypisanie zostało cofnięte');
        res.redirect(`/addresses/${req.params.id}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się cofnąć przypisania');
        res.redirect('/addresses');
    }
});

router.get('/:id/supplement', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id).populate('assignedTo');
        const generatedObjectNumber =
            address.supplement?.objectNumber || generateObjectNumber(address);
        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        if (!canEditAssignedAddress(address, req.session.user)) {
            req.flash('error', 'Nie masz uprawnień do edycji suplementu dla tego adresu.');
            return res.redirect(`/addresses/${req.params.id}`);
        }

        res.render('addresses/supplement-form', {
            title: 'Suplement',
            address,
            errors: [],
            sirenMountingOptions: SIREN_MOUNTING,
            groundTypeOptions: GROUND_TYPE,
            passageMethodOptions: PASSAGE_METHOD,
            roofCoveringOptions: ROOF_COVERING,
            connectionTypeOptions: CONNECTION_TYPE,
            gsmMountingOptions: GSM_MOUNTING,

            formData: {
                objectNumber: generatedObjectNumber,
                visionDate: address.supplement?.visionDate
                    ? new Date(address.supplement.visionDate).toISOString().split('T')[0]
                    : '',
                lift: address.supplement?.lift || false,
                sirenLocation: address.supplement?.sirenLocation || '',
                speakerLocation: address.supplement?.speakerLocation || '',
                speakerHeight: address.supplement?.speakerHeight ?? '',
                antennaGSM: address.supplement?.antennaGSM || '',
                antennaCable: address.supplement?.antennaCable ?? '',
                sirenMounting: address.supplement?.sirenMounting || '',
                powerLocation: address.supplement?.powerLocation || '',
                powerBool: address.supplement?.powerBool || false,
                fuseBoxLocation: address.supplement?.fuseBoxLocation || '',
                powerLocationDistance: address.supplement?.powerLocationDistance ?? '',
                sirenDistance: address.supplement?.sirenDistance ?? '',
                sirenWalls: address.supplement?.sirenWalls ?? '',
                lightningProtection: address.supplement?.lightningProtection || false,
                lightningProtectionDistance: address.supplement?.lightningProtectionDistance ?? '',
                buildingHeight: address.supplement?.buildingHeight ?? '',
                lightningProtectionLength: address.supplement?.lightningProtectionLength ?? '',
                groundType: address.supplement?.groundType || '',
                passageMethod: address.supplement?.passageMethod || '',
                roofCovering: address.supplement?.roofCovering || '',
                lan: address.supplement?.lan || false,
                lanLength: address.supplement?.lanLength ?? '',
                lanWalls: address.supplement?.lanWalls ?? '',
                lanRoute: address.supplement?.lanRoute || '',
                comments: address.supplement?.comments || '',
                contact: {
                    firstname: address.supplement?.contact?.firstname || '',
                    lastname: address.supplement?.contact?.lastname || '',
                    phone: address.supplement?.contact?.phone || ''
                }
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się otworzyć formularza suplementu.');
        res.redirect('/addresses');
    }
});

router.post(
    '/:id/supplement',
    isLoggedIn,
    uploadPhotos.fields([
        { name: 'photo1', maxCount: 1 },
        { name: 'photo2', maxCount: 1 },
        { name: 'photo3', maxCount: 1 },
        { name: 'photo4', maxCount: 1 },
        { name: 'photo5', maxCount: 1 },
        { name: 'photo6', maxCount: 1 },
        { name: 'photo7', maxCount: 1 }
    ]),
    supplementValidators,
    async (req, res) => {
        console.log('FILES:', req.files); // 👈 TU

        try {
            const address = await Address.findById(req.params.id).populate('assignedTo');
            await uploadPhotosToSFTP(address, req.files);
            if (!address) {
                req.flash('error', 'Nie znaleziono adresu');
                return res.redirect('/addresses');
            }

            if (!canEditAssignedAddress(address, req.session.user)) {
                req.flash('error', 'Nie masz uprawnień do zapisu suplementu dla tego adresu.');
                return res.redirect(`/addresses/${req.params.id}`);
            }

            const errors = validationResult(req);
            const objectNumber =
                address.supplement?.objectNumber || generateObjectNumber(address);
            if (!errors.isEmpty()) {
                return res.status(422).render('addresses/supplement-form', {
                    title: 'Suplement',
                    address,
                    errors: errors.array(),

                    sirenMountingOptions: SIREN_MOUNTING,
                    groundTypeOptions: GROUND_TYPE,
                    passageMethodOptions: PASSAGE_METHOD,
                    roofCoveringOptions: ROOF_COVERING,
                    connectionTypeOptions: CONNECTION_TYPE,
                    gsmMountingOptions: GSM_MOUNTING,

                    formData: {
                        objectNumber,
                        visionDate: req.body.visionDate || '',
                        lift: req.body.lift === 'on',
                        sirenLocation: req.body.sirenLocation || '',
                        speakerLocation: req.body.speakerLocation || '',
                        speakerHeight: req.body.speakerHeight || '',
                        antennaGSM: req.body.antennaGSM || '',
                        antennaCable: req.body.antennaCable || '',
                        sirenMounting: req.body.sirenMounting || '',
                        powerLocation: req.body.powerLocation || '',
                        powerBool: req.body.powerBool === 'on',
                        fuseBoxLocation: req.body.fuseBoxLocation || '',
                        powerLocationDistance: req.body.powerLocationDistance || '',
                        sirenDistance: req.body.sirenDistance || '',
                        sirenWalls: req.body.sirenWalls || '',
                        lightningProtection: req.body.lightningProtection === 'on',
                        lightningProtectionDistance: req.body.lightningProtectionDistance || '',
                        buildingHeight: req.body.buildingHeight || '',
                        lightningProtectionLength: req.body.lightningProtectionLength || '',
                        groundType: req.body.groundType || '',
                        passageMethod: req.body.passageMethod || '',
                        roofCovering: req.body.roofCovering || '',
                        lan: req.body.lan === 'on',
                        lanLength: req.body.lanLength || '',
                        lanWalls: req.body.lanWalls || '',
                        lanRoute: req.body.lanRoute || '',
                        comments: req.body.comments || '',
                        contact: {
                            firstname: req.body.contact?.firstname || '',
                            lastname: req.body.contact?.lastname || '',
                            phone: req.body.contact?.phone || ''
                        }
                    }
                });
            }

            const lift = req.body.lift === 'on';
            const powerBool = req.body.powerBool === 'on';
            const lightningProtection = req.body.lightningProtection === 'on';
            const lan = req.body.lan === 'on';

            const hasContact =
                (req.body.contact?.firstname || '').trim() ||
                (req.body.contact?.lastname || '').trim() ||
                (req.body.contact?.phone || '').trim();

            address.supplement = {
                objectNumber: req.body.objectNumber,
                visionDate: req.body.visionDate,
                lift,
                sirenLocation: req.body.sirenLocation || '',
                speakerLocation: req.body.speakerLocation || '',
                speakerHeight: req.body.speakerHeight || null,
                antennaGSM: req.body.antennaGSM || '',
                antennaCable: req.body.antennaCable || null,
                sirenMounting: req.body.sirenMounting || '',
                powerLocation: req.body.powerLocation || '',
                powerBool,
                fuseBoxLocation: req.body.fuseBoxLocation || '',
                powerLocationDistance: req.body.powerLocationDistance || null,
                sirenDistance: powerBool ? (req.body.sirenDistance || null) : null,
                sirenWalls: req.body.sirenWalls || null,
                lightningProtection,
                lightningProtectionDistance: lightningProtection ? (req.body.lightningProtectionDistance || null) : null,
                buildingHeight: lightningProtection ? null : (req.body.buildingHeight || null),
                lightningProtectionLength: lightningProtection ? null : (req.body.lightningProtectionLength || null),
                groundType: req.body.groundType || '',
                passageMethod: req.body.passageMethod || '',
                roofCovering: req.body.roofCovering || '',
                lan,
                lanLength: lan ? (req.body.lanLength || null) : null,
                lanWalls: lan ? (req.body.lanWalls || null) : null,
                lanRoute: req.body.lanRoute || '',
                comments: req.body.comments || '',
                contact: hasContact
                    ? {
                        firstname: req.body.contact?.firstname || '',
                        lastname: req.body.contact?.lastname || '',
                        phone: req.body.contact?.phone || ''
                    }
                    : undefined,
                wordpressUrl: address.supplement?.wordpressUrl || '',
                updatedAt: new Date(),
                updatedBy: req.session.user.id
            };

            await address.save();

            const photos = {
                photo1: req.files?.photo1?.[0]?.buffer || null,
                photo2: req.files?.photo2?.[0]?.buffer || null,
                photo3: req.files?.photo3?.[0]?.buffer || null,
                photo4: req.files?.photo4?.[0]?.buffer || null,
                photo5: req.files?.photo5?.[0]?.buffer || null,
                photo6: req.files?.photo6?.[0]?.buffer || null,
                photo7: req.files?.photo7?.[0]?.buffer || null,
            };

            const buffer = generateSupplementDocx(address, photos);
            address.status = 'wygenerowany';
            await address.save();
            function sanitizeFileName(value) {
                return String(value)
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
            }

            const shortNamePart = sanitizeFileName(address.shortName || 'obiekt');
            const safeFileName = `SOIA_2026_UMK_${shortNamePart}.docx`;

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${safeFileName}"`
            );

            return res.send(buffer);
        } catch (error) {
            console.error(error);
            req.flash('error', 'Nie udało się zapisać suplementu i wygenerować Worda.');
            return res.redirect('/addresses');
        }
    }
);

router.post('/:id/supplement/delete', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        if (!canEditAssignedAddress(address, req.session.user)) {
            req.flash('error', 'Nie masz uprawnień do usunięcia suplementu dla tego adresu.');
            return res.redirect(`/addresses/${req.params.id}`);
        }

        address.supplement = undefined;

        await address.save();

        req.flash('success', 'Suplement został usunięty');
        res.redirect(`/addresses/${address._id}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się usunąć suplementu');
        res.redirect('/addresses');
    }
});

router.get('/:id/supplement/docx', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        if (!canEditAssignedAddress(address, req.session.user)) {
            req.flash('error', 'Nie masz uprawnień do pobrania suplementu dla tego adresu.');
            return res.redirect(`/addresses/${req.params.id}`);
        }

        if (!hasSupplementData(address.supplement)) {
            req.flash('error', 'Najpierw uzupełnij suplement');
            return res.redirect(`/addresses/${address._id}`);
        }

        const buffer = generateSupplementDocx(address);

        function sanitizeFileName(value) {
            return String(value)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }

        const shortNamePart = sanitizeFileName(address.shortName || 'obiekt');
        const safeFileName = `suplement-${shortNamePart}.docx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${safeFileName}"`
        );

        res.send(buffer);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się wygenerować pliku Word.');
        res.redirect('/addresses');
    }
});

router.get('/:id', isLoggedIn, async (req, res) => {
    try {
        let users = [];

        if (req.session.user.role === 'admin') {
            users = await User.find({}, 'username').sort({ username: 1 });
        }
        const address = await Address.findById(req.params.id)
            .populate('assignedTo')
            .populate('supplement.updatedBy');

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        const canUnassign =
            address.assignedTo &&
            (String(address.assignedTo._id) === req.session.user.id || req.session.user.role === 'admin');

        const canEditSupplement = canEditAssignedAddress(address, req.session.user);

        res.render('addresses/show', {
            title: 'Szczegóły adresu',
            address,
            users,
            hasSupplement: hasSupplementData(address.supplement),
            canUnassign,
            canEditSupplement
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się pobrać adresu.');
        res.redirect('/addresses');
    }
});
router.post(
    '/:id/upload-signed',
    isLoggedIn,
    uploadSigned.single('signedFile'),
    async (req, res) => {
        try {
            const address = await Address.findById(req.params.id);

            if (!address) {
                req.flash('error', 'Nie znaleziono adresu');
                return res.redirect('/addresses');
            }

            if (!req.file) {
                req.flash('error', 'Nie wybrano pliku');
                return res.redirect(`/addresses/${address._id}`);
            }

            if (req.file.mimetype !== 'application/pdf') {
                req.flash('error', 'Dozwolone tylko PDF');
                return res.redirect(`/addresses/${address._id}`);
            }

            // 🔥 upload na NAS
            await uploadSignedToSFTP(address, req.file);

            // 🔥 zmiana statusu
            address.status = 'zakonczony';
            await address.save();

            req.flash('success', 'Wgrano podpisany suplement');
            res.redirect(`/addresses/${address._id}`);

        } catch (err) {
            console.error(err);
            req.flash('error', 'Błąd uploadu PDF');
            res.redirect('/addresses');
        }
    }
);
router.get('/:id/download-signed', isLoggedIn, async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            req.flash('error', 'Nie znaleziono adresu');
            return res.redirect('/addresses');
        }

        const buffer = await downloadSignedFromSFTP(address);

        if (!buffer) {
            req.flash('error', 'Brak pliku PDF');
            return res.redirect(`/addresses/${address._id}`);
        }

        const fileName = `SIGNED_${address.shortName}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${fileName}"`
        );

        return res.send(buffer);

    } catch (err) {
        console.error(err);
        req.flash('error', 'Błąd pobierania PDF');
        res.redirect('/addresses');
    }
});
module.exports = router;