const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/addresses');
    }

    res.render('auth/login', {
        title: 'Logowanie'
    });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            req.flash('error', 'Podaj login i hasło.');
            return res.redirect('/login');
        }

        const user = await User.findOne({ username });

        if (!user) {
            req.flash('error', 'Nieprawidłowy login lub hasło.');
            return res.redirect('/login');
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
            req.flash('error', 'Nieprawidłowy login lub hasło.');
            return res.redirect('/login');
        }

        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            role: user.role
        };

        req.flash('success', 'Zalogowano pomyślnie.');
        return res.redirect('/addresses');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Wystąpił błąd podczas logowania.');
        return res.redirect('/login');
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.redirect('/addresses');
        }

        res.clearCookie('connect.sid');
        return res.redirect('/login');
    });
});

module.exports = router;