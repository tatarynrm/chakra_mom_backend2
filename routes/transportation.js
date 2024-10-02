const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');

const { createTransportation, getTransportationsList, createTransportationСomment, searchTransportations, getDayAndMonthSum } = require('../controllers/transportation');

const router = express.Router();

// Реєстрація користувача
router.post('/create',createTransportation);
router.post('/create/comment',createTransportationСomment);
router.get('/list',getTransportationsList);


router.get('/search',searchTransportations);

router.get('/costs/today-and-month',getDayAndMonthSum);

module.exports = router;
