// chat-with-claude.js
// import fetch from 'node-fetch'
// const fetch = require('node-fetch');
import fs from 'fs';

const fileContent = fs.readFileSync('../final_results.csv', 'utf-8');

import { GoogleGenerativeAI } from "@google/generative-ai";
import readline from "readline";

// 🔐 Replace with your actual Gemini API key
const API_KEY = '-UE'; // Replace this with your Claude API key

const genAI = new GoogleGenerativeAI(API_KEY);

async function startChat() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const chat = model.startChat({
    history: [
  {
    role: "user",
    parts: [
      {
        text: `You are analyzing satellite vegetation data to monitor tree growth near power lines.
I will provide a CSV file with the following columns:
lineID, vegetationIndex, long, lat

Your task:
1. Parse the CSV.
2. Sort rows in descending order by vegetationIndex.
3. Output only 3 rows at a time in this format:
   [vegetationIndex] (lat, long)
4. After showing 3 rows, wait for me to type "next" to display the next 3.
5. Do not repeat the original file content.
6. Do not explain or describe anything. Just give the selected results.

Begin by processing this data:
\${fileContent}`,
      },
    ],
  },
],
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () =>
    rl.question("You: ", async (userInput) => {
      if (userInput.trim().toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const result = await chat.sendMessage(userInput);
        const response = result.response.text();
        console.log(`Gemini: ${response}`);
      } catch (err) {
        console.error("Error:", err.message);
      }

      ask(); // loop
    });

  console.log("🔮 Gemini chat started. Type 'exit' to quit.");
  ask();
}

startChat();
