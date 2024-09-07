const Expense = require("../models/Expense");
const Group = require("../models/Group");
const User = require("../models/User");

// Helper function to calculate shares for 'equally' split
const splitEqually = (amount, users) => {
  console.log(users, "split equally");
  const share = amount / users.length;
  return users.map((user) => ({ user: user._id, share: share }));
};

// Helper function to calculate shares for 'byPercentage' split
const splitByPercentage = (amount, splitInfo) => {
  return splitInfo.map((split) => {
    const share = (split.percentage / 100) * amount;
    return { user: split.user, share: share };
  });
};

// Helper function to calculate shares for 'byShares' split
const splitByShares = (amount, splitInfo) => {
  const totalShares = splitInfo.reduce((acc, split) => acc + split.shares, 0);
  return splitInfo.map((split) => {
    const share = split.shares;
    return { user: split.user, share: share };
  });
};

// API to create an expense
exports.addExpense = async (req, res) => {
  const { name, amount, description, date, splitMethod, splitAmong } = req.body;
  const { groupId } = req.params;
  const paidBy = req.user;
  try {
    // Validate group existence
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Validate payer existence
    const payer = await User.findById(paidBy);
    if (!payer) {
      return res.status(404).json({ message: "Payer not found" });
    }

    // Fetch all users in the group
    const usersInGroup = await User.find({ _id: { $in: group.users } });

    // Split calculation logic
    let splits = [];
    switch (splitMethod) {
      case "equally":
        splits = splitEqually(amount, usersInGroup);
        console.log(splits, "equally");
        break;

      case "byPercentage":
        if (!splitAmong || splitAmong.length !== usersInGroup.length) {
          return res
            .status(400)
            .json({ message: "Percentage split info is missing or invalid" });
        }
        splits = splitByPercentage(amount, splitAmong);
        break;

      case "byShares":
        if (!splitAmong || splitAmong.length !== usersInGroup.length) {
          return res
            .status(400)
            .json({ message: "Share split info is missing or invalid" });
        }
        splits = splitByShares(amount, splitAmong);
        break;

      default:
        return res.status(400).json({ message: "Invalid split method" });
    }

    // Create a new expense
    const newExpense = new Expense({
      name,
      amount,
      description,
      date: date || Date.now(),
      splitMethod,
      group: groupId,
      paidBy,
      splitAmong: splits,
    });

    // Save the expense to the database
    await newExpense.save();

    res
      .status(201)
      .json({ message: "Expense created successfully", expense: newExpense });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Helper function to calculate net balances for all users in a group
const calculateBalances = async (groupId) => {
  // Fetch all expenses for the group and populate splitAmong.user and paidBy fields
  const expenses = await Expense.find({ group: groupId }).populate(
    "splitAmong.user paidBy",
  );

  console.log(expenses, "calculateBalances expenses");
  const balances = {};

  expenses.forEach((expense) => {
    const payerId = expense.paidBy._id.toString();
    console.log(payerId, "payer id in loop");
    // Initialize the payer's balance if not already present
    if (!balances[payerId]) {
      balances[payerId] = { user: expense.paidBy, balance: 0 };
    }

    // Add the total amount paid by the payer
    balances[payerId].balance += expense.amount;

    // Iterate through each entry in splitAmong
    expense.splitAmong.forEach((split) => {
      const userId = split.user._id.toString();

      // Initialize the user's balance if not already present
      if (!balances[userId]) {
        balances[userId] = { user: split.user, balance: 0 };
      }

      // Subtract the share from the user's balance
      balances[userId].balance -= split.share;
    });
  });

  return balances;
};

// API to get simplified net amounts for the logged-in user
// API to get the details of who owes whom how much
exports.getOwesDetails = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user; // Assuming the logged-in user is available in req.user

  console.log(userId, "user in getOwesDetails");

  try {
    // Validate group existence
    const group = await Group.findById(groupId).populate("users");
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Get all balances for the group
    const balances = await calculateBalances(groupId);
    console.log(balances, "balances in  getOwesDetails");

    // Get the balance of the logged-in user
    const loggedInUserBalance = balances[userId];

    // Initialize result structure
    const owesDetails = {
      owesTo: [],
      owedBy: [],
    };

    // Loop through the balances and calculate who owes whom
    Object.keys(balances).forEach((otherUserId) => {
      if (otherUserId === userId) return; // Skip logged-in user

      const otherUserBalance = balances[otherUserId];

      const netBalance = loggedInUserBalance.balance - otherUserBalance.balance;

      if (netBalance < 0) {
        // Logged-in user owes this person
        owesDetails.owesTo.push({
          user: otherUserBalance.user,
          amount: Math.abs(netBalance),
        });
      } else if (netBalance > 0) {
        // This person owes the logged-in user
        owesDetails.owedBy.push({
          user: otherUserBalance.user,
          amount: netBalance,
        });
      }
    });

    // Return the owes details
    res.json(owesDetails);
  } catch (error) {
    console.error(error, "owesDetails");
    res.status(500).json({ message: "Server error", error });
  }
};

// Helper function to calculate what each user owes to another in a group
const calculateOwedBalances = (groupExpenses, userId) => {
  let balances = {};

  groupExpenses.forEach((expense) => {
    expense.splitAmong.forEach((split) => {
      if (!balances[split.user]) {
        balances[split.user] = { owes: 0, owed: 0 };
      }

      if (split.user.toString() === userId) {
        // If the logged-in user is part of this split
        balances[expense.paidBy] = balances[expense.paidBy] || {
          owes: 0,
          owed: 0,
        };
        balances[expense.paidBy].owed += split.share;
      } else {
        // If another user is part of this split
        balances[split.user].owes += split.share;
      }
    });
  });

  return balances;
};

// API for settling an amount
exports.settleUp = async (req, res) => {
  const userId = req.user; // Current logged-in user
  const { expenseId } = req.params;
  const { method } = req.body; // Extract from request body

  try {
    // Fetch the expense details
    const expense = await Expense.findById(expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const { group, paidBy, splitAmong } = expense;

    // Fetch group and its expenses
    const groupExpenses = await Expense.find({ group });

    // Calculate balances for each user in the group
    const balances = calculateOwedBalances(groupExpenses, userId);

    console.log(balances, "balances for settlement");

    // Determine how much the user owes and is owed
    const settleWithUserBalance = balances[paidBy];

    if (!settleWithUserBalance) {
      return res.status(400).json({ message: "No balance with this user" });
    }

    // Calculate the maximum settle amount based on the balances
    const amountToSettle = Math.min(
      settleWithUserBalance.owes,
      settleWithUserBalance.owed,
    );

    // Ensure that the requested amount does not exceed the calculated amount

    // Update the expense document with the settlement details
    expense.settlements.push({
      user: userId,
      amount: amountToSettle,
      method,
    });

    await expense.save();

    res.json({
      message: `Successfully settled ₹${amountToSettle} with user ${paidBy} via ${method}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};
