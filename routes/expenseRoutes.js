const express = require("express");
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

// router.post(
//   "/group/:groupId/expense",
//   authMiddleware,
//   expenseController.addExpense,
// );
// router.get(
//   "/group/:groupId/expenses",
//   authMiddleware,
//   expenseController.getGroupExpenses,
// );
// router.delete(
//   "/expense/:expenseId",
//   authMiddleware,
//   expenseController.deleteExpense,
// );

router.post("/:groupId/expense", authMiddleware, expenseController.addExpense);

router.get(
  "/:groupId/simplified-net-amounts/user",
  authMiddleware,
  expenseController.getOwesDetails,
);

router.post("/:expenseId/settle", authMiddleware, expenseController.settleUp);

module.exports = router;
