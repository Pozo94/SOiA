const express = require('express');
const { body, validationResult } = require('express-validator');
const {
    SIREN_MOUNTING,
    GROUND_TYPE,
    PASSAGE_METHOD,
    ROOF_COVERING
} = require('../constants/enums.js');
const Address = require('../models/Address');
const { isLoggedIn, canEditAssignedAddress } = require('../middleware/auth');
const { generateSupplementDocx } = require('../services/docxService');

const router = express.Router();

function hasSupplementData(supplement) {
    if (!supplement) return false;

    return Boolean(
        supplement.objectNumber ||
        supplement.visionDate ||
        supplement.latitude ||
        supplement.longitude ||
        supplement.sirenLocation ||
        supplement.sirenMounting ||
        supplement.powerSupply ||
        supplement.powerLocation ||
        supplement.buildingHeight ||
        supplement.groundType ||
        supplement.passageMethod ||
        supplement.roofCovering ||
        supplement.lanLength ||
        supplement.lanWalls ||
        supplement.lanRoute
    );
}

const supplementValidators = [
    body('objectNumber')
        .trim()
        .notEmpty()
        .withMessage('Numer obiektu jest wymagany.'),

    body('visionDate')
        .notEmpty()
        .withMessage('Data wizji jest wymagana.')
        .isISO8601()
        .withMessage('Nieprawidłowa data wizji.'),

    body('latitude')
        .trim()
        .notEmpty()
        .withMessage('Szerokość geograficzna jest wymagana.'),

    body('longitude')
        .trim()
        .notEmpty()
        .withMessage('Długość geograficzna jest wymagana.'),

    body('sirenType')
        .trim()
        .notEmpty()
        .withMessage('Typ syreny jest wymagany.'),

    body('sirenLocation')
        .trim()
        .notEmpty()
        .withMessage('Lokalizacja syreny jest wymagana.'),

    body('sirenMounting')
        .trim()
        .isIn(SIREN_MOUNTING)
        .withMessage('Wybierz poprawny sposób montażu.'),

    body('powerSupply')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Zasilanie musi być liczbą.'),

    body('powerLocation')
        .if((value, { req }) => req.body.powerBool !== 'on')
        .trim()
        .notEmpty()
        .withMessage('Podaj lokalizację punktu przyłączenia zasilania.'),

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
        .withMessage('Podaj długość instalacji odgromowej do wykonania.')
        .bail()
        .isFloat({ min: 0 })
        .withMessage('Długość odgromu musi być liczbą.'),

    body('groundType')
        .trim()
        .isIn(GROUND_TYPE)
        .withMessage('Wybierz poprawny rodzaj gruntu.'),

    body('passageMethod')
        .trim()
        .isIn(PASSAGE_METHOD)
        .withMessage('Wybierz poprawny sposób przejścia.'),

    body('roofCovering')
        .trim()
        .isIn(ROOF_COVERING)
        .withMessage('Wybierz poprawny typ pokrycia dachu.'),

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
        .withMessage('Podaj ilość przebić przez ściany.')
        .bail()
        .isInt({ min: 0 })
        .withMessage('Ilość ścian LAN musi być liczbą całkowitą.'),

    body('lanRoute')
        .if((value, { req }) => req.body.lan === 'on')
        .trim()
        .notEmpty()
        .withMessage('Podaj planowaną trasę kabli LAN.')
];

