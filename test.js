require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
    try {
        console.log('URI:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Mongo OK');
        process.exit(0);
    } catch (err) {
        console.error('Mongo ERROR:', err);
        process.exit(1);
    }
}

test();