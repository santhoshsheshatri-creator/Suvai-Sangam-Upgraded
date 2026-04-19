import express from "express";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import crypto from "crypto";

dotenv.config();

const app = express();
const RazorpayConstructor = (Razorpay as any).default || Razorpay;

app.use(express.json());
app.use(cookieParser());

// Global Error Handlers
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION at:", promise, "reason:", reason);
});

// Lazily initialize Razorpay
let razorpayInstance: any = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!key_id || !key_secret) {
      console.warn("Razorpay keys missing. Using dummy keys for development.");
    }

    try {
      razorpayInstance = new RazorpayConstructor({
        key_id: key_id || "rzp_test_dummy_id",
        key_secret: key_secret || "dummy_secret",
      });
    } catch (err) {
      console.error("Failed to initialize Razorpay instance:", err);
      throw err;
    }
  }
  return razorpayInstance;
};

// Lazily initialize Google OAuth
let oauth2ClientInstance: any = null;
const getOAuth2Client = () => {
  if (!oauth2ClientInstance) {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    const app_url = process.env.APP_URL;

    oauth2ClientInstance = new google.auth.OAuth2(
      client_id,
      client_secret,
      app_url ? `${app_url}/auth/callback` : "http://localhost:3000/auth/callback"
    );
  }
  return oauth2ClientInstance;
};

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/payment/order", async (req, res) => {
  console.log("POST /api/payment/order - Body:", req.body);
  try {
    const { amount, currency = "INR" } = req.body;
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      console.error("Invalid amount received:", amount);
      return res.status(400).json({ error: "Invalid amount" });
    }

    const razorpay = getRazorpay();
    const options = {
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    console.log("Creating Razorpay order with options:", options);
    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created successfully:", order.id);
    res.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

app.post("/api/payment/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_secret) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const hmac = crypto.createHmac("sha256", key_secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      res.json({ status: "ok" });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Verification failed", details: error.message });
  }
});

// Google OAuth Routes
app.get("/api/auth/google/url", (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  const oauth2Client = getOAuth2Client();
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    res.cookie("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
  } catch (error) {
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/calendar/sync", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) return res.status(401).json({ error: "Not authenticated" });
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(JSON.parse(tokensStr));
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  try {
    for (const event of req.body.events) {
      await calendar.events.insert({ calendarId: "primary", requestBody: event });
    }
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

// Vite / Static Files
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // In dev, we need to handle Vite middleware
  const startDev = async () => {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to start Vite dev server:", err);
    }
  };
  startDev();
}

// Export for Vercel
export default app;

// Listen if not on Vercel
if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