router.get('/', isLoggedIn, async (req, res) => {
    try {
        const {
            q = '',
            status = '',
            assigned = '',
            sort = 'createdAt_desc'
        } = req.query;

        const filter = {};

        if (q.trim()) {
            filter.$or = [
                { street: { $regex: q.trim(), $options: 'i' } },
                { city: { $regex: q.trim(), $options: 'i' } },
                { postalCode: { $regex: q.trim(), $options: 'i' } },
                { buildingNumber: { $regex: q.trim(), $options: 'i' } }
            ];
        }

        if (status) {
            filter.status = status;
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
            case 'street_asc':
                sortOption = { street: 1 };
                break;
            case 'street_desc':
                sortOption = { street: -1 };
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
            filters: {
                q,
                status,
                assigned,
                sort
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Nie udało się pobrać listy adresów.');
        res.redirect('/');
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
    const address = await Address.findById(req.params.id).populate('assignedTo');

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
        formData: {
            objectNumber: address.supplement?.objectNumber || '',
            visionDate: address.supplement?.visionDate
                ? new Date(address.supplement.visionDate).toISOString().split('T')[0]
                : '',
            latitude: address.supplement?.latitude || '',
            longitude: address.supplement?.longitude || '',
            sirenType: address.supplement?.sirenType || 'Gibon 600',
            sirenLocation: address.supplement?.sirenLocation || '',
            sirenMounting: address.supplement?.sirenMounting || '',
            powerSupply: address.supplement?.powerSupply ?? '',
            powerBool: address.supplement?.powerBool || false,
            powerLocation: address.supplement?.powerLocation || '',
            lightningProtection: address.supplement?.lightningProtection || false,
            buildingHeight: address.supplement?.buildingHeight ?? '',
            lightningProtectionLength: address.supplement?.lightningProtectionLength ?? '',
            groundType: address.supplement?.groundType || '',
            passageMethod: address.supplement?.passageMethod || '',
            roofCovering: address.supplement?.roofCovering || '',
            lan: address.supplement?.lan || false,
            lanLength: address.supplement?.lanLength ?? '',
            lanWalls: address.supplement?.lanWalls ?? '',
            lanRoute: address.supplement?.lanRoute || ''
        }
    });
});

router.post('/:id/supplement', isLoggedIn, supplementValidators, async (req, res) => {
    const address = await Address.findById(req.params.id).populate('assignedTo');

    if (!address) {
        req.flash('error', 'Nie znaleziono adresu');
        return res.redirect('/addresses');
    }
    if (!canEditAssignedAddress(address, req.session.user)) {
        req.flash('error', 'Nie masz uprawnień do zapisu suplementu dla tego adresu.');
        return res.redirect(`/addresses/${req.params.id}`);
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('addresses/supplement-form', {
            title: 'Suplement',
            address,
            errors: errors.array(),
            formData: {
                objectNumber: req.body.objectNumber || '',
                visionDate: req.body.visionDate || '',
                latitude: req.body.latitude || '',
                longitude: req.body.longitude || '',
                sirenType: req.body.sirenType || 'Gibon 600',
                sirenLocation: req.body.sirenLocation || '',
                sirenMounting: req.body.sirenMounting || '',
                powerSupply: req.body.powerSupply || '',
                powerBool: req.body.powerBool === 'on',
                powerLocation: req.body.powerLocation || '',
                lightningProtection: req.body.lightningProtection === 'on',
                buildingHeight: req.body.buildingHeight || '',
                lightningProtectionLength: req.body.lightningProtectionLength || '',
                groundType: req.body.groundType || '',
                passageMethod: req.body.passageMethod || '',
                roofCovering: req.body.roofCovering || '',
                lan: req.body.lan === 'on',
                lanLength: req.body.lanLength || '',
                lanWalls: req.body.lanWalls || '',
                lanRoute: req.body.lanRoute || ''
            }
        });
    }
    const powerBool = req.body.powerBool === 'on';
    const lightningProtection = req.body.lightningProtection === 'on';
    const lan = req.body.lan === 'on';
    address.supplement = {
        objectNumber: req.body.objectNumber,
        visionDate: req.body.visionDate,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        sirenType: req.body.sirenType,
        sirenLocation: req.body.sirenLocation,
        sirenMounting: req.body.sirenMounting,
        powerSupply: req.body.powerSupply || null,
        powerBool,
        powerLocation: powerBool ? '' : (req.body.powerLocation || ''),
        lightningProtection,
        buildingHeight: lightningProtection ? null : (req.body.buildingHeight || null),
        lightningProtectionLength: lightningProtection ? null : (req.body.lightningProtectionLength || null),
        groundType: req.body.groundType,
        passageMethod: req.body.passageMethod,
        roofCovering: req.body.roofCovering,
        lan,
        lanLength: lan ? (req.body.lanLength || null) : null,
        lanWalls: lan ? (req.body.lanWalls || null) : null,
        lanRoute: lan ? (req.body.lanRoute || '') : '',
        wordpressUrl: address.supplement?.wordpressUrl || '',
        updatedAt: new Date(),
        updatedBy: req.session.user.id
    };



    await address.save();

    req.flash('success', 'Suplement został zapisany');
    res.redirect(`/addresses/${address._id}`);
});

router.post('/:id/supplement/delete', isLoggedIn, async (req, res) => {
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

    address.status = address.assignedTo ? 'przypisany' : 'nowy';

    await address.save();

    req.flash('success', 'Suplement został usunięty');
    res.redirect(`/addresses/${address._id}`);
});

router.get('/:id/supplement/docx', isLoggedIn, async (req, res) => {
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

    const safeFileName = `suplement-${address._id}.docx`;


    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFileName}"`
    );

    res.send(buffer);
});

router.get('/:id', isLoggedIn, async (req, res) => {
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
        hasSupplement: hasSupplementData(address.supplement),
        canUnassign,
        canEditSupplement
    });
});

module.exports = router;