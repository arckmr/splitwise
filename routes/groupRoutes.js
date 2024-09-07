const express = require("express");
const groupController = require("../controllers/groupController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/", authMiddleware, groupController.createGroup);
router.post("/add-users", authMiddleware, groupController.addUsersToGroup);
router.get("/get-groups", authMiddleware, groupController.getGroups);

module.exports = router;
