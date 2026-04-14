const mongoose = require('mongoose');
const { ROOF_COVERING, PASSAGE_METHOD, SIREN_MOUNTING, GROUND_TYPE, CONNECTION_TYPE, GSM_MOUNTING}=require('../constants/enums.js');

const contactSchema = new mongoose.Schema(
    {
        firstname: {
            type: String,
            default: '',
            trim: true
        },
        lastname: {
            type: String,
            default: '',
            trim: true
        },
        phone: {
            type: String,
            default: '',
            trim: true
        }
    },
    { _id: false }
);
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
        lift: {
            type: Boolean,
            default: false
        },

        sirenLocation: {
            type: String,
            default: '',
            trim: true
        },
        speakerLocation: {
            type: String,
            default: '',
            trim: true
        },
        speakerHeight: {
            type: Number,
            default: null
        },
        antennaGSM: {
            type: String,
            enum: GSM_MOUNTING,
            default: '',
            trim: true
        },
        antennaCable:{
            type:Number,
            default:null
        },
        sirenMounting: {
            type: String,
            enum:SIREN_MOUNTING,
            default: '',
            trim: true
        },
        powerLocation: {
          type:String,
          enum:CONNECTION_TYPE,
          default:'',
          trim: true

        },
        powerBool: {
            type: Boolean,
            default: false
        },

        fuseBoxLocation: {
            type: String,
            default: '',
            trim: true
        },
        powerLocationDistance: {
            type: Number,
            default: null,

        },
        sirenDistance: {
            type: Number,
            default: null,

        },
        sirenWalls:{
          type: Number,
          default:0
        },
        lightningProtection: {
            type: Boolean,
            default: false
        },
        lightningProtectionDistance: {
          type: Number,
          default:0
        },
        buildingHeight: {
            type: Number,
            default: null
        },
        lightningProtectionLength: {
            type: Number,
            default: 0
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
        comments: {
            type: String,
            default: '',
            trim: true
        },
        contact:{
          type:contactSchema,
          default:undefined
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
    {   shortName:{
            type: String,
            required: true,
            trim: true
        },
        title:{
            type: String,
            required: true,
            trim: true
        },
        category:{
            type: String,
            required: true,
            trim: true
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
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
        sirenPower: {
            type: String,
            trim: true
        },
        sirenType: {
            type: String,
            default:'Gibon',
            trim: true
        },
        status: {
            type: String,
            enum: ['nowy', 'przypisany','wygenerowany', 'zakonczony'],
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
        isAtRisk: {
            type: Boolean,
            default: false
        },
        riskReason: {
            type: String,
            default: '',
            trim: true
        },
        supplement: {
            type: supplementSchema,
            default: undefined
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);