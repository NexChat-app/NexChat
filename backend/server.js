// server.js — Backend NexChat (nouveau, à déployer sur Render)
// Rôle actuel (étape 1) : uniquement l'envoi et la vérification des codes
// de confirmation d'inscription par email, via Brevo.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors()); // à restreindre au domaine du frontend une fois celui-ci déployé
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "nexchat-backend" });
});

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NexChat backend démarré sur le port ${PORT}`);
});
