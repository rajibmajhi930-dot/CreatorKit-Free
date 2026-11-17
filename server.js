
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

let aiClient;

async function getAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY .env file mein nahi mili.");
  }

  if (!aiClient) {
    const { GoogleGenAI } = require("@google/genai");
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  return aiClient;
}

function isTemporaryError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("resource_exhausted") ||
    message.includes("high demand")
  );
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// API status
app.get("/api/status", (req, res) => {
  res.json({
    status: "CreatorKit Backend Running",
    gemini: "gemini-3.5-flash-lite",
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY)
  });
});

app.get("/api/models", (req, res) => {
  res.json({
    models: ["gemini-3.5-flash-lite"],
    active: "gemini-3.5-flash-lite"
  });
});

// Gemini AI generation
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please enter a valid prompt."
      });
    }

    if (prompt.length > 20000) {
      return res.status(400).json({
        error: "Prompt bahut lamba hai. Please shorten it."
      });
    }

    const ai = await getAI();
    const modelName = "gemini-3.5-flash-lite";

    let result;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            maxOutputTokens: 5000,
            temperature: 0.85
          }
        });

        break;
      } catch (error) {
        if (!isTemporaryError(error) || attempt === 2) {
          throw error;
        }

        await sleep(1200);
      }
    }

    const output = result?.text;

    if (!output || !output.trim()) {
      throw new Error("AI returned an empty response. Please try again.");
    }

    res.json({
      result: output,
      model: modelName
    });

  } catch (error) {
    console.error("Gemini Error:", error);

    const temporary = isTemporaryError(error);

    res.status(temporary ? 503 : 500).json({
      error: error.message || "AI generation failed.",
      message: temporary
        ? "Gemini server is busy. Please try again shortly."
        : "Please check your Gemini API configuration."
    });
  }
});

// ElevenLabs voice list
app.get("/api/elevenlabs/voices", async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY .env file mein nahi mili.");
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/voices",
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail?.message ||
        data?.detail ||
        "ElevenLabs voice loading failed."
      );
    }

    res.json(data);

  } catch (error) {
    console.error("ElevenLabs Voices Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// ElevenLabs text to speech
app.post("/api/elevenlabs/tts", async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY .env file mein nahi mili.");
    }

    const { text, voiceId } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({
        error: "Text aur voiceId required hain."
      });
    }

    if (typeof text !== "string" || text.length > 5000) {
      return res.status(400).json({
        error: "Text 5000 characters se chhota rakhein."
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    res.json({
      audio: audioBuffer.toString("base64"),
      format: "mp3"
    });

  } catch (error) {
    console.error("ElevenLabs TTS Error:", error);

    res.status(500).json({
      error: error.message || "Voice generation failed."
    });
  }
});

// Serve the website files
app.use(express.static(path.join(__dirname)));

// Unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found."
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------");
  console.log("CreatorKit Backend Running");
  console.log(`Port: ${PORT}`);
  console.log("Gemini: gemini-3.5-flash-lite");
  console.log("Output limit: 5000 tokens");
  console.log("ElevenLabs: Enabled");
  console.log("--------------------------------");
});
