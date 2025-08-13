function authorizeOrganizer(req, res, next) {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
}

module.exports = authorizeOrganizer;
