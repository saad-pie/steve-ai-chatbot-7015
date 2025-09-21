import { GoogleGenAI, Type } from "https://esm.run/@google/genai";

const GITHUB_API_URL = "https://api.github.com";
const REPO_OWNER = "saad-pie";
const REPO_NAME = "steve-ai-chatbot-7015";

// DOM elements
const githubTokenInput = document.getElementById('githubToken');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const previewFrame = document.getElementById('preview-frame');

let ai;
let isWorking = false;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      description: "An array of files to update or create. For updates, include the full new content. For creations, provide the new filename and content. Only include files that have changed or are new.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The filename, e.g., index.html or about.html" },
          content: { type: Type.STRING, description: "The complete new code content for the file." },
        },
        required: ["name", "content"],
      },
    },
  },
  required: ["files"],
};

function encodeUnicodeToBase64(str) {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );
}

function updateWorkingState(working) {
    isWorking = working;
    sendBtn.disabled = isWorking;
    chatInput.disabled = isWorking;
    chatInput.placeholder = isWorking ? "AI is working..." : "e.g., Change the background to dark blue";
}

// Load keys from localStorage
githubTokenInput.value = localStorage.getItem('githubToken') || '';
geminiApiKeyInput.value = localStorage.getItem('geminiApiKey') || '';

// Save keys to localStorage on change
githubTokenInput.addEventListener('input', () => localStorage.setItem('githubToken', githubTokenInput.value));
geminiApiKeyInput.addEventListener('input', () => {
    localStorage.setItem('geminiApiKey', geminiApiKeyInput.value);
    try {
        if (geminiApiKeyInput.value) {
            ai = new GoogleGenAI({ apiKey: geminiApiKeyInput.value });
        }
    } catch (e) {
        console.error("Failed to initialize Gemini AI:", e);
        addMessage('system', 'Error: Invalid Gemini API Key format.');
        ai = null;
    }
});

try {
    if (geminiApiKeyInput.value) {
        ai = new GoogleGenAI({ apiKey: geminiApiKeyInput.value });
    }
} catch (e) {
    console.error("Failed to initialize Gemini AI from stored key:", e);
    ai = null;
}


// Chat logic
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isWorking) handleSend();
});

async function handleSend() {
    const prompt = chatInput.value.trim();
    if (!prompt || isWorking) return;

    const githubToken = githubTokenInput.value;
    const geminiApiKey = geminiApiKeyInput.value;

    if (!githubToken || !geminiApiKey) {
        addMessage('system', 'Error: Please provide both GitHub Token and Gemini API Key.');
        return;
    }
    if (!ai) {
        addMessage('system', 'Error: Gemini AI not initialized. Check your API Key.');
        return;
    }

    addMessage('user', prompt);
    chatInput.value = '';
    updateWorkingState(true);
    
    try {
        addMessage('system', 'Fetching current website files from GitHub...');
        const files = await getRepoFiles();
        
        const filesContentString = files.map(f => `
--- File: ${f.name} ---
${f.content}
`).join('\n\n');

        const fullPrompt = `
You are an expert web developer. The user wants to modify their website.
Based on the user's request, update the provided website files or create new ones.
If you create a new HTML file, you MUST also update an existing file (like index.html) to link to it.
You MUST return ONLY the updated and newly created files in a JSON object with a 'files' property. Each file object must have 'name' and 'content' properties. Do not return files that are not changed.

Current files:
${filesContentString}

User Request: "${prompt}"
`;

        addMessage('system', 'Thinking... this may take a moment.');
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        if (!result.files || !Array.isArray(result.files) || result.files.length === 0) {
            addMessage('system', 'AI did not suggest any changes.');
            updateWorkingState(false);
            return;
        }

        addMessage('system', `AI generated updates for ${result.files.length} file(s). Pushing to GitHub...`);
        
        for (const file of result.files) {
            const originalFile = files.find(f => f.name === file.name);
            if (originalFile) {
                // Update existing file
                await uploadRepoFile(file.name, file.content, originalFile.sha);
                addMessage('system', `Updated ${file.name}`);
            } else {
                // Create new file
                await uploadRepoFile(file.name, file.content);
                addMessage('system', `Created new file: ${file.name}`);
            }
        }

        addMessage('system', 'Updates pushed successfully! Refreshing preview...');
        previewFrame.src = './index.html?t=' + new Date().getTime(); // bust cache

    } catch (error) {
        console.error(error);
        addMessage('system', `Error: ${error.message}`);
    } finally {
        updateWorkingState(false);
    }
}

function addMessage(sender, text) {
    const messageEl = document.createElement('div');
    messageEl.className = `p-3 rounded-lg max-w-full ${sender === 'user' ? 'bg-blue-600 self-end' : 'bg-gray-700 self-start'}`;
    messageEl.textContent = text;
    chatHistory.appendChild(messageEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// GitHub API functions
async function githubApiRequest(endpoint, options = {}) {
    const token = githubTokenInput.value;
    const response = await fetch(`${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers,
        }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`GitHub API Error (${response.status}): ${err.message}`);
    }
    return response.json();
}

async function getRepoFiles() {
    const contents = await githubApiRequest('contents/');
    // Fetch all relevant web files, not just the initial set.
    const filesToFetch = contents.filter(f => f.type === 'file' && (f.name.endsWith('.html') || f.name.endsWith('.css') || f.name.endsWith('.js')));

    const files = [];
    for (const file of filesToFetch) {
        // Use API to get content to avoid CORS issues with download_url in some environments
        const fileData = await githubApiRequest(`contents/${file.path}`);
        // content is base64 encoded
        const content = decodeURIComponent(escape(atob(fileData.content)));
        files.push({ name: file.name, content, sha: file.sha });
    }
    return files;
}

async function uploadRepoFile(path, content, sha = null) {
    const body = {
        message: `feat: ${sha ? 'update' : 'create'} ${path} via AI dev assistant`,
        content: encodeUnicodeToBase64(content),
        branch: 'main'
    };
    if (sha) {
        body.sha = sha;
    }
    
    return githubApiRequest(`contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

// Initial message
addMessage('system', 'Welcome! Enter your API keys, then describe the changes you want to make to your website.');
