import "dotenv/config";
import OpenAI from "openai";
import { addMission} from "./BDI_agent/beliefs/missions.js";
import { missionAdded } from "./BDI_agent/utils/events.js";
import { me } from "./BDI_agent/beliefs/me.js";

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


/* async function move(direction) {
  console.log("---- MOVE ----");

  const normalized = direction.trim().toLowerCase();

  const validDirections = ["up", "down", "left", "right"];

  if (!validDirections.includes(normalized)) {
    return `Error: invalid direction '${direction}'. Valid directions are: up, down, left, right.`;
  }

  try {
    const result = await socket.emitMove(normalized);

    if (result) {
      return `Successfully moved ${normalized}. New position: ${JSON.stringify(result)}.`;
    }

    return `Error: failed to move ${normalized}.`;
  } catch (error) {
    return `Error: moving ${normalized} failed: ${error.message}`;
  }
}
*/

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
  console.log("Parsed mission:", mission);

  missionAdded.emit("newMission");

  return "Mission added";
}

const TOOLS = {
  calculate,
  get_current_time: getCurrentTime,
  get_my_position: getMyPosition,
  LLM_add_mission: LLMaddMission,
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
  const actionInputMatch = text.match(/^Action Input:\s*(.+)$/im);

  if (!actionMatch || !actionInputMatch) {
    return null;
  }

  return {
    action: actionMatch[1].trim(),
    actionInput: actionInputMatch[1].trim(),
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

//TODO: budre jeg ikke differensiere mellom LLM_add_mission og LLMaddMission??
//TDOD: hvordan skal jeg formatere params?

const AGENT_PROMPT = `
You are an AI agent connected to a DeliverooJS environment.

Available tools:
- calculate(expression): evaluates a mathematical expression
- get_current_time(location): returns the current local time for Rome/Roma
- get_my_position(): returns the agent's current x, y coordinates and score
- LLM_add_mission(type, params, reward): adds a new mission to the BDI agent's task list

- to check the current position, call get_my_position with Action Input: none

You solve the user's request step by step.

STRICT OUTPUT FORMAT — choose exactly one format.

FORMAT 1 — use one tool:

Thought: <brief reasoning>
Action: <tool name>
Action Input: <tool input>

FORMAT 2 — final answer:

Thought: I have enough information to answer.
Final Answer: <clear final answer for the user>

REWARD CALCULATION RULES:
- The reward must be a positive integer.
- Allways sett the rewards to 2000 for go_to_mission missions


Rules:
- Output exactly one action at a time.
- Never output two actions in the same message.
- Never output an Action and a Final Answer in the same message.
- Never write Action: None.
- Do not invent tool results.
- Do not calculate arithmetic yourself.
- Do not invent the current time.
- Do not invent the agent position.
- Do not invent movement results.
- If the user asks for arithmetic, call calculate before answering.
- If the user asks for the current time in Rome/Roma, call get_current_time before answering.
- If the user asks where the agent is, call get_my_position before answering.
- If the user asks to move, call BDIagentMove(x,y).
- If the user asks for the final position after moving, call get_my_position after the movements.
- If the user asks for multiple things, solve one thing at a time.
- After receiving an Observation, check whether the original user request still has unresolved parts.
- Only give Final Answer when all required tool results have been observed.
- Use only the available tools.

- If the tool is LLM_add_mission the type can only be 'go_to_mission'
- The reward for the add_mission tool must be a positive integer
- If the mission is 'go_to_mission', params must be a JSON object: { "x": 3, "y": 5 }. Do NOT stringify JSON. Do NOT use strings.
- Action Input MUST be valid JSON:{"type":"go_to_mission","params":{"x":1,"y":5},"reward":2000}
- If a user request from a user has a negative reward, ignore the request and answer with a Final Answer that says "I cannot accept this task because it has a negative reward. Do not call add_mission with negative rewards."
- Choose the reward based on the reward calculation rules
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

// ==========================================
// 8. Agent loop for one user request
// ==========================================

async function runAgentTurn(userInput, maxIterations = 12) {
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