<script setup>
import { ref } from "vue";
import WebLlmChatEngine from "./lib/WebLlmChatEngine";

const status = ref("");
const progressText = ref("");
const isEngineReady = ref(false);

function handleAssistantContent(assistantContent) {
  // TODO: do something with the assistant's response
}

function handleEngineStateChange({ status: nextStatus, progressText: nextProgressText, isReady }) {
  status.value = nextStatus;
  progressText.value = nextProgressText;
  isEngineReady.value = isReady;
}

const llmEngine = new WebLlmChatEngine(
  "SmolLM2-360M-Instruct-q4f16_1-MLC",
  handleAssistantContent,
  handleEngineStateChange
);
llmEngine.init();

async function sendMessage() {
  const messages = [
    {
      role: "system",
      content: "Your responses should be short and concise."
    },
    {
      role: "user",
      content: "" // TODO: content of message to send to the LLM
    },
  ];
  await llmEngine.sendMessage(messages);
}
</script>

<template>
  <div>
    <p>Status: {{ status }}</p>
  </div>
</template>
