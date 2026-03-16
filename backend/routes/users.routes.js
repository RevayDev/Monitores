const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

router.post('/login', usersController.login);
router.post('/signup', usersController.signup);
router.get('/users', usersController.getUsers);
router.post('/users', usersController.createUser);
router.put('/users/:id', usersController.updateUser);
router.delete('/users/:id', usersController.deleteUser);

module.exports = router;
