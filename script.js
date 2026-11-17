
const API_URL = "http://localhost:3001/api/generate";
const ELEVENLABS_URL = "http://localhost:3001/api/elevenlabs";

const $ = id => document.getElementById(id);

let currentLanguage = "en";
let toastTimer;
let activeCategory = "";

const categories = {
  analytics: {
    title: "Video Analytics",
    description: "Review performance using your own video metrics.",
    tools: [
      ["performance", "Video Performance Review", "Review views, impressions, CTR and watch time."],
      ["engagement", "Engagement Rate Calculator", "Calculate engagement from views, likes and comments."],
      ["compare", "Compare Two Videos", "Compare two videos using your metrics."]
    ]
  },

  content: {
    title: "Content Creation",
    description: "Develop original ideas and structured videos.",
    tools: [
      ["script", "AI Script Writer", "Create natural YouTube scripts."],
      ["story", "Full Story Generator", "Generate complete emotional stories."],
      ["hooks", "Opening Hook Generator", "Write strong opening lines."],
      ["planner", "Content Planner", "Build a weekly content plan."]
    ]
  },

  thumbnail: {
    title: "Thumbnail Creation",
    description: "Create and check YouTube thumbnails.",
    tools: [
      ["maker", "Simple Thumbnail Maker", "Create a 1280 × 720 thumbnail."],
      ["checker", "Thumbnail Checker", "Check image dimensions and file size."]
    ]
  },

  music: {
    title: "Music Recommendation",
    description: "Get music mood and sound-effect ideas.",
    tools: [
      ["music", "Background Music Finder", "Get music mood and search suggestions."],
      ["sfx", "Sound Effect Suggestions", "Find suitable sound effects."]
    ]
  },

  seo: {
    title: "SEO Optimization",
    description: "Improve video metadata and search relevance.",
    tools: [
      ["titleGen", "YouTube Title Generator", "Generate 10 attractive, relevant video titles."],
      ["tagsGen", "YouTube Tags Generator", "Generate useful YouTube tags without repetition."],
      ["description", "Video Description Writer", "Create a natural video description."],
      ["keywords", "Keyword & Search Phrase Ideas", "Generate relevant search phrases."],
      ["hashtags", "Relevant Hashtag Generator", "Create topic-specific hashtags."]
    ]
  },

  growth: {
    title: "Growth & Monetization",
    description: "Use estimates and planning tools.",
    tools: [
      ["rpm", "YouTube RPM Calculator", "Estimate revenue from views and RPM."],
      ["growth", "Channel Growth Action Plan", "Create a practical improvement plan."],
      ["checklist", "Monetization Readiness Checklist", "Review channel preparation points."]
    ]
  },

  subtitles: {
    title: "Subtitle Generation",
    description: "Create, translate and format subtitles.",
    tools: [
      ["srt", "Text to SRT Converter", "Convert text into timed subtitles."],
      ["translate", "Subtitle Translator", "Translate subtitles while preserving timestamps."],
      ["caption", "Caption Formatter", "Clean and format a transcript."]
    ]
  },

  voice: {
    title: "Voice Over",
    description: "Generate AI voice-overs using ElevenLabs.",
    tools: [
      ["tts", "AI Text to Speech", "Convert your script into downloadable MP3."]
    ]
  },

  utility: {
    title: "Utility Tools",
    description: "Practical tools that run in your browser.",
    tools: [
      ["aspect", "Aspect Ratio Calculator", "Calculate video aspect ratio."],
      ["counter", "Word & Character Counter", "Count words and characters."],
      ["filesize", "File Size Converter", "Convert KB, MB and GB."],
      ["hashtagsLocal", "Text to Hashtags", "Turn words into hashtags."]
    ]
  }
};

/* =========================
   COMMON FUNCTIONS
========================= */

function notify(message) {
  const toast = $("toast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function inputValue(id) {
  return $(id)?.value?.trim() || "";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard.");
  } catch {
    const a = document.createElement("textarea");
    a.value = text;
    document.body.appendChild(a);
    a.select();
    document.execCommand("copy");
    a.remove();
    notify("Copied.");
  }
}

function field(label, id, placeholder, type = "text") {
  return `<label for="${id}">${label}</label>
  <input id="${id}" type="${type}" placeholder="${escapeHTML(placeholder)}">`;
}

function area(label, id, placeholder) {
  return `<label for="${id}">${label}</label>
  <textarea id="${id}" placeholder="${escapeHTML(placeholder)}"></textarea>`;
}

function selectField(label, id, options) {
  return `<label for="${id}">${label}</label>
  <select id="${id}">
    ${options.map(o => `<option value="${escapeHTML(o[0])}">${escapeHTML(o[1])}</option>`).join("")}
  </select>`;
}

function showResult(text, label = "Result") {
  const box = $("results");
  if (!box) return;

  box.innerHTML = "";

  const heading = document.createElement("h4");
  heading.textContent = label;

  const output = document.createElement("div");
  output.className = "output-box";
  output.textContent = text;

  const copy = document.createElement("button");
  copy.className = "copy-button";
  copy.textContent = "Copy result";
  copy.addEventListener("click", () => copyText(text));

  box.append(heading, output, copy);
}

