const express = require("express");
const { calculateAverage, detectAnomalies } = require("./anomaly_detection");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Detection AI running");
});

app.post("/average", (req, res) => {
  const { data } = req.body;
  res.json({ average: calculateAverage(data) });
});

app.post("/detect", (req, res) => {
  const { data } = req.body;
  res.json({ anomalies: detectAnomalies(data) });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
