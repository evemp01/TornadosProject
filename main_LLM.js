//main_LLM.js
import "dotenv/config";
import OpenAI from "openai";
import { addMission} from "./BDI_agent/beliefs/missions.js";
import { missionAdded } from "./BDI_agent/utils/events.js";
import { me } from "./BDI_agent/beliefs/me.js";
import { sendMessageToSocket } from "./BDI_agent/utils/socketManager.js";
import { deliveryTiles } from "./BDI_agent/beliefs/map.js";
import { addConstraint, setMaxCarry } from "./BDI_agent/beliefs/constraints.js";

//kode inspired form 09_08B-planner-execution-loop_DeliverooJS_EXTRA.js i think


// ==========================================
// 1. LiteLLM Configuration
// ==========================================

const baseURL = process.env.LITELLM_BASE_URL || "https://llm.bears.disi.unitn.it/v1";
const apiKey = process.env.LITELLM_API_KEY;
const MODEL = process.env.LOCAL_MODEL || "llama-3.3-70b-lmstudio";

if (!apiKey) {
  console.error("Error: missing LITELLM_API_KEY in .env file");
  process.exit(1);
}

// ==========================================
// 2. OpenAI-compatible client
// ==========================================

const client = new OpenAI({
  baseURL,
  apiKey,
});

// ==========================================
// 3. Tools
// ==========================================

