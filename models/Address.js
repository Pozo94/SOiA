const mongoose = require('mongoose');
const { ROOF_COVERING, PASSAGE_METHOD, SIREN_MOUNTING, GROUND_TYPE}=require('../constants/enums.js');

const supplementSchema = new mongoose.Schema(
    {
        objectNumber: {
            type: String,
            default: '',
            trim: true
        },
        visionDate: {
            type: Date,
            default: null
        },
        latitude: {
            type: String,
            default: '',
            trim: true
        },
        longitude: {
            type: String,
            default: '',
            trim: true
        },
        sirenType: {
            type: String,
            default: 'Gibon 600',
            trim: true
        },
        sirenLocation: {
            type: String,
            default: '',
            trim: true
        },
        sirenMounting: {
            type: String,
            enum:SIREN_MOUNTING,
            default: '',
            trim: true
        },
        powerSupply: {
            type: Number,
            default: null
        },
        powerBool: {
            type: Boolean,
            default: '',
            trim: true
        },
        powerLocation: {
            type: String,
            default: '',
            trim: true
        },
        lightningProtection: {
            type: Boolean,
            default: false
        },
        buildingHeight: {
            type: Number,
            default: null
        },
        lightningProtectionLength: {
            type: Number,
            default: null
        },
        groundType: {
            type: String,
            enum:GROUND_TYPE,
            default: '',
            trim: true
        },
        passageMethod: {
            type: String,
            enum:PASSAGE_METHOD,
            default: '',
            trim: true
        },
        roofCovering: {
            type: String,
            enum:ROOF_COVERING,
            default: '',
            trim: true
        },
        lan: {
            type: Boolean,
            default: false
        },
        lanLength: {
            type: Number,
            default: null
        },
        lanWalls: {
            type: Number,
            default: null
        },
        lanRoute: {
            type: String,
            default: '',
            trim: true
        },
        wordpressUrl: {
            type: String,
            default: ''
        },
        updatedAt: {
            type: Date,
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }

    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        street: {
            type: String,
            required: true,
            trim: true
        },
        buildingNumber: {
            type: String,
            default: '',
            trim: true
        },
        apartmentNumber: {
            type: String,
            default: '',
            trim: true
        },
        postalCode: {
            type: String,
            default: '',
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ['nowy', 'przypisany', 'zakonczony'],
            default: 'nowy'
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        notes: {
            type: String,
            default: ''
        },
        supplement: {
            type: supplementSchema,
            default: undefined
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);