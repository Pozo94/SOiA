function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        req.flash('error', 'Zaloguj się, aby uzyskać dostęp.');
        return res.redirect('/login');
    }

    next();
}

function canEditAssignedAddress(address, sessionUser) {
    if (!address || !sessionUser) return false;

    if (sessionUser.role === 'admin') return true;
    if (!address.assignedTo) return false;
    return String(address.assignedTo.id) === String(sessionUser.id);
}

module.exports = {
    isLoggedIn,
    canEditAssignedAddress
};