import { CreateMLCEngine } from "@mlc-ai/web-llm";

export default class WebLlmChatEngine {
  constructor(modelId, onRespond, onStatus, onError = null) {
    this.modelId = modelId;
    this.respondHandler = onRespond;
    this.statusHandler = onStatus;
    this.errorHandler = onError;

    this.engine = null;
    this.isSending = false;
    this.isReady = false;
    this.status = "Idle";
    this.progressText = "";
  }

  notifyStatusChange() {
    this.statusHandler?.({
      status: this.status,
      progressText: this.progressText,
      isReady: this.isReady,
    });
  }

  setProgress(progressText) {
    this.progressText = progressText;
    this.notifyStatusChange();
  }

  async init() {
    if (this.engine) return;

    try {
      this.status = "Initializing engine...";
      this.isReady = false;
      this.notifyStatusChange();

      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: (report) => {
          this.setProgress(report.text ?? "Loading model...");
        },
      });

      this.status = "Ready";
      this.isReady = true;
      this.notifyStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.status = "Error";
      this.progressText = message;
      this.isReady = false;
      this.notifyStatusChange();
      this.errorHandler?.(error);
      throw error;
    }
  }

  async sendMessage(messages) {
    if (!this.engine) {
      await this.init();
    }

    if (!this.engine || this.isSending) return;

    if (!Array.isArray(messages) || messages.length === 0) return;

    this.isSending = true;
    this.status = "Generating response...";
    this.isReady = false;
    this.notifyStatusChange();

    try {
      const reply = await this.engine.chat.completions.create({
        messages,
      });

      const assistantContent = reply.choices?.[0]?.message?.content ?? "(No response text)";
      this.respondHandler?.(assistantContent);
      this.status = "Ready";
      this.isReady = true;
      this.notifyStatusChange();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.respondHandler?.(`Error: ${message}`);
      this.status = "Error";
      this.progressText = message;
      this.isReady = false;
      this.notifyStatusChange();
      this.errorHandler?.(error);
    } finally {
      this.isSending = false;
      this.notifyStatusChange();
    }
  }
}
