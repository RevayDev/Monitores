import express from 'express';
import usersController from '../controllers/users.controller.js';
import requireUserContext from '../middlewares/user-context.middleware.js';

import upload from '../utils/upload.helper.js';

const router = express.Router();

router.post('/login', usersController.login);
router.post('/signup', usersController.signup);
router.post('/upload', upload.single('foto'), usersController.uploadImage);
router.get('/users/me/stats', requireUserContext, usersController.getMeStats);
router.get('/users/:id/stats', requireUserContext, usersController.getUserStats);
router.get('/users', usersController.getUsers);
router.get('/users/:id', usersController.getUser);
router.post('/users', usersController.createUser);
router.put('/users/:id', usersController.updateUser);
router.delete('/users/:id', usersController.deleteUser);

export default router;
