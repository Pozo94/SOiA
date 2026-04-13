const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('@slosarek/docxtemplater-image-module-free');
const EMPTY_PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn9lZ8AAAAASUVORK5CYII=',
    'base64'
);

function formatDate(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('pl-PL');
}

function textValue(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function numberValue(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
}

function boolText(value) {
    return value ? 'TAK' : 'NIE';
}

function normalizePhoto(photo) {
    if (photo && Buffer.isBuffer(photo) && photo.length > 0) {
        return photo;
    }
    return EMPTY_PIXEL;
}

function generateSupplementDocx(address, photos = {}) {
    const templatePath = path.join(__dirname, '..', 'templates', 'suplement-template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const imageModule = new ImageModule({
        centered: false,
        getImage(tagValue) {
            return tagValue;
        },
        getSize() {
            return [420, 260];
        }
    });

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule]
    });
    const supplement = address.supplement || {};

    const powerBool = !!supplement.powerBool;
    const lightningProtection = !!supplement.lightningProtection;
    const lan = !!supplement.lan;
    const lift = !!supplement.lift;

    const hasContact =
        supplement.contact &&
        (supplement.contact.firstname || supplement.contact.lastname || supplement.contact.phone);

    doc.render({
        shortName: textValue(address.shortName),
        title: textValue(address.title),
        category: textValue(address.category),
        address: textValue(address.address),
        city: textValue(address.city),
        latitude: textValue(address.latitude),
        longitude: textValue(address.longitude),
        sirenType: textValue(address.sirenType),
        sirenPower: textValue(address.sirenPower),
        fullAddress: `${textValue(address.address)}, ${textValue(address.city)}`.trim(),

        objectNumber: textValue(supplement.objectNumber),
        visionDate: formatDate(supplement.visionDate),
        lift: boolText(lift),
        sirenLocation: textValue(supplement.sirenLocation),
        speakerLocation: textValue(supplement.speakerLocation),
        speakerHeight: numberValue(supplement.speakerHeight),
        antennaGSM: textValue(supplement.antennaGSM),
        antennaCable: numberValue(supplement.antennaCable),
        sirenMounting: textValue(supplement.sirenMounting),
        powerLocation: textValue(supplement.powerLocation),
        powerBool: boolText(powerBool),
        fuseBoxLocation: textValue(supplement.fuseBoxLocation),
        powerLocationDistance: numberValue(supplement.powerLocationDistance),
        sirenDistance: powerBool ? numberValue(supplement.sirenDistance) : '',
        sirenWalls: numberValue(supplement.sirenWalls),
        lightningProtection: boolText(lightningProtection),
        lightningProtectionDistance: lightningProtection
            ? numberValue(supplement.lightningProtectionDistance)
            : '',
        buildingHeight: lightningProtection
            ? ''
            : numberValue(supplement.buildingHeight),
        lightningProtectionLength: lightningProtection
            ? ''
            : numberValue(supplement.lightningProtectionLength),
        groundType: textValue(supplement.groundType),
        passageMethod: textValue(supplement.passageMethod),
        roofCovering: textValue(supplement.roofCovering),
        lan: boolText(lan),
        lanLength: lan ? numberValue(supplement.lanLength) : '',
        lanWalls: lan ? numberValue(supplement.lanWalls) : '',
        lanRoute: textValue(supplement.lanRoute),
        comments: textValue(supplement.comments),

        contactFirstname: hasContact ? textValue(supplement.contact.firstname) : '',
        contactLastname: hasContact ? textValue(supplement.contact.lastname) : '',
        contactPhone: hasContact ? textValue(supplement.contact.phone) : '',
        contactFullName: hasContact
            ? `${textValue(supplement.contact.firstname)} ${textValue(supplement.contact.lastname)} ${textValue(supplement.contact.phone)}`.trim()
            : '',

        photo1: photos.photo1 || null,
        photo2: photos.photo2 || null,
        photo3: photos.photo3 || null,
        photo4: photos.photo4 || null,
        photo5: photos.photo5 || null,
        photo6: photos.photo6 || null,
        photo7: photos.photo7 || null,
        photo8: photos.photo8 || null
    });

    return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
    });
}

module.exports = {
    generateSupplementDocx
};