function calculate(expression) {
  console.log("---- CALCULATE ----");

  try {
    // Demo only: eval is unsafe for production
    return String(eval(expression));
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function getCurrentTime(location) {
  console.log("---- GET CURRENT TIME ----");

  try {
    const normalized = location.trim().toLowerCase();

    const supportedLocations = {
      rome: { city: "Rome", timeZone: "Europe/Rome" },
      roma: { city: "Rome", timeZone: "Europe/Rome" },
    };

    const config = supportedLocations[normalized];

    if (!config) {
      return "Error: Current time is only supported for Rome/Roma in this demo.";
    }

    const now = new Date();

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: config.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const formattedDate = `${map.year}-${map.month}-${map.day}`;
    const formattedTime = `${map.hour}:${map.minute}:${map.second}`;

    return `The current local time in ${config.city} is ${formattedDate} ${formattedTime} (${config.timeZone}).`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function getMyPosition() {
  console.log("---- GET MY POSITION ----");

  if (me.x < 0 || me.y < 0) {
    return "Error: agent position is not available yet.";
  }

  return JSON.stringify({
    id: me.id,
    name: me.name,
    x: me.x,
    y: me.y,
    score: me.score,
  });
}


async function LLMaddMission(type, params, reward = 0) {
  console.log("---- ADD MISSION ----");

  let mission;

  try {
    // Case 1: hele input er faktisk JSON-string
    if (typeof type === "string" && type.trim().startsWith("{")) {
      mission = JSON.parse(type);
    } 
    // Case 2: normal struktur
    else {
      mission = {
        type, 
        params:typeof params === "string"? JSON.parse(params): params, 
        reward, 
      };
    }
  } catch (e) {return `Error parsing mission: ${e.message}`;}

  addMission(mission.type, mission.params, mission.reward);

  missionAdded.emit("newMission");
  commandExecuted = true;
  return "Mission added";
}

async function avoidTile(actionInput) {
  let params;

  try {
    params = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing avoid_tile input: ${error.message}`;
  }

  const { x, y } = params;

  if (typeof x !== "number" || typeof y !== "number") {
    return "Error: x and y must be numbers.";
  }

  addConstraint('avoid_tile', { x, y });

  commandExecuted = true;

  return `Tile (${x}, ${y}) marked as avoided.`;
}

//types: 'number', 
async function answereInChat(actionInput) {
  let parsed;
  try {
    parsed = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing answere_in_chat input: ${error.message}`;
  }
  if (!currentSenderId) {
    return "Error: no chat sender to reply to.";
  }
  sendMessageToSocket(currentSenderId, String(parsed.message));
  chatReplySent = true;
  return 'Message sent to chat';
}

async function noPickupAt(actionInput) {
  let params;

  try {
    params = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing no_pickup_at input: ${error.message}`;
  }

  const { x, y } = params;

  if (typeof x !== "number" || typeof y !== "number") {
    return "Error: x and y must be numbers.";
  }

  addConstraint('no_pickup_at', { x, y });

  commandExecuted = true;

  return `The agent will no longer pick up parcels at (${x}, ${y}).`;
}

async function noDeliverAt(actionInput) {
  let params;

  try {
    params = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing no_deliver_at input: ${error.message}`;
  }

  const { x, y } = params;

  if (typeof x !== "number" || typeof y !== "number") {
    return "Error: x and y must be numbers.";
  }

  addConstraint('no_deliver_at', { x, y });

  commandExecuted = true;

  return `The agent will no longer deliver at (${x}, ${y}).`;
}

async function deliverAt(actionInput) {
  let params;

  try {
    params = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing deliver_at input: ${error.message}`;
  }

  const { location } = params;

  if (location !== "leftmost" && location !== "rightmost") {
    return "Error: location must be 'leftmost' or 'rightmost'.";
  }

  if (deliveryTiles.length === 0) {
    return "Error: delivery tiles are not known yet.";
  }

  const tile = location === "leftmost"
    ? deliveryTiles.reduce((a, b) => (b.x < a.x ? b : a))
    : deliveryTiles.reduce((a, b) => (b.x > a.x ? b : a));

  addConstraint('prefer_deliver_at', { x: tile.x, y: tile.y });

  commandExecuted = true;

  return `Deliveries will now prefer the ${location} delivery tile, at (${tile.x}, ${tile.y}).`;
}

async function setMaxCarryTool(actionInput) {
  let params;
  try {
    params = typeof actionInput === "string" ? JSON.parse(actionInput) : actionInput;
  } catch (error) {
    return `Error parsing set_max_carry input: ${error.message}`;
  }

  const { count } = params;

  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) {
    return "Error: count must be a positive integer.";
  }

  setMaxCarry(count);
  commandExecuted = true;
  return `The agent will now carry at most ${count} parcel(s) before delivering.`;
}

//tool-name, java function
const TOOLS = {
  calculate,
  get_current_time: getCurrentTime,
  get_my_position: getMyPosition,
  LLM_add_mission: LLMaddMission,
  avoid_tile: avoidTile,
  no_pickup_at: noPickupAt,
  no_deliver_at: noDeliverAt,
  deliver_at: deliverAt,
  answere_in_chat: answereInChat,
  set_max_carry: setMaxCarryTool,
};

// ==========================================
// 4. Reusable LLM call
// ==========================================

async function callModel(messages, { temperature = 0 } = {}) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature,
  });

  return response.choices?.[0]?.message?.content ?? "";
}

// ==========================================
// 5. Output parsing
// ==========================================

function extractAction(text) {
  const actionMatch = text.match(/^Action:\s*(.+)$/im);

  if (!actionMatch) {
    return null;
  }

  // A missing "Action Input:" line is tolerated (defaults to empty) rather
  // than failing the whole parse — this matters for zero-argument tools
  // like get_my_position, where the model sometimes omits the line entirely.
  const actionInputMatch = text.match(/^Action Input:\s*(.+)$/im);

  return {
    action: actionMatch[1].trim(),
    actionInput: actionInputMatch ? actionInputMatch[1].trim() : "",
  };
}

function extractFinalAnswer(text) {
  const match = text.match(/^Final Answer:\s*([\s\S]*)$/im);

  if (!match) {
    return null;
  }

  return match[1].trim();
}

function hasBothActionAndFinalAnswer(text) {
  return /^Action:\s*.+$/im.test(text) && /^Final Answer:\s*[\s\S]*$/im.test(text);
}

function countActions(text) {
  const matches = text.match(/^Action:\s*.+$/gim);
  return matches ? matches.length : 0;
}

// ==========================================
// 6. Prompt
// ==========================================


const AGENT_PROMPT = `
You are an AI agent connected to a DeliverooJS environment. You solve the user's chat requests step by step, using tools to gather information or take actions — never inventing a result yourself.

===========================================================
TOOLS
===========================================================
- calculate(expression): evaluates a mathematical expression.
- get_current_time(location): returns the current local time for Rome/Roma.
- get_my_position(): returns the agent's current x, y coordinates and score. Action Input: none.
- LLM_add_mission(type, params, reward): adds a new "go_to_mission" errand (move the agent to a specified location) to the BDI agent's task list.
- avoid_tile(x, y): marks a tile the agent must never navigate to or through.
- no_pickup_at(x, y): marks a tile where the agent must never pick up a parcel (it may still pass through or deliver there).
- no_deliver_at(x, y): marks a tile where the agent must never deliver (it may still pass through or pick up there).
- deliver_at(location): sets a preferred delivery tile by relative position — location is "leftmost" or "rightmost".
- answere_in_chat(type, message): sends a reply directly to the user who triggered the request, instead of (or in addition to) a Final Answer.
- set_max_carry(count): sets the maximum number of parcels the agent will pick up before it must go deliver.

===========================================================
OUTPUT FORMAT — choose exactly one per message
===========================================================
FORMAT 1 — use one tool:

Thought: <brief reasoning>
Action: <tool name>
Action Input: <tool input>

FORMAT 2 — final answer:

Thought: I have enough information to answer.
Final Answer: <clear final answer for the user>

Formatting rules:
- Exactly one Action or one Final Answer per message — never both, never two Actions.
- Never write "Action: None".
- Never describe an action as completed (e.g. "X is now marked/added/done") unless you have already called the matching tool and received its Observation. If you intend to call a tool, output the Action — do not pre-empt its result.
- Only give a Final Answer once every part of the request has been resolved by an actual Observation.
- After each Observation, check whether the original request still has unresolved parts before deciding your next move.
- If the user asks for multiple things, resolve them one at a time.
- Use only the tools listed above.

===========================================================
GROUNDING RULES — never invent information
===========================================================
- Do not calculate arithmetic yourself — call calculate.
- Do not invent the current time — call get_current_time.
- Do not invent the agent's position — call get_my_position.
- Do not invent movement results or any other tool's result.

===========================================================
WHEN TO USE EACH TOOL
===========================================================
- Arithmetic requested → call calculate, then call answere_in_chat with the result.
- Current time in Rome/Roma requested → call get_current_time.
- Agent's position requested → call get_my_position. If the user asked for the position after moving, call it again once the movement is done.
- Movement requested ("go to X,Y") → call LLM_add_mission with type 'go_to_mission'.
- Avoidance requested ("do not go to X,Y", "avoid tile X,Y", or "going to X,Y gives/costs -500 points") → call avoid_tile, not LLM_add_mission. A stated penalty for a location is a request to avoid it, not a mission with a negative reward.
- "do not pick up at X,Y" / "do not take parcels from X,Y" → call no_pickup_at. This is narrower than avoid_tile: the agent may still travel through or deliver at that tile, it just won't pick parcels up there.
- "do not give/deliver/drop a parcel at X,Y" → call no_deliver_at. This is narrower than avoid_tile: the agent may still travel through or pick up at that tile, it just won't deliver there.
- "drop/deliver a parcel at the leftmost/rightmost tile" → call deliver_at with that relative location.
- Sending a reply to the game chat → call answere_in_chat.
- "deliver exactly/only/at most N parcels at a time", "carry at most N parcels" → call set_max_carry with that count.

===========================================================
LLM_add_mission
===========================================================
- The only supported type is 'go_to_mission'.
- params must be a JSON object: { "x": 3, "y": 5 }. Do NOT stringify it, and do NOT pass x/y as strings.
- reward must be a positive integer:
  - Use the reward/points number the user mentioned, if any.
  - Otherwise default to 2000.
- If the user's request implies a negative reward, refuse it: do not call LLM_add_mission, and instead give a Final Answer saying "I cannot accept this task because it has a negative reward. Do not call add_mission with negative rewards."
- Action Input MUST be valid JSON, e.g.: {"type":"go_to_mission","params":{"x":1,"y":5},"reward":2000}

===========================================================
avoid_tile / no_pickup_at / no_deliver_at
===========================================================
- Action Input MUST be valid JSON: {"x":5,"y":5}
- These are commands, not questions: first call the tool as an Action and wait for its Observation. Only give the Final Answer confirming what changed in a later turn, after you have seen that Observation. Never state a tile has been marked/restricted before you have actually called the tool and received its result.

===========================================================
deliver_at
===========================================================
- Action Input MUST be valid JSON: {"location":"leftmost"} or {"location":"rightmost"}
- location must be exactly "leftmost" or "rightmost" — no other values.
- This is a command, not a question: call it as an Action, wait for its Observation, and only then give a Final Answer confirming the preferred delivery tile.

===========================================================
set_max_carry
===========================================================
- Action Input MUST be valid JSON: {"count":3}
- count must be a positive integer.
- This is a command, not a question: call it as an Action, wait for its Observation, and only then give a Final Answer confirming the new limit.

===========================================================
answere_in_chat
===========================================================
- Action Input MUST be valid JSON: {"type":"number","message":"42"}
- The only supported type is 'number'.
- message must be the number only, as a string, with no extra words, e.g. "42".
- Every time calculate is called, follow it with a call to answere_in_chat carrying the result.
`.trim();

// ==========================================
// 7. Conversation memory
// ==========================================

// Global memory stores only the visible conversation.
// It does not store internal actions and observations.
const messages = [
  {
    role: "system",
    content: AGENT_PROMPT,
  },
];

// Id of the agent whose chat message is currently being handled, so that
// answere_in_chat knows who to reply to. Safe as module state because the
// event queue processes chat messages one at a time (see eventQueue.js).
let currentSenderId = null;
// Whether answere_in_chat already sent a reply during the current turn, so
// the Final Answer isn't also echoed to chat as a duplicate message.
let chatReplySent = false;
// Whether a command tool (e.g. adding a mission) ran during the current
// turn. Commands like "go to 5,6" or "don't go to 6,8" are instructions,
// not questions, so their Final Answer should not be echoed to chat.
let commandExecuted = false;

// ==========================================
// 8. Agent loop for one user request
// ==========================================

async function runAgentTurn(userInput, senderId, maxIterations = 12) {
  currentSenderId = senderId;
  chatReplySent = false;
  commandExecuted = false;
  const turnMessages = [
    {
      role: "system",
      content: AGENT_PROMPT,
    },
    ...messages.slice(1),
    {
      role: "user",
      content: userInput,
    },
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(`--- Agent iteration ${i + 1} ---`);

    const assistantMessage = await callModel(turnMessages, { temperature: 0 });

    console.log(`Assistant output:\n${assistantMessage}\n`);

    turnMessages.push({
      role: "assistant",
      content: assistantMessage,
    });

    const actionCount = countActions(assistantMessage);
    const mixedOutput = hasBothActionAndFinalAnswer(assistantMessage);

    if (actionCount > 1) {
      console.log(
        `[Warning: model output contained ${actionCount} actions. ` +
          `The runtime will execute only the first one.]\n`
      );
    }

    if (mixedOutput) {
      console.log(
        "[Warning: model output contained both Action and Final Answer. " +
          "The runtime will execute the Action and ignore the premature Final Answer.]\n"
      );
    }

    // Defensive rule:
    // If an Action is present, execute it before accepting any Final Answer.
    const parsedAction = extractAction(assistantMessage);

    if (parsedAction) {
      const { action, actionInput } = parsedAction;

      let observation;

      if (TOOLS[action]) {
        console.log(`[System executing tool: ${action}("${actionInput}")]`);
        observation = await TOOLS[action](actionInput);
      } else {
        observation =
          `Error: unknown tool '${action}'. ` +
          `Available tools: ${Object.keys(TOOLS).join(", ")}`;
      }

      console.log(`[Observation: ${observation}]\n`);

      turnMessages.push({
        role: "user",
        content:
          `Observation: ${observation}\n\n` +
          `Continue solving the original user request. ` +
          `If some requested information is still missing, choose the next Action. ` +
          `If all requested information has been observed, give the Final Answer. ` +
          `Remember: output only one Action or one Final Answer.`,
      });

      continue;
    }

    const finalAnswer = extractFinalAnswer(assistantMessage);

    if (finalAnswer) {
      console.log(`Assistant: ${finalAnswer}\n`);
      if (!chatReplySent && !commandExecuted && currentSenderId) {
        sendMessageToSocket(currentSenderId, finalAnswer);
      }

      messages.push({
        role: "user",
        content: userInput,
      });

      messages.push({
        role: "assistant",
        content: finalAnswer,
      });

      return finalAnswer;
    }

    const observation =
      "Error: invalid format. You must output either one Action or one Final Answer.";

    console.log(`[Observation: ${observation}]\n`);

    turnMessages.push({
      role: "user",
      content: `Observation: ${observation}`,
    });
  }

  const fallbackAnswer =
    "I could not complete the request within the maximum number of iterations.";

  console.log(`Assistant: ${fallbackAnswer}\n`);
  if (!chatReplySent && !commandExecuted && currentSenderId) {
    sendMessageToSocket(currentSenderId, fallbackAnswer);
  }

  messages.push({
    role: "user",
    content: userInput,
  });

  messages.push({
    role: "assistant",
    content: fallbackAnswer,
  });

  return fallbackAnswer;
}

// ==========================================
// 9. Agent wrapper / DeliverooJS chat listener
// ==========================================

export function createLLMAgent() {
  console.log("Creating LLM agent...");

  return {
    run: runAgentTurn // renaming
  };
  
}