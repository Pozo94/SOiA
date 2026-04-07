require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const existingAdmin = await User.findOne({ username: 'admin' });

        if (existingAdmin) {
            console.log('Użytkownik admin już istnieje.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash('admin123', 10);

        await User.create({
            firstname:'admin',
            lastname:'admin',
            username: 'admin',
            passwordHash,
            role: 'admin'
        });

        console.log('Utworzono użytkownika admin / hasło: admin123');
        process.exit(0);
    } catch (error) {
        console.error('Błąd seedowania admina:', error);
        process.exit(1);
    }
}

seedAdmin();