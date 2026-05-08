let callJobProcessor = null;

export function setCallJobProcessor(processor) {
  callJobProcessor = processor;
}

export async function addCallJob(jobData) {
  if (!callJobProcessor) {
    throw new Error('CallJobProcessor not initialized');
  }

  return callJobProcessor.addJob(jobData);
}

export async function getCallQueueStats() {
  if (!callJobProcessor) return null;
  return callJobProcessor.getQueueStats();
}

export default {
  setCallJobProcessor,
  addCallJob,
  getCallQueueStats,
};
