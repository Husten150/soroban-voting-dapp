import app from "./app";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Voting DApp backend server listening on port ${PORT}`);
  console.log(`💡 Mode: ${process.env.MOCK_MODE === "false" ? "Stellar Soroban Network Integration" : "Mock (Local Simulated State)"}`);
});
