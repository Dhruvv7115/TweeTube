import { app } from "./app.js"
import dotenv from "dotenv"
import connectDB from "./db/index.js"


dotenv.config({
  path: "./.env"
})

const PORT = process.env.PORT || 8000
// console.log(`Loaded PORT from env: ${process.env.PORT}, using: ${PORT}`);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`server is listening on port http://localhost:${PORT}`)
  })
}).catch((err) => {
  console.log("MongoDB connection error :", err)
})