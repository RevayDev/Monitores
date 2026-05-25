import express from 'express';
import usersController from '../controllers/users.controller.js';
import requireUserContext from '../middlewares/user-context.middleware.js';

import upload from '../utils/upload.helper.js';

const router = express.Router();

router.post('/login', usersController.login);
router.post('/logout', requireUserContext, usersController.logout);
router.post('/password/forgot', usersController.requestPasswordReset);
router.post('/password/reset', usersController.resetPassword);
router.post('/signup', usersController.signup);
router.post('/upload', requireUserContext, upload.single('foto'), usersController.uploadImage);
router.get('/users/me/stats', requireUserContext, usersController.getMeStats);
router.get('/users/:id/stats', requireUserContext, usersController.getUserStats);
router.get('/users', usersController.getUsers);
router.get('/users/:id', usersController.getUser);
router.post('/users', requireUserContext, usersController.createUser);
router.put('/users/:id', requireUserContext, usersController.updateUser);
router.delete('/users/:id', requireUserContext, usersController.deleteUser);

export default router;
