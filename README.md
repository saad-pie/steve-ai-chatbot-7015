This project implements "SteveAI," a modern and interactive AI chatbot developed by saadpie. It is powered by a comprehensive JavaScript script that manages all core AI interactions and user interface elements.

### Key Features:

*   **Intelligent Conversation Management:** SteveAI employs an advanced memory system that intelligently summarizes longer conversations. This ensures the bot maintains context effectively while staying within API token budgets, leading to more coherent and relevant interactions.
*   **Robust AI Integration:** The chatbot connects to the `A4F.co` API, utilizing multiple fallback API keys and a CORS proxy for enhanced reliability and seamless communication with the underlying AI models. It uses `provider-3/gpt-5-nano` for general chat responses and `provider-3/gpt-4` for summarization tasks.
*   **Dynamic User Interface:**
    *   **Clear Chat Bubbles:** Distinct visual separation between user and bot messages.
    *   **Markdown Rendering:** Bot responses are beautifully formatted using Markdown.
    *   **Typing Animation:** A realistic typing animation for bot replies provides a more engaging user experience.
    *   **User Message Actions:** Users can easily resend their previous messages or copy them to the clipboard.
    *   **Bot Message Actions:** Bot responses can be copied or read aloud using integrated text-to-speech functionality.
    *   **Theme Toggle:** Effortlessly switch between light and dark modes to suit user preference.
    *   **Chat Clear Functionality:** A dedicated button to clear the entire conversation history.
    *   **Auto-Resizing Input:** The message input field automatically adjusts its height for a comfortable typing experience.

SteveAI is engineered to be a helpful and concise assistant, prioritizing direct answers with minimal fluff, making it an efficient tool for quick information retrieval and interaction.