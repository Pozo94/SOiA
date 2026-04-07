const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

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

function formatDate(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('pl-PL');
}

function formatBoolean(value) {
    return value ? 'TAK' : 'NIE';
}

function generateSupplementDocx(address) {
    const templatePath = path.join(__dirname, '..', 'templates', 'suplement-template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
    });

    doc.render({

        Address: `${address.street || ''} ${address.buildingNumber || ''}${address.apartmentNumber ? `/${address.apartmentNumber}` : ''}, ${address.postalCode || ''} ${address.city || ''}`.trim(),
        ObjectNumber: address.supplement?.objectNumber || '',
        VisionDate: formatDate(address.supplement?.visionDate),
        Latitude: address.supplement?.latitude || '',
        Longitude: address.supplement?.longitude || '',
        SirenType: address.supplement?.sirenType || '',
        SirenLocation: address.supplement?.sirenLocation || '',
        SirenMounting: address.supplement?.sirenMounting || '',
        PowerSupply: address.supplement?.powerSupply ?? '',
        PowerBool: address.supplement?.powerBool ?? '',
        PowerLocation: address.supplement?.powerLocation || '',
        LightningProtection: formatBoolean(address.supplement?.lightningProtection),
        BuildingHeight: address.supplement?.buildingHeight ?? '',
        LightningProtectionLength: address.supplement?.lightningProtectionLength ?? '',
        GroundType: address.supplement?.groundType || '',
        PassageMethod: address.supplement?.passageMethod || '',
        RoofCovering: address.supplement?.roofCovering || '',
        Lan: formatBoolean(address.supplement?.lan),
        LanLength: address.supplement?.lanLength ?? '',
        LanWalls: address.supplement?.lanWalls ?? '',
        LanRoute: address.supplement?.lanRoute || ''
    });

    return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
    });
}

module.exports = {
    generateSupplementDocx
};