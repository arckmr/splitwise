const Group = require("../models/Group");
const User = require("../models/User");

// Create a group (Authenticated User will be the creator)
exports.createGroup = async (req, res) => {
  const { name } = req.body;
  try {
    const group = new Group({ name, users: [req.user] }); // Add the creator (authenticated user) to the group
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Add users to a group
exports.addUsersToGroup = async (req, res) => {
  const { groupId, userIds } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Ensure the authenticated user is part of the group before allowing changes
    if (!group.users.includes(req.user)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to modify this group" });
    }

    group.users.push(...userIds);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// View groups that the authenticated user belongs to
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ users: req.user }).populate("users");
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
