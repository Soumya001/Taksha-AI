module.exports = {
  apps: [
    {
      name:        "taksha-xyz",
      script:      "serve.js",
      interpreter: "node",
      env: {
        NODE_ENV:      "production",
        PORT:          "5500",
        OLLAMA_HOST:   "http://localhost:11434",
        OLLAMA_MODEL:  "qwen2.5:14b",
      },
    },
    {
      name:        "taksha-daemon",
      script:      "thought_daemon.js",
      interpreter: "node",
      env: {
        NODE_ENV:      "production",
        PORT:          "5500",
        OLLAMA_HOST:   "http://localhost:11434",
        OLLAMA_MODEL:  "qwen2.5:14b",
      },
      // Restart if daemon crashes, but don't restart endlessly
      max_restarts: 5,
      restart_delay: 30000,
    },
  ],
};