async function askAI(prompt, buttonId, label) {
  const btn = $(buttonId);
  const results = $("results");

  if (!btn) {
    notify("Generate button nahi mila.");
    return;
  }

  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generating...";

  if (results) {
    results.innerHTML = '<p class="result-note">AI is preparing your result. Please wait...</p>';
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "AI request failed.");
    }

    if (!data.result || typeof data.result !== "string") {
      throw new Error("AI returned an empty result.");
    }

    showResult(data.result.trim(), label);

  } catch (error) {
    if (results) {
      results.innerHTML = `<p class="result-note">Error: ${escapeHTML(error.message)}</p>`;
    }
    notify("AI request failed.");

  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

function language() {
  return currentLanguage === "hi"
    ? "Natural, easy-to-understand Hindi"
    : "English";
}

function promptFor(task, details, rules = "") {
  return `You are a professional YouTube creator assistant.

TASK:
${task}

USER DETAILS:
${details}

OUTPUT LANGUAGE:
${language()}

IMPORTANT RULES:
- Give specific and useful answers.
- Avoid generic filler.
- Never invent search volume, trends or guaranteed results.
- Follow the requested format.
${rules}

Return a clean, ready-to-use answer.`;
}

/* =========================
   STORY GENERATOR
========================= */

function storyScriptPrompt(details, selectedLanguage = "hi") {
  const isHindi = selectedLanguage === "hi";
  const wordTarget = getStoryWordTarget(details);

  return `You are a professional YouTube storyteller.

Write ONE complete, original and emotionally powerful YouTube story.

USER DETAILS:
${details}

LANGUAGE:
${isHindi
  ? "Natural conversational Hindi in Devanagari script only."
  : "Natural conversational English only."}

TARGET LENGTH:
Approximately ${wordTarget} words.
Do not write a short summary.

STORY REQUIREMENTS:

1. Start with an interesting emotional or surprising situation.
2. Create believable characters with understandable motivations.
3. Build a meaningful conflict and realistic stakes.
4. Use natural dialogue and emotional moments.
5. Keep viewers curious throughout the story.
6. Include believable turning points and suspense.
7. Create a strong climax that follows logically from earlier events.
8. Resolve the main conflict properly.
9. End with a memorable and satisfying emotional moment.
10. Make the story original and distinct.

WRITING STYLE:
- Simple language ordinary viewers understand.
- Natural narration suitable for YouTube.
- Comfortable paragraphs for voice-over.
- Show emotion through actions and dialogue.
- Avoid unnecessary repetition.
- Avoid robotic expressions.

STRICT RULES:
- No timestamps.
- No camera directions.
- No image prompts.
- No scene numbers.
- No bullet points.
- No screenplay formatting.
- No HOOK, INTRO or CONCLUSION headings.
- No explanations before or after the story.
- No unnecessary English words when Hindi is selected.
- Do not stop after introducing the problem.
- Do not generate multiple story ideas.

FINAL FORMAT:
First line: Attractive story title.
After that: Complete story in natural paragraphs.

The story must be ready for direct use in an AI voice-over tool.`;
}

function getStoryWordTarget(details) {
  const match = details.match(/Duration:\s*([^\n]+)/i);
  const duration = match ? match[1].toLowerCase() : "8-10 minutes";

  if (duration.includes("1 minute") || duration.includes("1 min")) return "120-150";
  if (duration.includes("3 minute") || duration.includes("3 min")) return "330-420";
  if (duration.includes("5 minute") || duration.includes("5 min")) return "550-680";
  if (duration.includes("8") && duration.includes("10")) return "1000-1250";
  if (duration.includes("10 minute") || duration.includes("10 min")) return "1100-1300";
  if (duration.includes("12 minute") || duration.includes("12 min")) return "1350-1550";
  if (duration.includes("15 minute") || duration.includes("15 min")) return "1650-1950";

  return "approximately 120-130 words per minute";
}

/* =========================
   CATEGORY RENDERING
========================= */

function renderCategory(key) {
  activeCategory = key;

  const cat = categories[key];
  if (!cat) return;

  $("panelKicker").textContent = "CREATOR TOOLKIT";
  $("panelTitle").textContent = cat.title;
  $("panelDescription").textContent = cat.description;

  const toolList = $("toolList");
  toolList.innerHTML = "";

  cat.tools.forEach(([id, name, desc]) => {
    const button = document.createElement("button");
    button.className = "tool-choice";

    const strong = document.createElement("strong");
    strong.textContent = name;

    const span = document.createElement("span");
    span.textContent = desc;

    button.append(strong, span);
    button.addEventListener("click", () => openTool(id, name));

    toolList.appendChild(button);
  });

  $("workspace").hidden = true;
  $("toolPanel").hidden = false;
  $("toolPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================
   TOOL FORMS
========================= */

function openTool(id, name) {
  $("workspaceTitle").textContent = name || id;
  $("workspace").hidden = false;

  const forms = {

    performance: `${field("Video views", "views", "25000", "number")}
    ${field("Impressions (optional)", "impressions", "180000", "number")}
    ${field("CTR % (optional)", "ctr", "5.2", "number")}
    ${field("Average view duration", "avd", "3:42")}
    ${field("Video length", "length", "8:30")}
    <button class="generate-button" id="runAI">Review performance</button>
    <div class="results" id="results"></div>`,

    engagement: `<div class="inline-grid">
    <div>${field("Views", "ev", "0", "number")}</div>
    <div>${field("Likes", "likes", "0", "number")}</div>
    <div>${field("Comments", "comments", "0", "number")}</div>
    <div>${field("Shares", "shares", "0", "number")}</div>
    </div>
    <button class="generate-button" id="localRun">Calculate engagement</button>
    <div class="results" id="results"></div>`,

    compare: `${field("Video A name", "aName", "Video A")}
    ${field("Video A views", "aViews", "0", "number")}
    ${field("Video A average view duration", "aAvd", "2:45")}
    ${field("Video B name", "bName", "Video B")}
    ${field("Video B views", "bViews", "0", "number")}
    ${field("Video B average view duration", "bAvd", "3:10")}
    <button class="generate-button" id="runAI">Compare videos</button>
    <div class="results" id="results"></div>`,

    script: `${field("Video topic", "topic", "What is your video about?")}
    ${selectField("Video format", "format", [["explainer", "Explainer"], ["story", "Storytelling"], ["tutorial", "Tutorial"], ["commentary", "Commentary"]])}
    ${selectField("Target duration", "duration", [["1 minute", "1 minute"], ["3 minutes", "3 minutes"], ["5 minutes", "5 minutes"], ["8-10 minutes", "8–10 minutes"], ["10 minutes", "10 minutes"], ["12 minutes", "12 minutes"], ["15 minutes", "15 minutes"]])}
    ${field("Target audience", "audience", "Who will watch this?")}
    ${selectField("Script language", "scriptLanguage", [["hi", "Hindi"], ["en", "English"]])}
    <button class="generate-button" id="runAI">Write script</button>
    <div class="results" id="results"></div>`,

    story: `${field("Story topic or theme", "topic", "Emotional village story")}
    ${field("Main character (optional)", "character", "A poor farmer, mother and son")}
    ${selectField("Story duration", "storyDuration", [["1 minute", "1 minute"], ["3 minutes", "3 minutes"], ["5 minutes", "5 minutes"], ["8-10 minutes", "8–10 minutes"], ["10 minutes", "10 minutes"], ["12 minutes", "12 minutes"], ["15 minutes", "15 minutes"]])}
    ${selectField("Story tone", "tone", [["emotional", "Emotional"], ["inspiring", "Inspiring"], ["mystery", "Mystery and suspense"], ["comedy", "Comedy"], ["moral", "Social awareness / moral"]])}
    ${selectField("Story language", "storyLanguage", [["hi", "Hindi"], ["en", "English"]])}
    <button class="generate-button" id="runAI">Generate complete story</button>
    <div class="results" id="results"></div>`,

    hooks: `${field("Video topic", "topic", "Enter your topic")}
    ${field("Audience", "audience", "Who will watch?")}
    ${selectField("Style", "style", [["curiosity", "Curiosity"], ["emotional", "Emotional"], ["direct", "Direct and clear"], ["dramatic", "Dramatic"]])}
    <button class="generate-button" id="runAI">Create opening hooks</button>
    <div class="results" id="results"></div>`,

    planner: `${field("Channel niche", "niche", "Hindi storytelling")}
    ${field("Videos per week", "frequency", "3", "number")}
    ${field("Main goal", "goal", "Improve returning viewers")}
    <button class="generate-button" id="runAI">Create weekly plan</button>
    <div class="results" id="results"></div>`,

    maker: `<label for="thumbBg">Background image (optional)</label>
    <input id="thumbBg" type="file" accept="image/*">
    ${field("Main headline", "thumbTitle", "Write a short headline")}
    ${field("Small subtitle (optional)", "thumbSub", "Supporting text")}
    ${selectField("Background colour", "thumbColor", [["#172554", "Midnight blue"], ["#312e81", "Indigo"], ["#7f1d1d", "Deep red"], ["#064e3b", "Forest green"], ["#111827", "Charcoal"]])}
    <button class="generate-button" id="makeThumb">Create thumbnail preview</button>
    <div class="results" id="results"></div>
    <canvas id="thumbCanvas" width="1280" height="720" hidden></canvas>`,

    checker: `<label for="thumbFile">Choose thumbnail image</label>
    <input id="thumbFile" type="file" accept="image/*">
    <div id="results" class="results"></div>`,

    music: `${field("Scene or video topic", "scene", "Describe the scene")}
    ${selectField("Mood", "mood", [["emotional", "Emotional"], ["uplifting", "Uplifting"], ["suspense", "Suspense"], ["romantic", "Romantic"], ["cinematic", "Cinematic"], ["funny", "Funny"]])}
    ${field("Music style (optional)", "musicStyle", "Acoustic, orchestral, electronic")}
    <button class="generate-button" id="runAI">Recommend music direction</button>
    <div class="results" id="results"></div>`,

    sfx: `${field("Scene description", "scene", "Describe the moment")}
    ${field("Video genre", "genre", "Documentary, comedy, story")}
    <button class="generate-button" id="runAI">Suggest sound effects</button>
    <div class="results" id="results"></div>`,

    titleGen: `${field("Video topic", "topic", "Enter your actual video topic")}
    ${area("What happens in the video? (optional)", "videoDetails", "Describe the video accurately")}
    ${selectField("Language", "seoLanguage", [["hi", "Hindi"], ["en", "English"]])}
    <button class="generate-button" id="runAI">Generate YouTube titles</button>
    <div class="results" id="results"></div>`,

    tagsGen: `${field("Video topic", "topic", "Enter your actual video topic")}
    ${area("Video details (optional)", "videoDetails", "Describe what the video contains")}
    ${selectField("Language", "seoLanguage", [["hi", "Hindi"], ["en", "English"]])}
    <button class="generate-button" id="runAI">Generate YouTube tags</button>
    <div class="results" id="results"></div>`,

    description: `${field("Video title", "videoTitle", "Enter your video title")}
    ${area("What actually happens in the video?", "videoDetails", "Describe the video accurately")}
    ${field("Channel name (optional)", "channel", "Your channel name")}
    <button class="generate-button" id="runAI">Write description</button>
    <div class="results" id="results"></div>`,

    keywords: `${field("Video subject", "topic", "What is this video about?")}
    ${field("Audience or location (optional)", "audience", "Hindi-speaking viewers")}
    <button class="generate-button" id="runAI">Find keyword ideas</button>
    <div class="results" id="results"></div>`,

    hashtags: `${field("Video topic", "topic", "Describe your video topic")}
    <button class="generate-button" id="runAI">Generate relevant hashtags</button>
    <div class="results" id="results"></div>`,

    rpm: `<div class="inline-grid">
    <div>${field("Monthly views", "monthlyViews", "100000", "number")}</div>
    <div>${field("Estimated RPM (₹)", "rpmValue", "50", "number")}</div>
    </div>
    <button class="generate-button" id="localRun">Estimate revenue</button>
    <div class="results" id="results"></div>
    <p class="result-note">Illustrative estimate only. Actual revenue varies.</p>`,

    growth: `${field("Channel niche", "niche", "Your channel topic")}
    ${field("Current subscribers", "subs", "5000", "number")}
    ${field("Typical views per video", "views", "2000", "number")}
    ${area("Current challenge", "challenge", "What do you want to improve?")}
    <button class="generate-button" id="runAI">Create growth action plan</button>
    <div class="results" id="results"></div>`,

    checklist: `${selectField("Channel type", "channelType", [["long", "Long-form videos"], ["shorts", "Shorts"], ["both", "Both"]])}
    <button class="generate-button" id="localRun">Show readiness checklist</button>
    <div class="results" id="results"></div>`,

    srt: `${area("Paste transcript or subtitle text", "subtitleText", "One sentence per line")}
    ${field("Seconds per subtitle", "seconds", "3", "number")}
    <button class="generate-button" id="localRun">Create SRT</button>
    <div class="results" id="results"></div>`,

    translate: `${area("Paste SRT subtitles or plain text", "subtitleText", "Paste subtitle content")}
    ${selectField("Translate to", "targetLang", [["Hindi", "Hindi"], ["English", "English"], ["Bengali", "Bengali"], ["Santali", "Santali"], ["Spanish", "Spanish"], ["French", "French"]])}
    <button class="generate-button" id="runAI">Translate subtitles</button>
    <div class="results" id="results"></div>`,

    caption: `${area("Paste transcript", "subtitleText", "Paste transcript text")}
    <button class="generate-button" id="localRun">Format captions</button>
    <div class="results" id="results"></div>`,

    tts: `${area("Text to speak", "speechText", "Paste your Hindi or English script")}
    ${selectField("ElevenLabs Voice", "voiceSelect", [["", "Loading voices..."]])}
    <button class="generate-button" id="speakBtn">Generate AI Voice</button>
    <div id="voiceResults" class="results"></div>
    <p class="result-note">Powered by ElevenLabs. Audio can be downloaded as MP3.</p>`,

    aspect: `<div class="inline-grid">
    <div>${field("Width (pixels)", "widthPx", "1920", "number")}</div>
    <div>${field("Height (pixels)", "heightPx", "1080", "number")}</div>
    </div>
    <button class="generate-button" id="localRun">Calculate ratio</button>
    <div class="results" id="results"></div>`,

    counter: `${area("Paste or type your text", "countText", "Start typing...")}
    <button class="generate-button" id="localRun">Count text</button>
    <div class="results" id="results"></div>`,

    filesize: `${field("Value", "fileValue", "1024", "number")}
    ${selectField("Convert from", "fileUnit", [["KB", "KB"], ["MB", "MB"], ["GB", "GB"]])}
    <button class="generate-button" id="localRun">Convert size</button>
    <div class="results" id="results"></div>`,

    hashtagsLocal: `${area("Enter text", "localText", "Paste a title or topic")}
    <button class="generate-button" id="localRun">Create hashtags</button>
    <div class="results" id="results"></div>`
  };

  $("toolContent").innerHTML =
    `<div class="tool-form">${forms[id] || "<p>Tool not found.</p>"}</div>`;

  connectAction(id);
  $("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================
   AI TOOL ACTIONS
========================= */

function connectAction(id) {
  const bind = (button, fn) => {
    $(button)?.addEventListener("click", fn);
  };

  const aiTools = [
    "performance", "compare", "script", "story", "hooks",
    "planner", "music", "sfx", "titleGen", "tagsGen",
    "description", "keywords", "hashtags", "growth", "translate"
  ];

  if (aiTools.includes(id)) {
    const detailsMap = {
      performance: () => `Views: ${inputValue("views")}; impressions: ${inputValue("impressions") || "not provided"}; CTR: ${inputValue("ctr") || "not provided"}; average view duration: ${inputValue("avd") || "not provided"}; video length: ${inputValue("length") || "not provided"}`,

      compare: () => `Video A: ${inputValue("aName")}, views ${inputValue("aViews")}, AVD ${inputValue("aAvd")}. Video B: ${inputValue("bName")}, views ${inputValue("bViews")}, AVD ${inputValue("bAvd")}.`,

      script: () => `Topic: ${inputValue("topic")}; format: ${inputValue("format")}; Duration: ${inputValue("duration")}; audience: ${inputValue("audience")}; language: ${inputValue("scriptLanguage")}`,

      story: () => `Topic: ${inputValue("topic")}
Character or situation: ${inputValue("character") || "Create suitable original characters"}
Duration: ${inputValue("storyDuration")}
Tone: ${inputValue("tone")}
Audience: YouTube viewers`,

      hooks: () => `Topic: ${inputValue("topic")}; audience: ${inputValue("audience")}; style: ${inputValue("style")}`,

      planner: () => `Niche: ${inputValue("niche")}; videos per week: ${inputValue("frequency")}; goal: ${inputValue("goal")}`,

      music: () => `Scene: ${inputValue("scene")}; mood: ${inputValue("mood")}; preferred style: ${inputValue("musicStyle") || "Open to suggestions"}`,

      sfx: () => `Scene: ${inputValue("scene")}; genre: ${inputValue("genre")}`,

      titleGen: () => `Video topic: ${inputValue("topic")}
Video details: ${inputValue("videoDetails") || "Not provided"}
Output language: ${inputValue("seoLanguage")}`,

      tagsGen: () => `Video topic: ${inputValue("topic")}
Video details: ${inputValue("videoDetails") || "Not provided"}
Output language: ${inputValue("seoLanguage")}`,

      description: () => `Title: ${inputValue("videoTitle")}; actual video details: ${inputValue("videoDetails")}; channel: ${inputValue("channel") || "Not provided"}`,

      keywords: () => `Subject: ${inputValue("topic")}; audience: ${inputValue("audience") || "Not specified"}`,

      hashtags: () => `Video topic: ${inputValue("topic")}`,

      growth: () => `Niche: ${inputValue("niche")}; subscribers: ${inputValue("subs")}; typical views: ${inputValue("views")}; challenge: ${inputValue("challenge")}`,

      translate: () => `Translate the following subtitle content into ${inputValue("targetLang")}, preserving all SRT sequence numbers and timestamps exactly if present.

CONTENT:
${inputValue("subtitleText")}`
    };

    const labels = {
      performance: "Performance review",
      compare: "Video comparison",
      script: "Video script",
      story: "Complete story",
      hooks: "Opening hooks",
      planner: "Weekly content plan",
      music: "Music direction",
      sfx: "Sound-effect ideas",
      titleGen: "YouTube Title Ideas",
      tagsGen: "YouTube Tags",
      description: "Video description",
      keywords: "Keyword ideas",
      hashtags: "Relevant hashtags",
      growth: "Growth action plan",
      translate: "Translated subtitles"
    };

    const tasks = {
      performance: "Review the supplied YouTube metrics. Explain strengths, possible issues and three practical experiments. Do not invent universal benchmarks.",

      compare: "Compare both videos using only the supplied metrics. Explain limitations and suggest what to test next.",

      hooks: "Write 10 distinct opening hooks that honestly match the topic. Avoid fake promises.",

      planner: "Create a realistic 7-day content plan with production tasks, not just upload dates.",

      music: "Recommend music moods, instruments, tempo and search phrases. Do not claim tracks are copyright-free.",

      sfx: "Suggest sound effects by scene moment, purpose and search phrase.",

      titleGen: `Generate exactly 10 distinct YouTube video titles.

RULES:
- Match the actual video topic and details.
- Use natural, relevant search keywords.
- Make titles attractive and curiosity-driven.
- Use different title angles, not small rewrites.
- Avoid misleading clickbait and false promises.
- Avoid keyword stuffing.
- Keep titles clear and audience-friendly.
- Do not claim guaranteed views or rankings.
- Return only 10 numbered titles.
- Use the selected output language.`,

      tagsGen: `Generate 20-25 highly relevant YouTube video tags.

RULES:
- Base every tag on the actual video topic and details.
- Include specific long-tail search phrases.
- Include broader related terms only when relevant.
- Include Hindi and English variations only when useful.
- Do not repeat tags.
- Do not create meaningless variations by rearranging words.
- Do not add unrelated trending keywords.
- Return tags in one comma-separated line, ready to paste into YouTube.
- Do not add explanations or claim search volume.
- Use the selected output language where appropriate.`,

      description: "Write a natural YouTube description based only on supplied details. Include a clear summary and relevant search phrases.",

      keywords: "Suggest 15 specific keyword and search phrase ideas grouped by search intent. Do not invent search volume.",

      hashtags: "Generate 10-15 topic-specific hashtags. Avoid irrelevant trending tags and duplicates.",

      growth: "Create a realistic 30-day channel improvement plan based on the supplied situation. Do not guarantee subscribers, views or revenue.",

      translate: "Translate the supplied subtitle text accurately. Preserve SRT numbering and timestamps exactly. Do not add commentary."
    };

    bind("runAI", () => {
      const d = detailsMap[id]();

      if (!inputValue(id === "description" ? "videoTitle" : "topic") &&
          !["performance", "compare", "growth", "music", "sfx", "translate"].includes(id)) {
        notify("Please enter the required topic or details.");
        return;
      }

      if (id === "translate" && !inputValue("subtitleText")) {
        notify("Please paste subtitle text first.");
        return;
      }

      if (id === "story") {
        askAI(storyScriptPrompt(d, inputValue("storyLanguage")), "runAI", "Complete story");
        return;
      }

      if (id === "script") {
        const selectedLanguage = inputValue("scriptLanguage");

        if (inputValue("format") === "story") {
          askAI(storyScriptPrompt(d, selectedLanguage), "runAI", "Complete story");
          return;
        }

        const wordGuide = selectedLanguage === "hi"
          ? "For Hindi narration, aim for approximately 115-125 spoken words per minute."
          : "For English narration, aim for approximately 130-145 spoken words per minute.";

        const prompt = `You are a professional YouTube scriptwriter.

Write a complete, original YouTube script.

USER DETAILS:
${d}

LANGUAGE:
${selectedLanguage === "hi" ? "Natural Hindi in Devanagari." : "Natural conversational English."}

${wordGuide}

RULES:
- Match the requested duration as closely as possible.
- Write complete narration, not a short summary.
- Start with a compelling opening.
- Maintain audience interest naturally.
- Use clear, flowing paragraphs.
- Give a meaningful ending.
- No timestamps or camera directions.
- No screenplay formatting.
- No unnecessary headings.
- Return only title and narration.`;

        askAI(prompt, "runAI", "Video script");
        return;
      }

      if (id === "titleGen" || id === "tagsGen") {
        const selectedLanguage = inputValue("seoLanguage");
        const prompt = `You are an expert YouTube SEO assistant.

${tasks[id]}

USER DETAILS:
${d}

OUTPUT LANGUAGE:
${selectedLanguage === "hi" ? "Hindi" : "English"}

Return only the requested output.`;

        askAI(prompt, "runAI", labels[id]);
        return;
      }

      askAI(promptFor(tasks[id], d), "runAI", labels[id]);
    });
  }

  /* Engagement calculator */
  if (id === "engagement") {
    bind("localRun", () => {
      const views = Number(inputValue("ev"));
      const interactions =
        Number(inputValue("likes")) +
        Number(inputValue("comments")) +
        Number(inputValue("shares"));

      if (!Number.isFinite(views) || views <= 0) {
        notify("Enter views greater than zero.");
        return;
      }

      showResult(
        `Total interactions: ${interactions}\nEngagement rate by views: ${(interactions / views * 100).toFixed(2)}%`,
        "Engagement calculation"
      );
    });
  }

  /* RPM calculator */
  if (id === "rpm") {
    bind("localRun", () => {
      const views = Number(inputValue("monthlyViews"));
      const rpm = Number(inputValue("rpmValue"));

      if (inputValue("monthlyViews") === "" ||
          inputValue("rpmValue") === "" ||
          !Number.isFinite(views) ||
          !Number.isFinite(rpm) ||
          views < 0 || rpm < 0) {
        notify("Enter valid non-negative numbers.");
        return;
      }

      showResult(
        `Estimated revenue: ₹${(views / 1000 * rpm).toLocaleString("en-IN", { maximumFractionDigits: 2 })}\nFormula: views ÷ 1,000 × RPM\nThis is an estimate, not a guarantee.`,
        "Revenue estimate"
      );
    });
  }

  /* Monetization checklist */
  if (id === "checklist") {
    bind("localRun", () => {
      const type = inputValue("channelType");

      const items = [
        "Review YouTube's current YPP eligibility requirements in your country.",
        "Enable 2-step verification on your Google Account.",
        "Check channel strikes and policy compliance in YouTube Studio.",
        "Make sure you have necessary rights to video, music and images.",
        "Review reused and inauthentic content policies.",
        "Keep channel ownership and AdSense details accurate."
      ];

      if (type !== "shorts") {
        items.push("Review valid public watch hours and long-form video performance.");
      }

      if (type !== "long") {
        items.push("Review valid public Shorts views and Shorts policy requirements.");
      }

      showResult(items.map((x, i) => `${i + 1}. ${x}`).join("\n"), "Channel readiness checklist");
    });
  }

  /* SRT generator */
  if (id === "srt") {
    bind("localRun", () => {
      const lines = inputValue("subtitleText")
        .split(/\n+/)
        .map(x => x.trim())
        .filter(Boolean);

      const seconds = Math.max(1, Number(inputValue("seconds")) || 3);

      if (!lines.length) {
        notify("Paste your transcript first.");
        return;
      }

      const stamp = n => {
        const ms = Math.round(n * 1000);
        const h = Math.floor(ms / 3600000);
        const m = Math.floor(ms % 3600000 / 60000);
        const s = Math.floor(ms % 60000 / 1000);
        const z = ms % 1000;

        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(z).padStart(3, "0")}`;
      };

      const srt = lines.map((line, i) =>
        `${i + 1}\n${stamp(i * seconds)} --> ${stamp((i + 1) * seconds)}\n${line}`
      ).join("\n\n");

      showResult(srt, "SRT subtitles");
      addDownload(srt, "subtitles.srt");
    });
  }

  /* Caption formatter */
  if (id === "caption") {
    bind("localRun", () => {
      const text = inputValue("subtitleText");

      if (!text) {
        notify("Paste transcript first.");
        return;
      }

      const clean = text
        .replace(/\s+/g, " ")
        .replace(/([.!?।])\s*/g, "$1\n")
        .trim();

      showResult(clean, "Formatted captions");
    });
  }

  /* Aspect ratio */
  if (id === "aspect") {
    bind("localRun", () => {
      const w = Number(inputValue("widthPx"));
      const h = Number(inputValue("heightPx"));

      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        notify("Enter valid width and height.");
        return;
      }

      const gcd = (a, b) => b ? gcd(b, a % b) : a;

      showResult(
        `${w} × ${h} = ${w / gcd(w, h)}:${h / gcd(w, h)}\nDecimal ratio: ${(w / h).toFixed(4)}`,
        "Aspect ratio"
      );
    });
  }

  /* Word counter */
  if (id === "counter") {
    bind("localRun", () => {
      const text = inputValue("countText");
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;

      showResult(
        `Words: ${words}\nCharacters (with spaces): ${text.length}\nCharacters (without spaces): ${text.replace(/\s/g, "").length}\nLines: ${text ? text.split(/\r\n|\r|\n/).length : 0}\nEstimated reading time: ${Math.max(1, Math.ceil(words / 200))} minute(s)`,
        "Text statistics"
      );
    });
  }

  /* File size converter */
  if (id === "filesize") {
    bind("localRun", () => {
      const n = Number(inputValue("fileValue"));
      const unit = inputValue("fileUnit");

      if (!inputValue("fileValue") || !Number.isFinite(n) || n < 0) {
        notify("Enter a valid size.");
        return;
      }

      const bytes = n * ({ KB: 1024, MB: 1048576, GB: 1073741824 }[unit]);

      showResult(
        `${n} ${unit}\n${(bytes / 1024).toFixed(2)} KB\n${(bytes / 1048576).toFixed(4)} MB\n${(bytes / 1073741824).toFixed(6)} GB`,
        "File size conversion"
      );
    });
  }

  /* Local hashtags */
  if (id === "hashtagsLocal") {
    bind("localRun", () => {
      const text = inputValue("localText");

      if (!text) {
        notify("Enter some text.");
        return;
      }

      const tags = [
        ...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
      ]
        .filter(x => x.length > 1)
        .slice(0, 20)
        .map(x => "#" + x)
        .join(" ");

      showResult(tags || "No usable words found.", "Hashtags");
    });
  }

  /* Thumbnail maker */
  if (id === "maker") {
    bind("makeThumb", drawThumbnail);
  }

  /* Thumbnail checker */
  if (id === "checker") {
    bind("thumbFile", checkThumbnail);
  }

  /* ElevenLabs */
  if (id === "tts") {
    loadElevenLabsVoices();
    bind("speakBtn", generateElevenLabsVoice);
  }
}

/* =========================
   ELEVENLABS
========================= */

async function loadElevenLabsVoices() {
  const select = $("voiceSelect");
  if (!select) return;

  select.innerHTML = '<option value="">Loading voices...</option>';

  try {
    const response = await fetch(`${ELEVENLABS_URL}/voices`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load ElevenLabs voices.");
    }

    select.innerHTML = '<option value="">Select a voice</option>';

    (data.voices || []).forEach(voice => {
      const option = document.createElement("option");
      option.value = voice.voice_id;
      option.textContent = voice.name;
      select.appendChild(option);
    });

    if (!data.voices?.length) {
      select.innerHTML = '<option value="">No voices available</option>';
    }

  } catch (error) {
    select.innerHTML = '<option value="">Voice loading failed</option>';
    notify(error.message);
  }
}

async function generateElevenLabsVoice() {
  const text = inputValue("speechText");
  const voiceId = inputValue("voiceSelect");
  const btn = $("speakBtn");
  const results = $("voiceResults");

  if (!text) {
    notify("Please enter your voice-over text.");
    return;
  }

  if (!voiceId) {
    notify("Please select an ElevenLabs voice.");
    return;
  }

  if (text.length > 5000) {
    notify("Maximum 5000 characters allowed.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Generating voice...";

  results.innerHTML = '<p class="result-note">ElevenLabs is generating your voice. Please wait...</p>';

  try {
    const response = await fetch(`${ELEVENLABS_URL}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Voice generation failed.");
    }

    if (!data.audio) {
      throw new Error("No audio was returned.");
    }

    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    results.innerHTML = "";

    const heading = document.createElement("h4");
    heading.textContent = "Your AI Voice is Ready";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = url;
    audio.style.width = "100%";

    const download = document.createElement("a");
    download.href = url;
    download.download = "CreatorKit-Voiceover.mp3";
    download.className = "download-button";
    download.textContent = "Download MP3";

    results.append(heading, audio, download);
    notify("Voice generated successfully!");

  } catch (error) {
    results.innerHTML = `<p class="result-note">Error: ${escapeHTML(error.message)}</p>`;
    notify("Voice generation failed.");

  } finally {
    btn.disabled = false;
    btn.textContent = "Generate AI Voice";
  }
}

/* =========================
   DOWNLOAD
========================= */

function addDownload(text, filename) {
  const button = document.createElement("button");
  button.className = "download-button";
  button.textContent = "Download file";

  button.addEventListener("click", () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("results").appendChild(button);
}

/* =========================
   THUMBNAIL MAKER
========================= */

function drawThumbnail() {
  const title = inputValue("thumbTitle");
  const sub = inputValue("thumbSub");
  const canvas = $("thumbCanvas");
  const ctx = canvas.getContext("2d");
  const color = inputValue("thumbColor");

  if (!title) {
    notify("Enter a headline first.");
    return;
  }

  const render = img => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1280, 720);

    if (img) {
      ctx.globalAlpha = 0.42;

      const scale = Math.max(1280 / img.width, 720 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;

      ctx.drawImage(img, (1280 - w) / 2, (720 - h) / 2, w, h);
      ctx.globalAlpha = 1;
    }

    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, "rgba(5,8,20,.25)");
    gradient.addColorStop(1, "rgba(5,8,20,.8)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = "#fff";
    ctx.font = "800 88px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = title.toUpperCase().split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach(word => {
      const test = line ? line + " " + word : word;

      if (ctx.measureText(test).width > 1080 && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });

    if (line) lines.push(line);

    const shown = lines.slice(0, 3);
    const lineHeight = 100;
    const startY = sub
      ? 360 - (shown.length * lineHeight + 55) / 2
      : 360 - (shown.length - 1) * lineHeight / 2;

    shown.forEach((l, i) => {
      ctx.fillText(l, 640, startY + i * lineHeight);
    });

    if (sub) {
      ctx.font = "600 34px Arial";
      ctx.fillStyle = "#d9dfff";
      ctx.fillText(sub.slice(0, 65), 640, startY + shown.length * lineHeight + 25);
    }

    const results = $("results");
    results.innerHTML = "";

    const preview = document.createElement("img");
    preview.className = "thumbnail-preview";
    preview.src = canvas.toDataURL("image/png");
    preview.alt = "Generated thumbnail preview";

    results.appendChild(preview);

    const download = document.createElement("button");
    download.className = "download-button";
    download.textContent = "Download 1280 × 720 PNG";

    download.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "creatorkit-thumbnail.png";
      a.click();
    });

    results.appendChild(download);

    const note = document.createElement("p");
    note.className = "result-note";
    note.textContent = "Review text placement and image rights before publishing.";
    results.appendChild(note);
  };

  const file = $("thumbBg").files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => render(img);
      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  } else {
    render(null);
  }
}

/* =========================
   THUMBNAIL CHECKER
========================= */

function checkThumbnail(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    notify("Choose an image file.");
    return;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    const good = img.naturalWidth === 1280 && img.naturalHeight === 720;
    const size = file.size / 1048576;

    $("results").innerHTML = `
      <img class="thumbnail-preview" src="${url}" alt="Thumbnail preview">
      <div class="thumbnail-info">
        <h4>${good ? "Recommended dimensions matched" : "Image checked"}</h4>
        <p>Dimensions: ${img.naturalWidth} × ${img.naturalHeight}px</p>
        <p>File size: ${size.toFixed(2)} MB</p>
        <p>${good ? "Dimensions match 1280 × 720." : "Recommended dimensions are 1280 × 720."}</p>
        <p>${size <= 2 ? "File is within the 2 MB guideline." : "File is larger than 2 MB; consider compressing it."}</p>
      </div>
    `;
  };

  img.onerror = () => notify("Could not read this image.");
  img.src = url;
}

/* =========================
   MAIN PAGE EVENTS
========================= */

document.querySelectorAll("[data-category-open]").forEach(button => {
  button.addEventListener("click", () => {
    renderCategory(button.dataset.categoryOpen);
  });
});

$("closePanel")?.addEventListener("click", () => {
  $("toolPanel").hidden = true;
});

$("closeTool")?.addEventListener("click", () => {
  $("workspace").hidden = true;
});

$("toolSearch")?.addEventListener("input", event => {
  const query = event.target.value.toLowerCase();

  document.querySelectorAll(".category-card").forEach(card => {
    card.hidden = !card.textContent.toLowerCase().includes(query);
  });
});

$("languageBtn")?.addEventListener("click", () => {
  currentLanguage = currentLanguage === "en" ? "hi" : "en";

  document.querySelectorAll("[data-en][data-hi]").forEach(el => {
    el.innerHTML = el.dataset[currentLanguage];
  });

  $("languageBtn").textContent =
    currentLanguage === "en" ? "हिन्दी" : "English";

  document.documentElement.lang = currentLanguage;
});

/* =========================
   CLICK FIX
========================= */

document.addEventListener("click", event => {
  const button = event.target.closest(".tool-button, [data-tool]");

  if (!button || button.disabled) return;

  const toolId = button.dataset.tool;

  if (toolId && typeof openTool === "function") {
    event.preventDefault();
    event.stopPropagation();

    const tool = Object.values(categories)
      .flatMap(cat => cat.tools)
      .find(item => item[0] === toolId);

    openTool(toolId, tool?.[1] || toolId);
  }
}, true);

console.log("CreatorKit script loaded successfully.");
