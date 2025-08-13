const { events } = require('../data/memoryStore');

function getEvents(req, res) {
    res.json(events);
}

function createEvent(req, res) {
    const { title, date, time, description } = req.body;
    if (!title || !date || !time || !description) {
        return res.status(400).json({ message: 'Missing fields' });
    }
    const newEvent = {
        id: events.length + 1,
        title,
        date,
        time,
        description,
        organizerId: req.user.id,
        participants: []
    };
    events.push(newEvent);
    res.status(201).json(newEvent);
}

function updateEvent(req, res) {
    const event = events.find(e => e.id === parseInt(req.params.id));
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId !== req.user.id) return res.status(403).json({ message: 'Not your event' });

    const { title, date, time, description } = req.body;
    if (title) event.title = title;
    if (date) event.date = date;
    if (time) event.time = time;
    if (description) event.description = description;

    res.json(event);
}

function deleteEvent(req, res) {
    const index = events.findIndex(e => e.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Event not found' });
    if (events[index].organizerId !== req.user.id) return res.status(403).json({ message: 'Not your event' });

    events.splice(index, 1);
    res.json({ message: 'Event deleted' });
}

function registerForEvent(req, res) {
    const event = events.find(e => e.id === parseInt(req.params.id));
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.participants.includes(req.user.id)) {
        return res.status(400).json({ message: 'Already registered' });
    }
    event.participants.push(req.user.id);
    res.json({ message: 'Registered successfully', event });
}

module.exports = { getEvents, createEvent, updateEvent, deleteEvent, registerForEvent };
